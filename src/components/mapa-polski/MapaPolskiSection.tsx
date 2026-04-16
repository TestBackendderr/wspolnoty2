import AddEntryModal from '@/components/common/AddEntryModal';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppDatabase } from '@/types/domain';

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
}

const VOIVODESHIPS: VoivodeshipPoint[] = [
  { id: 'mazowieckie', label: 'Mazowieckie', center: [52.25, 21.0] },
  { id: 'malopolskie', label: 'Malopolskie', center: [49.85, 19.95] },
  { id: 'slaskie', label: 'Slaskie', center: [50.3, 19.0] },
  { id: 'wielkopolskie', label: 'Wielkopolskie', center: [52.4, 17.0] },
  { id: 'dolnoslaskie', label: 'Dolnoslaskie', center: [51.1, 16.2] },
  { id: 'pomorskie', label: 'Pomorskie', center: [54.35, 18.65] },
  { id: 'zachodniopomorskie', label: 'Zachodniopomorskie', center: [53.45, 14.55] },
  { id: 'kujawsko-pomorskie', label: 'Kujawsko-Pomorskie', center: [53.0, 18.6] },
  { id: 'lubelskie', label: 'Lubelskie', center: [51.25, 22.55] },
  { id: 'lubuskie', label: 'Lubuskie', center: [52.25, 15.25] },
  { id: 'lodzkie', label: 'Lodzkie', center: [51.8, 19.45] },
  { id: 'opolskie', label: 'Opolskie', center: [50.65, 17.95] },
  { id: 'podkarpackie', label: 'Podkarpackie', center: [50.05, 22.0] },
  { id: 'podlaskie', label: 'Podlaskie', center: [53.15, 23.15] },
  { id: 'swietokrzyskie', label: 'Swietokrzyskie', center: [50.8, 20.7] },
  { id: 'warminsko-mazurskie', label: 'Warminsko-Mazurskie', center: [53.8, 20.5] },
];

function normalizeVoivodeship(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/\s+/g, '-');
}

export default function MapaPolskiSection({
  db,
  onSetVoivodeshipLead,
  onSetVoivodeshipAssignments,
}: MapaPolskiSectionProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string | null>(null);
  const [leadDraft, setLeadDraft] = useState('');
  const [cooperativeDraft, setCooperativeDraft] = useState('');
  const [areaDraft, setAreaDraft] = useState('');

  const grouped = useMemo(() => {
    const coopByVoiv = new Map<string, AppDatabase['cooperatives']>();
    const areasByVoiv = new Map<string, AppDatabase['areas']>();
    const caregiversByVoiv = new Map<string, AppDatabase['caregivers']>();

    VOIVODESHIPS.forEach((v) => {
      const coops = db.cooperatives.filter((c) => normalizeVoivodeship(c.voivodeship) === v.id);
      const areas = db.areas.filter((a) => normalizeVoivodeship(a.voivodeship) === v.id);
      const caregiverIds = new Set(coops.map((c) => c.caregiverId).filter((id): id is number => id !== null));
      const caregivers = db.caregivers.filter((caregiver) => caregiverIds.has(caregiver.id));
      coopByVoiv.set(v.id, coops);
      areasByVoiv.set(v.id, areas);
      caregiversByVoiv.set(v.id, caregivers);
    });

    return { coopByVoiv, areasByVoiv, caregiversByVoiv };
  }, [db]);

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

    VOIVODESHIPS.forEach((voiv) => {
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
        `<b>${voiv.label}</b><br>${caregiversCount} opiekunow<br>${cooperativesCount} spoldzielni`,
        { direction: 'top' },
      );
      marker.on('click', () => setSelectedVoivodeship(voiv.id));
      marker.addTo(markersLayer);
    });
  }, [db.voivodeshipLeads, grouped]);

  const selectedMeta = VOIVODESHIPS.find((v) => v.id === selectedVoivodeship) ?? null;
  const selectedCaregivers = selectedVoivodeship
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
  const assignedCooperatives = selectedAssignment
    ? db.cooperatives.filter((coop) => selectedAssignment.cooperativeIds.includes(coop.id))
    : [];
  const assignedAreas = selectedAssignment ? db.areas.filter((area) => selectedAssignment.areaIds.includes(area.id)) : [];

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

  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj punkt na mapie"
        modalTitle="Dodaj punkt na mapie"
        fields={[
          { id: 'map-point-name', label: 'Nazwa punktu', placeholder: 'np. Warszawa - Centrum' },
          { id: 'map-point-voivodeship', label: 'Wojewodztwo', placeholder: 'Mazowieckie' },
          { id: 'map-point-value', label: 'Wartosc (GWh)', type: 'number', placeholder: '12' },
        ]}
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
                  <strong>Glowny:</strong> {selectedLead?.name ?? 'Brak przypisania'}
                </div>
                <div className="map-head-right" style={{ marginTop: 8, alignItems: 'flex-start' }}>
                  <select
                    className="add-entry-select"
                    value={leadDraft}
                    onChange={(event) => setLeadDraft(event.target.value)}
                  >
                    <option value="">Brak glownego opiekuna</option>
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
                    Ustaw glownego
                  </button>
                </div>
                {selectedCaregivers.length ? (
                  selectedCaregivers.map((caregiver) => <div key={caregiver.id}>• {caregiver.name}</div>)
                ) : (
                  <span className="map-none-red">Brak opiekunow</span>
                )}
              </div>
              <div>
                <div className="map-col-title">SPOLDZIELNIE</div>
                <div className="map-head-right" style={{ marginTop: 8, alignItems: 'flex-start' }}>
                  <select value={cooperativeDraft} onChange={(event) => setCooperativeDraft(event.target.value)}>
                    <option value="">Brak</option>
                    {selectedCooperatives.map((coop) => (
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
                        usuń
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
                    {selectedAreas.map((area) => (
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
                        usuń
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="map-none">Brak</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
