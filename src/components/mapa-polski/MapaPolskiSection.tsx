import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppDatabase } from '@/types/domain';
import PromptModal from '@/components/common/PromptModal';
import {
  createCooperative,
  getCooperativeById,
  listMapPoints,
  mapStatusToApi,
  updateCooperative,
} from '@/services/cooperatives';
import type { Cooperative } from '@/types/domain';
import { toApiRegion } from '@/utils/regions';

interface MapaPolskiSectionProps {
  db: AppDatabase;
  onSetVoivodeshipLead: (voivodeshipId: string, caregiverId: number | null) => void;
  onSetVoivodeshipAssignments: (
    voivodeshipId: string,
    cooperativeIds: number[],
    areaIds: number[],
  ) => void;
}

interface VoivodeshipPoint {
  id: string;
  label: string;
  center: [number, number];
  isCustom?: boolean;
}

interface CustomMapPoint {
  id: number;
  name: string;
  voivodeshipId: string;
  valueGwh: number;
  center: [number, number];
  cooperativeId?: number;
}

interface PendingPointPayload {
  id: number;
  center: [number, number];
  voivodeshipId: string;
  voivodeshipLabel: string;
}

interface PendingCoopData {
  name: string;
  address: string;
  voivodeship: string;
  plannedPower: string;
  installedPower: string;
  registrationDate: string;
  caregiverId: string;
  boardName: string;
  boardEmail: string;
  boardPhone: string;
  selectedAreaIds: number[];
  members: Array<{ id: number; userId: number; fullName: string; status: 'aktywny' | 'nieaktywny' }>;
}

const VOIVODESHIPS: VoivodeshipPoint[] = [
  { id: 'mazowieckie', label: 'Mazowieckie', center: [52.25, 21.0] },
  { id: 'malopolskie', label: 'Małopolskie', center: [49.85, 19.95] },
  { id: 'slaskie', label: 'Śląskie', center: [50.3, 19.0] },
  { id: 'wielkopolskie', label: 'Wielkopolskie', center: [52.4, 17.0] },
  { id: 'dolnoslaskie', label: 'Dolnośląskie', center: [51.1, 16.2] },
  { id: 'pomorskie', label: 'Pomorskie', center: [54.35, 18.65] },
  { id: 'zachodniopomorskie', label: 'Zachodniopomorskie', center: [53.45, 14.55] },
  { id: 'kujawsko-pomorskie', label: 'Kujawsko-Pomorskie', center: [53.0, 18.6] },
  { id: 'lubelskie', label: 'Lubelskie', center: [51.25, 22.55] },
  { id: 'lubuskie', label: 'Lubuskie', center: [52.25, 15.25] },
  { id: 'lodzkie', label: 'Łódzkie', center: [51.8, 19.45] },
  { id: 'opolskie', label: 'Opolskie', center: [50.65, 17.95] },
  { id: 'podkarpackie', label: 'Podkarpackie', center: [50.05, 22.0] },
  { id: 'podlaskie', label: 'Podlaskie', center: [53.15, 23.15] },
  { id: 'swietokrzyskie', label: 'Świętokrzyskie', center: [50.8, 20.7] },
  { id: 'warminsko-mazurskie', label: 'Warmińsko-Mazurskie', center: [53.8, 20.5] },
];

function normalizeVoivodeship(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/\s+/g, '-');
}

function getNearestVoivodeshipId(center: [number, number]): string {
  const [lat, lng] = center;
  let nearest = VOIVODESHIPS[0];
  let minDistance = Number.POSITIVE_INFINITY;

  VOIVODESHIPS.forEach((voivodeship) => {
    const [candidateLat, candidateLng] = voivodeship.center;
    const distance = Math.hypot(lat - candidateLat, lng - candidateLng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = voivodeship;
    }
  });

  return nearest.id;
}

async function getVoivodeshipFromCoords(
  lat: number,
  lng: number,
): Promise<{ id: string; label: string }> {
  const fallback = () => {
    const id = getNearestVoivodeshipId([lat, lng]);
    const label = VOIVODESHIPS.find((v) => v.id === id)?.label ?? 'Polska';
    return { id, label };
  };

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5&accept-language=pl`,
      { headers: { 'User-Agent': 'crm-energy-app/1.0' } },
    );
    if (!res.ok) return fallback();
    const data = await res.json() as { address?: { state?: string } };
    const rawState = data?.address?.state ?? '';
    // Nominatim returns e.g. "województwo mazowieckie" — strip prefix
    const stateName = rawState
      .toLowerCase()
      .replace(/^województwo\s+/, '')
      .replace(/^wojewodztwo\s+/, '')
      .trim();

    if (!stateName) return fallback();

    const found = VOIVODESHIPS.find(
      (v) =>
        normalizeVoivodeship(v.label) === normalizeVoivodeship(stateName) ||
        v.id === normalizeVoivodeship(stateName),
    );
    if (found) return { id: found.id, label: found.label };
  } catch {
    // network error → fallback
  }

  return fallback();
}

export default function MapaPolskiSection({
  db,
  onSetVoivodeshipLead,
  onSetVoivodeshipAssignments,
}: MapaPolskiSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string | null>(null);
  const [leadDraft, setLeadDraft] = useState('');
  const [cooperativeDraft, setCooperativeDraft] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  const [customPoints, setCustomPoints] = useState<CustomMapPoint[]>([]);
  const [customPointError, setCustomPointError] = useState('');
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<PendingPointPayload | null>(null);
  const [pendingPointName, setPendingPointName] = useState('');
  const [linkedCaregiverDraft, setLinkedCaregiverDraft] = useState('');
  const [linkedStatusDraft, setLinkedStatusDraft] = useState<AppDatabase['cooperatives'][number]['status'] | ''>('');
  const [linkedAreaDraft, setLinkedAreaDraft] = useState('');
  const [linkedSaving, setLinkedSaving] = useState(false);
  const [linkedError, setLinkedError] = useState('');
  const [pendingCoopSaving, setPendingCoopSaving] = useState(false);
  const [pendingCoopError, setPendingCoopError] = useState('');
  const [selectedPointCoopData, setSelectedPointCoopData] = useState<Cooperative | null>(null);
  const [selectedPointCoopLoading, setSelectedPointCoopLoading] = useState(false);
  const [selectedPointCoopError, setSelectedPointCoopError] = useState('');
  const linkCoopId = Number(searchParams.get('linkCoop') ?? 0) || null;
  const linkCoop = linkCoopId ? db.cooperatives.find((coop) => coop.id === linkCoopId) ?? null : null;

  // Load map points from API on mount
  const fetchMapPoints = () => {
    void listMapPoints().then((pts) => {
      setCustomPoints(
        pts.map((p) => ({
          id: p.id,
          name: p.name,
          voivodeshipId: p.voivodeshipId,
          valueGwh: 0,
          center: [p.lat, p.lng] as [number, number],
          cooperativeId: p.cooperativeId,
        })),
      );
    }).catch(() => {
      // silent — map is still usable without points
    });
  };

  useEffect(() => {
    fetchMapPoints();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (linkCoopId) setIsAddingPoint(true);
  }, [linkCoopId]);

  const isPendingCoop = searchParams.get('pendingCoop') === '1';

  useEffect(() => {
    if (isPendingCoop) setIsAddingPoint(true);
  }, [isPendingCoop]);
  const allPoints = useMemo<VoivodeshipPoint[]>(
    () =>
      customPoints.map(({ id, name, center }) => ({
        id: String(id),
        label: name,
        center,
        isCustom: true,
      })),
    [customPoints],
  );

  // Fetch coop details when a custom point is selected
  useEffect(() => {
    const point = customPoints.find((p) => String(p.id) === selectedVoivodeship);
    if (!point?.cooperativeId) {
      setSelectedPointCoopData(null);
      setSelectedPointCoopError('');
      return;
    }
    setSelectedPointCoopLoading(true);
    setSelectedPointCoopError('');
    void getCooperativeById(point.cooperativeId)
      .then((coop) => setSelectedPointCoopData(coop))
      .catch(() => setSelectedPointCoopError('Nie udało się pobrać danych spółdzielni.'))
      .finally(() => setSelectedPointCoopLoading(false));
  }, [selectedVoivodeship, customPoints]);

  const grouped = useMemo(() => {
    const coopByVoiv = new Map<string, AppDatabase['cooperatives']>();
    const areasByVoiv = new Map<string, AppDatabase['areas']>();
    const caregiversByVoiv = new Map<string, AppDatabase['caregivers']>();

    allPoints.forEach((v) => {
      const coops = db.cooperatives.filter((c) => normalizeVoivodeship(c.voivodeship) === v.id);
      const areas = db.areas.filter((a) => normalizeVoivodeship(a.voivodeship) === v.id);
      const caregiverIds = new Set(coops.map((c) => c.caregiverId).filter((id): id is number => id !== null));
      const caregivers = db.caregivers.filter((caregiver) => caregiverIds.has(caregiver.id));
      coopByVoiv.set(v.id, coops);
      areasByVoiv.set(v.id, areas);
      caregiversByVoiv.set(v.id, caregivers);
    });

    return { coopByVoiv, areasByVoiv, caregiversByVoiv };
  }, [allPoints, db]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    }).setView([52.1, 19.4], 6.2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    allPoints.forEach((voiv) => {
      const caregiversCount = grouped.caregiversByVoiv.get(voiv.id)?.length ?? 0;
      const cooperativesCount = grouped.coopByVoiv.get(voiv.id)?.length ?? 0;
      const linkedPoint = voiv.isCustom
        ? customPoints.find((point) => String(point.id) === voiv.id) ?? null
        : null;
      const linkedCoop = linkedPoint?.cooperativeId
        ? db.cooperatives.find((coop) => coop.id === linkedPoint.cooperativeId) ?? null
        : null;
      const linkedOpiekun =
        linkedCoop?.supervisor
          ? `${linkedCoop.supervisor.name} ${linkedCoop.supervisor.surname}`.trim()
          : linkedCoop?.caregiverId
            ? (() => {
                const caregiver = db.caregivers.find((item) => item.id === linkedCoop.caregiverId);
                return caregiver ? `${caregiver.name} ${caregiver.surname}`.trim() : null;
              })()
            : null;
      const linkedAreasCount = linkedCoop?.areas?.length ?? 0;
      const leadExists = db.voivodeshipLeads.some(
        (lead) => lead.voivodeshipId === voiv.id && lead.caregiverId !== null,
      );
      const color = caregiversCount > 0 || leadExists ? '#10b981' : '#ef4444';

      const marker = L.circleMarker(voiv.center, {
        radius: 16,
        fillColor: color,
        color: '#ffffff',
        weight: 4,
        opacity: 1,
        fillOpacity: 0.95,
      });

      const tooltipHtml = voiv.isCustom
        ? `<b>${voiv.label}</b><br>Opiekun: ${linkedOpiekun ?? 'Brak'}<br>${linkedAreasCount} terenów`
        : `<b>${voiv.label}</b><br>${caregiversCount} opiekunów<br>${cooperativesCount} spółdzielni`;
      marker.bindTooltip(tooltipHtml, { direction: 'top' });
      marker.on('click', () => setSelectedVoivodeship(voiv.id));
      marker.addTo(markersLayer);
    });

  }, [allPoints, customPoints, db.caregivers, db.cooperatives, db.voivodeshipLeads, grouped]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (!isAddingPoint) return;

      const nextId = Date.now();
      const pointCenter: [number, number] = [event.latlng.lat, event.latlng.lng];

      // Disable further clicks immediately so double-click doesn't add two points
      setIsAddingPoint(false);

      void (async () => {
        const { id: voivId, label: voivLabel } = await getVoivodeshipFromCoords(
          pointCenter[0],
          pointCenter[1],
        );

        // ── Case 1: pending new cooperative creation ──────────────────────
        if (isPendingCoop) {
          const rawPending = localStorage.getItem('pending_coop_v1');
          if (!rawPending) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('pendingCoop');
            setSearchParams(nextParams, { replace: true });
            return;
          }
          const pending = JSON.parse(rawPending) as PendingCoopData;
          const installedPowerNum = Number(pending.installedPower);
          const memberDtos = (pending.members ?? [])
            .filter((m) => m.userId > 0)
            .map((m) => ({ userId: m.userId, status: m.status === 'aktywny' ? 'AKTYWNY' : 'NIEAKTYWNY' }));

          setPendingCoopSaving(true);
          setPendingCoopError('');
          try {
            await createCooperative({
              name: pending.name,
              address: pending.address,
              region: toApiRegion(pending.voivodeship),
              ratedPower: Number(pending.plannedPower) || 0,
              ...(installedPowerNum > 0 ? { installedPower: installedPowerNum } : {}),
              boardName: pending.boardName,
              boardEmail: pending.boardEmail,
              boardPhone: pending.boardPhone,
              supervisorId: Number(pending.caregiverId),
              registrationDate: pending.registrationDate,
              ...(pending.selectedAreaIds?.length > 0 ? { areaIds: pending.selectedAreaIds } : {}),
              ...(memberDtos.length > 0 ? { members: memberDtos } : {}),
              mapPoint: {
                name: pending.name,
                lat: pointCenter[0],
                lng: pointCenter[1],
                voivodeshipId: voivId,
                voivodeshipLabel: voivLabel,
              },
            });

            localStorage.removeItem('pending_coop_v1');
            // Refresh map points from API so the new point appears
            fetchMapPoints();
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('pendingCoop');
            setSearchParams(nextParams, { replace: true });
            navigate('/spoldzielnie');
          } catch {
            setPendingCoopError('Nie udało się utworzyć spółdzielni. Spróbuj ponownie.');
            setIsAddingPoint(true); // re-enable so user can retry
          } finally {
            setPendingCoopSaving(false);
          }
          return;
        }

        // ── Case 2: link existing cooperative to a new map point ─────────
        if (linkCoopId && linkCoop) {
          setCustomPoints((prev) => [
            ...prev,
            {
              id: nextId,
              name: linkCoop.name,
              voivodeshipId: voivId,
              valueGwh: 0,
              center: pointCenter,
              cooperativeId: linkCoopId,
            },
          ]);
          setSelectedVoivodeship(String(nextId));
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('linkCoop');
          setSearchParams(nextParams, { replace: true });
          return;
        }

        // ── Case 3: regular custom point ──────────────────────────────────
        setPendingPoint({
          id: nextId,
          center: pointCenter,
          voivodeshipId: voivId,
          voivodeshipLabel: voivLabel,
        });
        setPendingPointName('');
      })();
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isAddingPoint, isPendingCoop, linkCoop, linkCoopId, navigate, searchParams, setSearchParams]);

  const selectedMeta = allPoints.find((v) => v.id === selectedVoivodeship) ?? null;
  const isCustomSelectedPoint = Boolean(selectedMeta?.isCustom);

  // Data for the linked coop card — comes entirely from API fetch
  const selectedLinkedCoop = selectedPointCoopData;
  const selectedLinkedAreas = selectedLinkedCoop?.areas ?? [];
  const selectedLinkedMembers = selectedLinkedCoop?.members ?? [];
  const linkedAssignedAreaIds = new Set(selectedLinkedAreas.map((area) => area.id));
  const linkedAvailableAreas = db.areas.filter((area) => !linkedAssignedAreaIds.has(area.id));
  const selectedLinkedCaregiver = selectedLinkedCoop?.supervisor ?? null;
  const shouldShowLinkedCard = isCustomSelectedPoint;
  const selectedCaregiversByVoivodeship = selectedVoivodeship
    ? grouped.caregiversByVoiv.get(selectedVoivodeship) ?? []
    : [];
  const selectedCooperatives = selectedVoivodeship
    ? grouped.coopByVoiv.get(selectedVoivodeship) ?? []
    : [];
  const selectedAreas = selectedVoivodeship ? grouped.areasByVoiv.get(selectedVoivodeship) ?? [] : [];
  const selectedLeadId = selectedVoivodeship
    ? db.voivodeshipLeads.find((lead) => lead.voivodeshipId === selectedVoivodeship)?.caregiverId ?? null
    : null;
  const selectedLead = selectedLeadId ? db.caregivers.find((caregiver) => caregiver.id === selectedLeadId) : null;
  const selectedAssignment = selectedVoivodeship
    ? db.voivodeshipAssignments.find((assignment) => assignment.voivodeshipId === selectedVoivodeship) ?? null
    : null;
  const cooperativeOptions = isCustomSelectedPoint ? db.cooperatives : selectedCooperatives;
  const areaOptions = isCustomSelectedPoint ? db.areas : selectedAreas;
  const assignedCooperatives = selectedAssignment
    ? db.cooperatives.filter((coop) => selectedAssignment.cooperativeIds.includes(coop.id))
    : [];
  const assignedAreas = selectedAssignment ? db.areas.filter((area) => selectedAssignment.areaIds.includes(area.id)) : [];
  const selectedCaregivers = isCustomSelectedPoint
    ? db.caregivers.filter((caregiver) => {
        if (selectedLeadId === caregiver.id) return true;
        return assignedCooperatives.some((coop) => coop.caregiverId === caregiver.id);
      })
    : selectedCaregiversByVoivodeship;

  useEffect(() => {
    if (!selectedVoivodeship) {
      setLeadDraft('');
      setCooperativeDraft('');
      setAreaDraft('');
      return;
    }
    setLeadDraft(selectedLeadId ? String(selectedLeadId) : '');
    setCooperativeDraft('');
    setAreaDraft('');
  }, [selectedAssignment, selectedVoivodeship, selectedLeadId]);

  useEffect(() => {
    if (!selectedLinkedCoop) {
      setLinkedCaregiverDraft('');
      setLinkedStatusDraft('');
      setLinkedAreaDraft('');
      setLinkedError('');
      setSelectedPointCoopError('');
      return;
    }
    setLinkedCaregiverDraft(selectedLinkedCoop.supervisorId ? String(selectedLinkedCoop.supervisorId) : '');
    setLinkedStatusDraft(selectedLinkedCoop.status);
    setLinkedAreaDraft('');
    setLinkedError('');
  }, [selectedLinkedCoop?.id, selectedLinkedCoop?.supervisorId, selectedLinkedCoop?.status]);

  const updateAssignments = (nextCoopIds: number[], nextAreaIds: number[]) => {
    if (!selectedVoivodeship) return;
    onSetVoivodeshipAssignments(selectedVoivodeship, nextCoopIds, nextAreaIds);
  };

  const closePendingPointModal = () => {
    setPendingPoint(null);
    setPendingPointName('');
  };

  const confirmPendingPoint = () => {
    if (!pendingPoint) return;
    const pointName = pendingPointName.trim();
    if (!pointName) {
      setCustomPointError('Nie dodano punktu: nazwa nie może być pusta.');
      return;
    }

    setCustomPoints((prev) => [
      ...prev,
      {
        id: pendingPoint.id,
        name: `${pointName} (${pendingPoint.voivodeshipLabel})`,
        voivodeshipId: pendingPoint.voivodeshipId,
        valueGwh: 0,
        center: pendingPoint.center,
      },
    ]);
    setCustomPointError('');
    closePendingPointModal();
  };

  const saveLinkedCoopMeta = () => {
    if (!selectedLinkedCoop) return;
    const nextSupervisorId = Number(linkedCaregiverDraft);
    const patch: { supervisorId?: number; status?: ReturnType<typeof mapStatusToApi> } = {};
    if (Number.isInteger(nextSupervisorId) && nextSupervisorId > 0 && nextSupervisorId !== selectedLinkedCoop.supervisorId) {
      patch.supervisorId = nextSupervisorId;
    }
    if (linkedStatusDraft && linkedStatusDraft !== selectedLinkedCoop.status) {
      patch.status = mapStatusToApi(linkedStatusDraft);
    }
    if (Object.keys(patch).length === 0) return;

    setLinkedSaving(true);
    setLinkedError('');
    void (async () => {
      try {
        const updated = await updateCooperative(selectedLinkedCoop.id, patch);
        setSelectedPointCoopData(updated);
      } catch {
        setLinkedError('Nie udało się zapisać zmian spółdzielni.');
      } finally {
        setLinkedSaving(false);
      }
    })();
  };

  const addLinkedArea = () => {
    if (!selectedLinkedCoop || !linkedAreaDraft) return;
    const nextAreaId = Number(linkedAreaDraft);
    if (!Number.isInteger(nextAreaId) || nextAreaId <= 0) return;

    const currentAreaIds = selectedLinkedAreas.map((area) => area.id);
    if (currentAreaIds.includes(nextAreaId)) return;

    setLinkedSaving(true);
    setLinkedError('');
    void (async () => {
      try {
        const updated = await updateCooperative(selectedLinkedCoop.id, {
          areaIds: [...currentAreaIds, nextAreaId],
        });
        setSelectedPointCoopData(updated);
        setLinkedAreaDraft('');
      } catch {
        setLinkedError('Nie udało się dodać terenu.');
      } finally {
        setLinkedSaving(false);
      }
    })();
  };

  const removeLinkedArea = (areaId: number) => {
    if (!selectedLinkedCoop) return;
    const nextAreaIds = selectedLinkedAreas.map((area) => area.id).filter((id) => id !== areaId);

    setLinkedSaving(true);
    setLinkedError('');
    void (async () => {
      try {
        const updated = await updateCooperative(selectedLinkedCoop.id, {
          areaIds: nextAreaIds,
        });
        setSelectedPointCoopData(updated);
      } catch {
        setLinkedError('Nie udało się usunąć terenu.');
      } finally {
        setLinkedSaving(false);
      }
    })();
  };

  return (
    <>
      <button className="add-entity-btn" onClick={() => navigate('/spoldzielnie?create=1')} type="button">
        <span>+</span>
        <span>Dodaj Spółdzielnie</span>
      </button>
      {isPendingCoop && isAddingPoint ? (
        <div className="map-pending-coop-banner">
          <div>
            <strong>Wybierz lokalizację spółdzielni na mapie</strong>
            {(() => {
              try {
                const raw = localStorage.getItem('pending_coop_v1');
                const d = raw ? JSON.parse(raw) as PendingCoopData : null;
                return d ? <span> — {d.name}</span> : null;
              } catch { return null; }
            })()}
          </div>
          <button
            className="primary-outline-btn"
            type="button"
            onClick={() => {
              localStorage.removeItem('pending_coop_v1');
              setIsAddingPoint(false);
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('pendingCoop');
              setSearchParams(nextParams, { replace: true });
            }}
          >
            Anuluj
          </button>
        </div>
      ) : isAddingPoint ? (
        <p className="map-point-help">
          {linkCoop
            ? `Wybierz punkt na mapie dla spółdzielni: ${linkCoop.name}`
            : 'Kliknij w wybrane miejsce na mapie, aby dodać punkt.'}
        </p>
      ) : null}
      {pendingCoopSaving ? (
        <p className="map-point-help">Trwa tworzenie spółdzielni...</p>
      ) : null}
      {pendingCoopError ? <p className="map-point-error">{pendingCoopError}</p> : null}
      {customPointError ? <p className="map-point-error">{customPointError}</p> : null}
      <PromptModal
        open={pendingPoint !== null}
        title="Nowy punkt na mapie"
        label="Nazwa punktu"
        value={pendingPointName}
        placeholder="np. Warszawa - Centrum"
        confirmLabel="Dodaj punkt"
        cancelLabel="Anuluj"
        onChange={setPendingPointName}
        onConfirm={confirmPendingPoint}
        onCancel={closePendingPointModal}
      />
      <section className="panel">
        <div className="map-head">
          <h3>Interaktywna mapa Polski</h3>
          <div className="map-head-right">
            <div className="map-legend-row">
              <span className="map-status-dot map-status-green" />
              <span>ma opiekuna</span>
            </div>
            <div className="map-legend-row">
              <span className="map-status-dot map-status-red" />
              <span>brak opiekuna</span>
            </div>
            <button className="map-reset" onClick={() => setSelectedVoivodeship(null)} type="button">
              Resetuj filtr
            </button>
          </div>
        </div>
        <div className="leaflet-map" ref={mapContainerRef} />
        {customPoints.length ? (
          <div className="map-custom-points-list">
            <strong>Dodane punkty:</strong>
            {customPoints.map((point) => (
              <div key={point.id}>
                • {point.name} ({point.valueGwh} GWh,{' '}
                {VOIVODESHIPS.find((voiv) => voiv.id === point.voivodeshipId)?.label ?? point.voivodeshipId})
              </div>
            ))}
          </div>
        ) : null}
        {selectedMeta ? (
          <div className="map-details">
            <div className="map-details-top">
              <h4>{selectedMeta.label}</h4>
              <button onClick={() => setSelectedVoivodeship(null)} type="button">
                ×
              </button>
            </div>
            {shouldShowLinkedCard ? (
              <div className="map-linked-coop-card">
                {selectedPointCoopLoading ? (
                  <p className="map-point-help">Ładowanie danych spółdzielni...</p>
                ) : selectedPointCoopError ? (
                  <p className="map-point-error">{selectedPointCoopError}</p>
                ) : null}

                <div className="map-linked-header">
                  <h5>Szczegóły spółdzielni</h5>
                  <span className="map-linked-status">{selectedLinkedCoop?.status || '-'}</span>
                </div>

                <div className="map-linked-meta">
                  <p><strong>Nazwa:</strong> {selectedLinkedCoop?.name || selectedMeta.label}</p>
                  <p><strong>Adres:</strong> {selectedLinkedCoop?.address || '-'}</p>
                  <p><strong>Województwo:</strong> {selectedLinkedCoop?.voivodeship || '-'}</p>
                  <p><strong>Opiekun:</strong> {
                    selectedLinkedCaregiver
                      ? `${selectedLinkedCaregiver.name} ${selectedLinkedCaregiver.surname}`
                      : 'Brak przypisania'
                  }</p>
                  {selectedLinkedCaregiver && (
                    <>
                      <p><strong>E-mail opiekuna:</strong> {selectedLinkedCaregiver.email}</p>
                      <p><strong>Telefon opiekuna:</strong> {selectedLinkedCaregiver.phoneNumber}</p>
                    </>
                  )}
                  <p><strong>Moc znamionowa:</strong> {selectedLinkedCoop?.plannedPower ?? '-'} {selectedLinkedCoop ? 'kW' : ''}</p>
                  <p><strong>Moc zainstalowana:</strong> {selectedLinkedCoop?.installedPower ? `${selectedLinkedCoop.installedPower} kWp` : '—'}</p>
                  <p><strong>Zarząd:</strong> {selectedLinkedCoop?.boardName || '-'}</p>
                  <p><strong>E-mail zarządu:</strong> {selectedLinkedCoop?.boardEmail || '-'}</p>
                  <p><strong>Telefon zarządu:</strong> {selectedLinkedCoop?.boardPhone || '-'}</p>
                  {selectedLinkedCoop?.registrationDate && (
                    <p><strong>Data rejestracji:</strong> {new Date(selectedLinkedCoop.registrationDate).toLocaleDateString('pl-PL')}</p>
                  )}
                  {selectedLinkedCoop?.createdBy && (
                    <p><strong>Utworzył:</strong> {selectedLinkedCoop.createdBy.name} {selectedLinkedCoop.createdBy.surname}</p>
                  )}
                </div>

                <div className="map-linked-controls">
                  <label htmlFor="linked-coop-caregiver">
                    Opiekun
                    <select
                      id="linked-coop-caregiver"
                      className="add-entry-select"
                      value={linkedCaregiverDraft}
                      onChange={(event) => setLinkedCaregiverDraft(event.target.value)}
                      disabled={!selectedLinkedCoop}
                    >
                      <option value="">Brak głównego opiekuna</option>
                      {db.caregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                          {caregiver.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="linked-coop-status">
                    Status
                    <select
                      id="linked-coop-status"
                      className="add-entry-select"
                      value={linkedStatusDraft}
                      onChange={(event) => setLinkedStatusDraft(event.target.value as AppDatabase['cooperatives'][number]['status'])}
                      disabled={!selectedLinkedCoop}
                    >
                      <option value="planowana">Planowana</option>
                      <option value="w trakcie tworzenia">W trakcie tworzenia</option>
                      <option value="aktywna">Aktywna</option>
                      <option value="zawieszona">Zawieszona</option>
                    </select>
                  </label>
                  <button className="primary-btn" type="button" disabled={linkedSaving || !selectedLinkedCoop} onClick={saveLinkedCoopMeta}>
                    {linkedSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </div>

                <div className="map-linked-sections">
                  <section className="map-linked-section">
                    <div className="map-linked-section-head">
                      <strong>Tereny ({selectedLinkedAreas.length})</strong>
                      <div className="map-linked-area-add">
                        <select
                          className="add-entry-select"
                          value={linkedAreaDraft}
                          onChange={(event) => setLinkedAreaDraft(event.target.value)}
                          disabled={!selectedLinkedCoop || linkedAvailableAreas.length === 0}
                        >
                          <option value="">Dodaj teren</option>
                          {linkedAvailableAreas.map((area) => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                          ))}
                        </select>
                        <button className="primary-btn" type="button" disabled={!selectedLinkedCoop || !linkedAreaDraft || linkedSaving} onClick={addLinkedArea}>
                          Dodaj
                        </button>
                      </div>
                    </div>
                    {selectedLinkedAreas.length ? (
                      <ul className="map-linked-list">
                        {selectedLinkedAreas.map((area) => (
                          <li key={area.id}>
                            <span>{area.name}</span>
                            {selectedLinkedCoop ? (
                              <button type="button" className="table-action-btn danger" onClick={() => removeLinkedArea(area.id)}>
                                Usuń
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="map-none">Brak terenów.</p>}
                  </section>

                  <section className="map-linked-section">
                    <strong>Członkowie ({selectedLinkedMembers.length})</strong>
                    {selectedLinkedMembers.length ? (
                      <ul className="map-linked-list">
                        {selectedLinkedMembers.map((member) => (
                          <li key={member.id}>
                            <span>{member.fullName}</span>
                            <em>{member.status}</em>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="map-none">Brak członków.</p>}
                  </section>
                </div>

                {linkedError ? <p className="map-point-error">{linkedError}</p> : null}
              </div>
            ) : (
              <div className="map-details-cols">
                <div>
                  <div className="map-col-title">OPIEKUNOWIE</div>
                  <div>
                    <strong>Główny:</strong> {selectedLead?.name ?? 'Brak przypisania'}
                  </div>
                  <div className="map-head-right" style={{ marginTop: 8, alignItems: 'flex-start' }}>
                    <select
                      className="add-entry-select"
                      value={leadDraft}
                      onChange={(event) => setLeadDraft(event.target.value)}
                    >
                      <option value="">Brak głównego opiekuna</option>
                      {db.caregivers.map((caregiver) => (
                        <option key={caregiver.id} value={caregiver.id}>
                          {caregiver.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        selectedVoivodeship &&
                        onSetVoivodeshipLead(selectedVoivodeship, leadDraft ? Number(leadDraft) : null)
                      }
                      type="button"
                    >
                      Ustaw głównego
                    </button>
                  </div>
                  {selectedCaregivers.length ? (
                    selectedCaregivers.map((caregiver) => <div key={caregiver.id}>• {caregiver.name}</div>)
                  ) : (
                    <span className="map-none-red">Brak opiekunów</span>
                  )}
                </div>
                <div>
                  <div className="map-col-title">SPÓŁDZIELNIE</div>
                  <div className="map-head-right" style={{ marginTop: 8, alignItems: 'flex-start' }}>
                    <select value={cooperativeDraft} onChange={(event) => setCooperativeDraft(event.target.value)}>
                      <option value="">Brak</option>
                      {cooperativeOptions.map((coop) => (
                        <option key={coop.id} value={coop.id}>
                          {coop.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        cooperativeDraft
                          ? updateAssignments(
                              Array.from(new Set([...(selectedAssignment?.cooperativeIds ?? []), Number(cooperativeDraft)])),
                              selectedAssignment?.areaIds ?? [],
                            )
                          : null
                      }
                      type="button"
                    >
                      Dodaj
                    </button>
                  </div>
                  {assignedCooperatives.length ? (
                    assignedCooperatives.map((coop) => (
                      <div key={coop.id}>
                        • {coop.name}{' '}
                        <button
                          type="button"
                          onClick={() =>
                            updateAssignments(
                              (selectedAssignment?.cooperativeIds ?? []).filter((id) => id !== coop.id),
                              selectedAssignment?.areaIds ?? [],
                            )
                          }
                        >
                          Usuń
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="map-none">Brak</span>
                  )}
                </div>
                <div>
                  <div className="map-col-title">TERENY</div>
                  <div className="map-head-right" style={{ marginTop: 8, alignItems: 'flex-start' }}>
                    <select value={areaDraft} onChange={(event) => setAreaDraft(event.target.value)}>
                      <option value="">Brak</option>
                      {areaOptions.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        areaDraft
                          ? updateAssignments(
                              selectedAssignment?.cooperativeIds ?? [],
                              Array.from(new Set([...(selectedAssignment?.areaIds ?? []), Number(areaDraft)])),
                            )
                          : null
                      }
                      type="button"
                    >
                      Dodaj
                    </button>
                  </div>
                  {assignedAreas.length ? (
                    assignedAreas.map((area) => (
                      <div key={area.id}>
                        • {area.name}{' '}
                        <button
                          type="button"
                          onClick={() =>
                            updateAssignments(
                              selectedAssignment?.cooperativeIds ?? [],
                              (selectedAssignment?.areaIds ?? []).filter((id) => id !== area.id),
                            )
                          }
                        >
                          Usuń
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="map-none">Brak</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
