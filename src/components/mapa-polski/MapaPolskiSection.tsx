import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppDatabase } from '@/types/domain';
import PromptModal from '@/components/common/PromptModal';

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

interface FrontendCoopDetails {
  cooperativeId: number;
  board?: { name?: string; email?: string; phone?: string };
  members?: Array<{ id: number; fullName: string; status: string }>;
  areaIds?: number[];
  createdAt?: string;
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

export default function MapaPolskiSection({
  db,
  onSetVoivodeshipLead,
  onSetVoivodeshipAssignments,
}: MapaPolskiSectionProps) {
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
  const linkCoopId = Number(searchParams.get('linkCoop') ?? 0) || null;
  const linkCoop = linkCoopId ? db.cooperatives.find((coop) => coop.id === linkCoopId) ?? null : null;

  const frontendDetailsByCoopId = useMemo(() => {
    try {
      const raw = localStorage.getItem('coop_creation_details_v1');
      if (!raw) return {} as Record<string, FrontendCoopDetails>;
      return JSON.parse(raw) as Record<string, FrontendCoopDetails>;
    } catch {
      return {} as Record<string, FrontendCoopDetails>;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('custom_map_points_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as CustomMapPoint[];
      setCustomPoints(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomPoints([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('custom_map_points_v1', JSON.stringify(customPoints));
  }, [customPoints]);

  useEffect(() => {
    if (linkCoopId) setIsAddingPoint(true);
  }, [linkCoopId]);
  const allPoints = useMemo<VoivodeshipPoint[]>(
    () => [
      ...VOIVODESHIPS,
      ...customPoints.map(({ id, name, center }) => ({
        id: String(id),
        label: name,
        center,
        isCustom: true,
      })),
    ],
    [customPoints],
  );

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

      marker.bindTooltip(
        `<b>${voiv.label}</b><br>${caregiversCount} opiekunów<br>${cooperativesCount} spółdzielni`,
        { direction: 'top' },
      );
      marker.on('click', () => setSelectedVoivodeship(voiv.id));
      marker.addTo(markersLayer);
    });

  }, [allPoints, db.voivodeshipLeads, grouped]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (!isAddingPoint) return;

      const nextId = Date.now();
      const pointCenter: [number, number] = [event.latlng.lat, event.latlng.lng];
      const nearestVoivodeshipId = getNearestVoivodeshipId(pointCenter);
      const nearestVoivodeshipLabel =
        VOIVODESHIPS.find((voivodeship) => voivodeship.id === nearestVoivodeshipId)?.label ?? 'Polska';

      if (linkCoopId && linkCoop) {
        setCustomPoints((prev) => [
          ...prev,
          {
            id: nextId,
            name: linkCoop.name,
            voivodeshipId: nearestVoivodeshipId,
            valueGwh: 0,
            center: pointCenter,
            cooperativeId: linkCoopId,
          },
        ]);
        setSelectedVoivodeship(String(nextId));
        setIsAddingPoint(false);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('linkCoop');
        setSearchParams(nextParams, { replace: true });
        return;
      }

      setPendingPoint({
        id: nextId,
        center: pointCenter,
        voivodeshipId: nearestVoivodeshipId,
        voivodeshipLabel: nearestVoivodeshipLabel,
      });
      setPendingPointName('');
      setIsAddingPoint(false);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isAddingPoint, linkCoop, linkCoopId, searchParams, setSearchParams]);

  const selectedMeta = allPoints.find((v) => v.id === selectedVoivodeship) ?? null;
  const selectedCustomPoint = selectedMeta?.isCustom
    ? customPoints.find((point) => String(point.id) === selectedMeta.id) ?? null
    : null;
  const selectedLinkedCoop = selectedCustomPoint?.cooperativeId
    ? db.cooperatives.find((coop) => coop.id === selectedCustomPoint.cooperativeId) ?? null
    : null;
  const selectedLinkedDetails = selectedLinkedCoop
    ? frontendDetailsByCoopId[String(selectedLinkedCoop.id)] ?? null
    : null;
  const selectedLinkedAreas = selectedLinkedDetails?.areaIds?.length
    ? db.areas.filter((area) => selectedLinkedDetails.areaIds?.includes(area.id))
    : [];
  const selectedLinkedMembers = selectedLinkedDetails?.members ?? [];
  const isCustomSelectedPoint = Boolean(selectedMeta?.isCustom);
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

  return (
    <>
      <button className="add-entity-btn" onClick={() => setIsAddingPoint(true)} type="button">
        <span>+</span>
        <span>Dodaj punkt na mapie</span>
      </button>
      {isAddingPoint ? (
        <p className="map-point-help">
          {linkCoop
            ? `Wybierz punkt na mapie dla spółdzielni: ${linkCoop.name}`
            : 'Kliknij w wybrane miejsce na mapie, aby dodać punkt.'}
        </p>
      ) : null}
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
            {selectedLinkedCoop ? (
              <div className="map-linked-coop-card">
                <h5>Szczegóły spółdzielni z tworzenia</h5>
                <p><strong>Nazwa:</strong> {selectedLinkedCoop.name}</p>
                <p><strong>Adres:</strong> {selectedLinkedCoop.address || '-'}</p>
                <p><strong>Województwo:</strong> {selectedLinkedCoop.voivodeship || '-'}</p>
                <p><strong>Status:</strong> {selectedLinkedCoop.status}</p>
                <p><strong>Moc planowana:</strong> {selectedLinkedCoop.plannedPower} kWp</p>
                <p><strong>Moc zainstalowana:</strong> {selectedLinkedCoop.installedPower} kWp</p>
                <p><strong>Zarząd:</strong> {selectedLinkedDetails?.board?.name || '-'}</p>
                <p><strong>E-mail zarządu:</strong> {selectedLinkedDetails?.board?.email || '-'}</p>
                <p><strong>Telefon zarządu:</strong> {selectedLinkedDetails?.board?.phone || '-'}</p>
                <p><strong>Data utworzenia:</strong> {selectedLinkedDetails?.createdAt || '-'}</p>
                <p><strong>Członkowie:</strong> {selectedLinkedMembers.length}</p>
                {selectedLinkedMembers.length ? (
                  <div>
                    {selectedLinkedMembers.map((member) => (
                      <div key={member.id}>• {member.fullName} ({member.status})</div>
                    ))}
                  </div>
                ) : null}
                <p><strong>Tereny:</strong> {selectedLinkedAreas.length}</p>
                {selectedLinkedAreas.length ? (
                  <div>
                    {selectedLinkedAreas.map((area) => (
                      <div key={area.id}>• {area.name}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}
