import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Cooperative, User } from '@/types/domain';
import { listCooperativesIdAndName, type CooperativeIdName } from '@/services/cooperatives';

/** Lekki szkielet pod tabelę / karty — pełne GET /cooperatives nie jest potrzebne na /sales-plans. */
function cooperativeStubFromIdName(c: CooperativeIdName): Cooperative {
  return {
    id: c.id,
    name: c.name,
    address: '',
    voivodeship: '',
    status: 'aktywna',
    caregiverId: null,
    plannedPower: 0,
    installedPower: 0,
    members: [],
  };
}
import type { SalesPlanApiModel, SalesPlanEntryApi, SalesPlanNoteApi } from '@/services/salesPlans';
import {
  createSalesPlanEntry,
  createSalesPlanShell,
  deleteSalesPlanEntry,
  getSalesPlanByCooperative,
  listSalesPlans,
  mapNotesToApiPayload,
  normalizeSalesPlansListResponse,
  parseSalesPlanResponse,
  updateSalesPlanEntry,
  updateSalesPlanTarget,
} from '@/services/salesPlans';

interface PlanySprzedazoweSectionProps {
  caregivers: User[];
  cooperatives: Cooperative[];
  currentUser: User | null;
  isAdmin: boolean;
  scope: 'all' | 'mine';
}

type EntryType = 'planned' | 'realized';

type PlanNote = {
  id: string;
  text: string;
  createdAt: string;
};

type SalesPlanEntry = {
  id: string;
  name: string;
  ppeAddress: string;
  nip: string;
  plannedTurnover: number;
  plannedInstallPower: number;
  existingInstallPower: number;
  plannedStoragePower: number;
  existingStoragePower: number;
  createdAt: string;
  notes: PlanNote[];
};

type SalesPlan = {
  cooperativeId: number;
  quarterYear: string;
  targetKWh: number;
  planned: SalesPlanEntry[];
  realized: SalesPlanEntry[];
};

type EntryDraft = {
  id: string | null;
  type: EntryType;
  name: string;
  ppeAddress: string;
  nip: string;
  plannedTurnover: string;
  plannedInstallPower: string;
  existingInstallPower: string;
  plannedStoragePower: string;
  existingStoragePower: string;
  createdAt: string;
  notes: PlanNote[];
  newNoteText: string;
};

function mapApiNote(n: SalesPlanNoteApi): PlanNote {
  const ca = n.createdAt ?? '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(ca)) {
    const d = new Date(ca);
    return {
      id: n.id,
      text: n.text,
      createdAt: d.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }
  return { id: n.id, text: n.text, createdAt: ca };
}

function mapApiEntry(e: SalesPlanEntryApi): SalesPlanEntry {
  const createdAt =
    e.createdAt && /^\d{4}-\d{2}-\d{2}T/.test(e.createdAt) ? e.createdAt.slice(0, 10) : e.createdAt;
  return {
    id: e.id,
    name: e.name,
    ppeAddress: e.ppeAddress,
    nip: e.nip ?? '',
    plannedTurnover: e.plannedTurnover,
    plannedInstallPower: e.plannedInstallPower,
    existingInstallPower: e.existingInstallPower,
    plannedStoragePower: e.plannedStoragePower,
    existingStoragePower: e.existingStoragePower,
    createdAt,
    notes: (e.notes ?? []).map(mapApiNote),
  };
}

function mapApiModelToSalesPlan(p: SalesPlanApiModel): SalesPlan {
  return {
    cooperativeId: p.cooperativeId,
    quarterYear: p.quarterYear,
    targetKWh: p.targetKWh,
    planned: p.planned.map(mapApiEntry),
    realized: p.realized.map(mapApiEntry),
  };
}

function formatQuarter(quarter: number, year: number): string {
  return `Q${quarter} ${year}`;
}

function getCurrentQuarterString(baseDate = new Date()): string {
  const quarter = Math.floor(baseDate.getMonth() / 3) + 1;
  return formatQuarter(quarter, baseDate.getFullYear());
}

function quarterSortValue(quarterYear: string): number {
  const match = quarterYear.match(/^Q([1-4])\s+(\d{4})$/);
  if (!match) return 0;
  return Number(match[2]) * 10 + Number(match[1]);
}

function getAvailableQuartersForUser(plans: SalesPlan[]): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const all = new Set<string>([
    formatQuarter(1, currentYear - 1),
    formatQuarter(2, currentYear - 1),
    formatQuarter(3, currentYear - 1),
    formatQuarter(4, currentYear - 1),
    formatQuarter(1, currentYear),
    formatQuarter(2, currentYear),
    formatQuarter(3, currentYear),
    formatQuarter(4, currentYear),
    formatQuarter(1, currentYear + 1),
    formatQuarter(2, currentYear + 1),
    formatQuarter(3, currentYear + 1),
    formatQuarter(4, currentYear + 1),
  ]);
  plans.forEach((plan) => all.add(plan.quarterYear));
  return Array.from(all).sort((a, b) => quarterSortValue(b) - quarterSortValue(a));
}

function emptyEntryDraft(type: EntryType): EntryDraft {
  return {
    id: null,
    type,
    name: '',
    ppeAddress: '',
    nip: '',
    plannedTurnover: '0',
    plannedInstallPower: '0',
    existingInstallPower: '0',
    plannedStoragePower: '0',
    existingStoragePower: '0',
    createdAt: new Date().toISOString().slice(0, 10),
    notes: [],
    newNoteText: '',
  };
}

function toNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function PlanySprzedazoweSection({
  caregivers,
  cooperatives,
  currentUser,
  isAdmin,
  scope,
}: PlanySprzedazoweSectionProps) {
  const [plans, setPlans] = useState<SalesPlan[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarterString());
  const [manage, setManage] = useState<{ coopId: number; quarterYear: string } | null>(null);
  const [entryModal, setEntryModal] = useState<EntryDraft | null>(null);
  const [targetDraft, setTargetDraft] = useState('0');
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [selectedCoopForPlan, setSelectedCoopForPlan] = useState('');
  const [addPlanCoopOptions, setAddPlanCoopOptions] = useState<CooperativeIdName[]>([]);
  const [addPlanCoopsLoading, setAddPlanCoopsLoading] = useState(false);
  const [addPlanCoopsError, setAddPlanCoopsError] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [saving, setSaving] = useState(false);
  const [adminCoopSummaries, setAdminCoopSummaries] = useState<CooperativeIdName[]>([]);
  const [adminCoopListLoading, setAdminCoopListLoading] = useState(false);
  const [adminCoopListError, setAdminCoopListError] = useState('');

  const cooperativesForUi = useMemo(() => {
    if (scope === 'all') {
      return adminCoopSummaries.map(cooperativeStubFromIdName);
    }
    return cooperatives.filter((coop) => coop.caregiverId === currentUser?.id);
  }, [adminCoopSummaries, cooperatives, currentUser?.id, scope]);

  useEffect(() => {
    if (!currentUser || scope !== 'all') {
      setAdminCoopSummaries([]);
      setAdminCoopListError('');
      setAdminCoopListLoading(false);
      return;
    }
    setAdminCoopListLoading(true);
    setAdminCoopListError('');
    void (async () => {
      try {
        const list = await listCooperativesIdAndName();
        setAdminCoopSummaries(list);
      } catch {
        setAdminCoopListError('Nie udało się pobrać listy spółdzielni.');
        setAdminCoopSummaries([]);
      } finally {
        setAdminCoopListLoading(false);
      }
    })();
  }, [currentUser, scope]);

  const loadPlans = useCallback(async (quarterYear: string, coopIds: number[]) => {
    if (!coopIds.length) {
      setPlans([]);
      return;
    }
    setPlansLoading(true);
    setPlansError('');
    try {
      const raw = await listSalesPlans({ quarterYear, cooperativeIds: coopIds });
      const items = normalizeSalesPlansListResponse(raw).map(mapApiModelToSalesPlan);
      setPlans(items);
    } catch {
      setPlansError('Nie udało się pobrać planów sprzedaży.');
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (scope === 'all' && adminCoopListLoading) return;
    const ids = cooperativesForUi.map((c) => c.id).filter((id) => Number.isInteger(id) && id > 0);
    void loadPlans(selectedQuarter, ids);
  }, [
    adminCoopListLoading,
    cooperativesForUi,
    currentUser,
    loadPlans,
    scope,
    selectedQuarter,
  ]);

  useEffect(() => {
    if (!addPlanOpen) return;
    setMutationError('');
    setSelectedCoopForPlan('');
    setAddPlanCoopsError('');
    if (isAdmin && scope === 'all' && adminCoopSummaries.length > 0) {
      setAddPlanCoopOptions(adminCoopSummaries);
      setAddPlanCoopsLoading(false);
      return;
    }
    setAddPlanCoopsLoading(true);
    void (async () => {
      try {
        const list = await listCooperativesIdAndName();
        setAddPlanCoopOptions(list);
      } catch {
        setAddPlanCoopsError('Nie udało się pobrać listy spółdzielni.');
        setAddPlanCoopOptions([]);
      } finally {
        setAddPlanCoopsLoading(false);
      }
    })();
  }, [addPlanOpen, adminCoopSummaries, isAdmin, scope]);

  const resolvePlanAfterMutation = async (
    raw: unknown,
    coopId: number,
    quarterYear: string,
  ): Promise<SalesPlan> => {
    if (raw != null && typeof raw === 'object' && 'cooperativeId' in raw) {
      try {
        return mapApiModelToSalesPlan(parseSalesPlanResponse(raw));
      } catch {
        /* GET ponizej */
      }
    }
    const fresh = await getSalesPlanByCooperative(coopId, quarterYear);
    return mapApiModelToSalesPlan(parseSalesPlanResponse(fresh));
  };

  const quarterOptions = useMemo(() => getAvailableQuartersForUser(plans), [plans]);

  useEffect(() => {
    if (!quarterOptions.includes(selectedQuarter)) {
      setSelectedQuarter(quarterOptions[0] ?? getCurrentQuarterString());
    }
  }, [quarterOptions, selectedQuarter]);

  const getPlan = (coopId: number, quarterYear: string): SalesPlan => {
    const found = plans.find((plan) => plan.cooperativeId === coopId && plan.quarterYear === quarterYear);
    if (found) return found;
    return {
      cooperativeId: coopId,
      quarterYear,
      targetKWh: 0,
      planned: [],
      realized: [],
    };
  };

  const upsertPlan = (next: SalesPlan) => {
    setPlans((prev) => {
      const idx = prev.findIndex((plan) => plan.cooperativeId === next.cooperativeId && plan.quarterYear === next.quarterYear);
      if (idx < 0) return [...prev, next];
      const clone = [...prev];
      clone[idx] = next;
      return clone;
    });
  };

  const openManage = async (coopId: number, quarterYear: string) => {
    setMutationError('');
    try {
      const raw = await getSalesPlanByCooperative(coopId, quarterYear);
      const plan = mapApiModelToSalesPlan(parseSalesPlanResponse(raw));
      upsertPlan(plan);
      setTargetDraft(String(plan.targetKWh));
      setManage({ coopId, quarterYear });
    } catch {
      setMutationError('Nie udało się otworzyć planu.');
    }
  };

  const createPlanByAdmin = async () => {
    const coopId = Number(selectedCoopForPlan);
    if (!Number.isInteger(coopId) || coopId < 1) return;
    setMutationError('');
    setSaving(true);
    try {
      await createSalesPlanShell({ cooperativeId: coopId, quarterYear: selectedQuarter });
      const ids = [...new Set([
        ...cooperativesForUi.map((c) => c.id).filter((id) => id > 0),
        coopId,
      ])];
      await loadPlans(selectedQuarter, ids);
      setAddPlanOpen(false);
      setSelectedCoopForPlan('');
      await openManage(coopId, selectedQuarter);
    } catch {
      setMutationError('Nie udało się utworzyć planu.');
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => {
    return cooperativesForUi.map((coop) => {
      const plan = getPlan(coop.id, selectedQuarter);
      const totalRealized = plan.realized.reduce((sum, entry) => sum + (entry.plannedTurnover || 0), 0);
      const progress = plan.targetKWh > 0 ? Math.round((totalRealized / plan.targetKWh) * 100) : 0;
      const caregiver =
        coop.supervisor
          ? `${coop.supervisor.name} ${coop.supervisor.surname}`.trim()
          : currentUser && coop.caregiverId === currentUser.id
            ? currentUser.name
            : caregivers.find((c) => c.id === coop.caregiverId)?.name ?? '—';
      return {
        coop,
        caregiver,
        targetKWh: plan.targetKWh,
        totalRealized,
        progress,
      };
    });
  }, [caregivers, cooperativesForUi, currentUser, plans, selectedQuarter]);

  const managedCoop = manage
    ? cooperativesForUi.find((coop) => coop.id === manage.coopId) ?? null
    : null;
  const managedPlan = manage && managedCoop ? getPlan(manage.coopId, manage.quarterYear) : null;

  const saveTarget = async () => {
    if (!manage || !managedPlan) return;
    setMutationError('');
    setSaving(true);
    try {
      const raw = await updateSalesPlanTarget(
        manage.coopId,
        manage.quarterYear,
        Math.max(0, toNumber(targetDraft)),
      );
      const plan = await resolvePlanAfterMutation(raw, manage.coopId, manage.quarterYear);
      upsertPlan(plan);
      setTargetDraft(String(plan.targetKWh));
    } catch {
      setMutationError('Nie udało się zapisać celu.');
    } finally {
      setSaving(false);
    }
  };

  const openEntryModal = (type: EntryType, entryId?: string) => {
    if (!managedPlan) return;
    const list = type === 'planned' ? managedPlan.planned : managedPlan.realized;
    const existing = entryId ? list.find((entry) => entry.id === entryId) : null;
    if (!existing) {
      setEntryModal(emptyEntryDraft(type));
      return;
    }
    setEntryModal({
      id: existing.id,
      type,
      name: existing.name,
      ppeAddress: existing.ppeAddress,
      nip: existing.nip,
      plannedTurnover: String(existing.plannedTurnover),
      plannedInstallPower: String(existing.plannedInstallPower),
      existingInstallPower: String(existing.existingInstallPower),
      plannedStoragePower: String(existing.plannedStoragePower),
      existingStoragePower: String(existing.existingStoragePower),
      createdAt: existing.createdAt,
      notes: existing.notes ?? [],
      newNoteText: '',
    });
  };

  const saveEntry = async () => {
    if (!entryModal || !managedPlan || !manage) return;
    setMutationError('');
    setSaving(true);
    try {
      const notesPayload = mapNotesToApiPayload(entryModal.notes);
      const basePayload = {
        kind: entryModal.type,
        name: entryModal.name.trim(),
        ppeAddress: entryModal.ppeAddress.trim(),
        ...(entryModal.nip.trim() ? { nip: entryModal.nip.trim() } : {}),
        plannedTurnover: toNumber(entryModal.plannedTurnover),
        plannedInstallPower: toNumber(entryModal.plannedInstallPower),
        existingInstallPower: toNumber(entryModal.existingInstallPower),
        plannedStoragePower: toNumber(entryModal.plannedStoragePower),
        existingStoragePower: toNumber(entryModal.existingStoragePower),
        createdAt: entryModal.createdAt,
        ...(notesPayload.length > 0 ? { notes: notesPayload } : {}),
      };
      const raw = entryModal.id
        ? await updateSalesPlanEntry(manage.coopId, manage.quarterYear, entryModal.id, basePayload)
        : await createSalesPlanEntry(manage.coopId, manage.quarterYear, basePayload);
      const plan = await resolvePlanAfterMutation(raw, manage.coopId, manage.quarterYear);
      upsertPlan(plan);
      setEntryModal(null);
    } catch {
      setMutationError('Nie udało się zapisać wpisu.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (_type: EntryType, entryId: string) => {
    if (!managedPlan || !manage) return;
    setMutationError('');
    setSaving(true);
    try {
      const raw = await deleteSalesPlanEntry(manage.coopId, manage.quarterYear, entryId);
      const plan = await resolvePlanAfterMutation(raw, manage.coopId, manage.quarterYear);
      upsertPlan(plan);
    } catch {
      setMutationError('Nie udało się usunąć wpisu.');
    } finally {
      setSaving(false);
    }
  };

  const addNoteToEntryDraft = () => {
    if (!entryModal) return;
    const text = entryModal.newNoteText.trim();
    if (!text) return;
    const note: PlanNote = {
      id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      createdAt: `${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
    };
    setEntryModal({
      ...entryModal,
      notes: [...entryModal.notes, note],
      newNoteText: '',
    });
  };

  const title = scope === 'mine' ? 'Mój plan sprzedaży' : 'Plany sprzedażowe';
  const listBlocking = plansLoading || (scope === 'all' && adminCoopListLoading);

  return (
    <section className="panel sales-plan-panel">
      <div className="sales-plan-header">
        <h3>{scope === 'all' ? `${title} - ${selectedQuarter}` : title}</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isAdmin && scope === 'all' ? (
            <button className="primary-btn" type="button" onClick={() => setAddPlanOpen(true)}>
              Dodaj plan sprzedażowy
            </button>
          ) : null}
          <select
            className="sales-plan-quarter-select"
            value={selectedQuarter}
            onChange={(event) => setSelectedQuarter(event.target.value)}
          >
            {quarterOptions.map((quarter) => (
              <option key={quarter} value={quarter}>{quarter}</option>
            ))}
          </select>
        </div>
      </div>

      {plansError ? <p className="email-warning" style={{ marginBottom: '0.75rem' }}>{plansError}</p> : null}
      {adminCoopListError ? <p className="email-warning" style={{ marginBottom: '0.75rem' }}>{adminCoopListError}</p> : null}

      {listBlocking ? (
        <p style={{ padding: '1rem', color: '#9ca3af' }}>Ładowanie…</p>
      ) : scope === 'all' ? (
        <div className="table-wrapper">
          <table className="sales-plan-table">
            <thead>
              <tr>
                <th>Opiekun</th>
                <th>Spółdzielnia</th>
                <th>Cel (kWh)</th>
                <th>Zrealizowane (kWh)</th>
                <th>Realizacja</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.coop.id}>
                  <td>{row.caregiver}</td>
                  <td>{row.coop.name}</td>
                  <td>{row.targetKWh} kWh</td>
                  <td>{row.totalRealized} kWh</td>
                  <td>{row.progress}%</td>
                  <td>
                    <button className="primary-btn sales-plan-manage-btn" type="button" onClick={() => void openManage(row.coop.id, selectedQuarter)}>
                      Zarządzaj
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="empty-row">Brak spółdzielni</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sales-plan-cards">
          {rows.length ? rows.map((row) => (
            <article key={row.coop.id} className="sales-plan-card">
              <div className="sales-plan-card-title">{row.coop.name}</div>
              <div className="sales-plan-card-quarter">{selectedQuarter}</div>
              <div className="sales-plan-card-kpi">
                <div>
                  <p>Cel</p>
                  <strong>{row.targetKWh} kWh</strong>
                </div>
                <div>
                  <p>Realizacja</p>
                  <strong>{row.progress}%</strong>
                </div>
              </div>
              <div className="sales-plan-card-metrics">
                <div>Planowane: <strong>{getPlan(row.coop.id, selectedQuarter).planned.reduce((sum, entry) => sum + entry.plannedTurnover, 0)} kWh</strong> ({getPlan(row.coop.id, selectedQuarter).planned.length})</div>
                <div>Zrealizowane: <strong>{row.totalRealized} kWh</strong> ({getPlan(row.coop.id, selectedQuarter).realized.length})</div>
              </div>
              <button className="primary-btn" type="button" onClick={() => void openManage(row.coop.id, selectedQuarter)}>
                Szczegóły planu
              </button>
            </article>
          )) : <p className="map-none">Nie masz jeszcze żadnej spółdzielni</p>}
        </div>
      )}

      {manage && managedCoop && managedPlan ? (
        <div className="modal-backdrop" onClick={() => { setManage(null); setEntryModal(null); }}>
          <div className="modal-card-sales-plan-modal-v2" onClick={(event) => event.stopPropagation()}>
            <div className="sales-plan-modal-head">
              <h3>{managedCoop.name} - {manage.quarterYear}</h3>
              <button type="button" onClick={() => { setManage(null); setEntryModal(null); setMutationError(''); }}>✕</button>
            </div>
            {mutationError ? <p className="email-warning" style={{ marginBottom: 12 }}>{mutationError}</p> : null}
            <div className="sales-plan-target-box">
              <div className="sales-plan-target-edit">
                <label>Nadaj cel sprzedażowy (kWh)</label>
                <div className="sales-plan-target-actions">
                  <input type="number" value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} disabled={saving} />
                  <button className="primary-btn" type="button" onClick={() => void saveTarget()} disabled={saving}>Zapisz cel</button>
                </div>
              </div>
              <div className="sales-plan-target-progress">
                <p>Aktualna realizacja</p>
                <strong>
                  {managedPlan.targetKWh > 0
                    ? Math.round((managedPlan.realized.reduce((sum, entry) => sum + entry.plannedTurnover, 0) / managedPlan.targetKWh) * 100)
                    : 0}
                  %
                </strong>
              </div>
            </div>

            <div className="sales-plan-columns-v2">
              {([
                { type: 'planned' as const, title: 'Planowane', data: managedPlan.planned },
                { type: 'realized' as const, title: 'Zrealizowane', data: managedPlan.realized },
              ]).map((column) => (
                <section key={column.type} className="sales-plan-column-v2">
                  <div className="sales-plan-column-head">
                    <h4>{column.title} <span>({column.data.length})</span></h4>
                    <button className="primary-btn" type="button" onClick={() => openEntryModal(column.type)} disabled={saving}>Dodaj</button>
                  </div>
                  <div className="table-wrapper">
                    <table className="sales-plan-entries-table">
                      <thead>
                        <tr>
                          <th>Imię Nazwisko / Nazwa</th>
                          <th>Adres PPE</th>
                          <th>NIP</th>
                          <th>Planowany roczny obrót energii</th>
                          <th>Moc inst. plan. (kWp)</th>
                          <th>Moc inst. ist. (kWp)</th>
                          <th>Mag. plan. (kWp)</th>
                          <th>Mag. ist. (kWp)</th>
                          <th>Data</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {column.data.length ? column.data.map((entry) => (
                          <tr key={entry.id}>
                            <td>{entry.name}</td>
                            <td>{entry.ppeAddress}</td>
                            <td>{entry.nip || '-'}</td>
                            <td>{entry.plannedTurnover} kWh</td>
                            <td>{entry.plannedInstallPower} kWp</td>
                            <td>{entry.existingInstallPower} kWp</td>
                            <td>{entry.plannedStoragePower} kWp</td>
                            <td>{entry.existingStoragePower} kWp</td>
                            <td>{entry.createdAt}</td>
                            <td>
                              <button className="table-action-btn" type="button" onClick={() => openEntryModal(column.type, entry.id)} disabled={saving}>Edytuj</button>
                              <button className="table-action-btn danger" type="button" onClick={() => void deleteEntry(column.type, entry.id)} disabled={saving}>Usuń</button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={10} className="empty-row">Brak wpisów</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {addPlanOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setAddPlanOpen(false);
            setSelectedCoopForPlan('');
            setAddPlanCoopsError('');
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Dodaj plan sprzedażowy</h3>
            <p className="map-none" style={{ marginBottom: 12 }}>
              Wybierz spółdzielnię, aby nadać plan sprzedażowy opiekunowi na wybrany kwartał.
            </p>
            {mutationError ? <p className="email-warning" style={{ marginBottom: 12 }}>{mutationError}</p> : null}
            {addPlanCoopsError ? <p className="email-warning" style={{ marginBottom: 12 }}>{addPlanCoopsError}</p> : null}
            <label htmlFor="sales-plan-coop-select" style={{ display: 'grid', gap: 6 }}>
              Spółdzielnia
              <select
                id="sales-plan-coop-select"
                className="add-entry-select"
                value={selectedCoopForPlan}
                onChange={(event) => setSelectedCoopForPlan(event.target.value)}
                disabled={addPlanCoopsLoading || addPlanCoopOptions.length === 0}
              >
                <option value="">
                  {addPlanCoopsLoading ? 'Ładowanie listy…' : '— wybierz spółdzielnię —'}
                </option>
                {addPlanCoopOptions.map((coop) => (
                  <option key={coop.id} value={coop.id}>{coop.name}</option>
                ))}
              </select>
            </label>
            <div className="sales-plan-entry-buttons" style={{ marginTop: 14 }}>
              <button
                className="primary-outline-btn"
                type="button"
                onClick={() => {
                  setAddPlanOpen(false);
                  setSelectedCoopForPlan('');
                  setAddPlanCoopsError('');
                }}
              >
                Anuluj
              </button>
              <button
                className="primary-btn"
                type="button"
                disabled={!selectedCoopForPlan || saving || addPlanCoopsLoading || addPlanCoopOptions.length === 0}
                onClick={() => void createPlanByAdmin()}
              >
                Utwórz plan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {entryModal ? (
        <div className="modal-backdrop" onClick={() => { setEntryModal(null); setMutationError(''); }}>
          <div className="modal-card sales-plan-entry-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{entryModal.id ? 'Edytuj wpis' : (entryModal.type === 'planned' ? 'Nowy wpis planowany' : 'Nowy wpis zrealizowany')}</h3>
            {mutationError ? <p className="email-warning" style={{ marginBottom: 12 }}>{mutationError}</p> : null}
            <form
              className="sales-plan-entry-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void saveEntry();
              }}
            >
              <label>
                Imię Nazwisko / Nazwa
                <input value={entryModal.name} required onChange={(event) => setEntryModal({ ...entryModal, name: event.target.value })} />
              </label>
              <label>
                Adres PPE
                <input value={entryModal.ppeAddress} required onChange={(event) => setEntryModal({ ...entryModal, ppeAddress: event.target.value })} />
              </label>
              <label>
                NIP (jeśli firma)
                <input value={entryModal.nip} onChange={(event) => setEntryModal({ ...entryModal, nip: event.target.value })} />
              </label>
              <label>
                Planowany roczny obrót energii (kWh)
                <input type="number" value={entryModal.plannedTurnover} required onChange={(event) => setEntryModal({ ...entryModal, plannedTurnover: event.target.value })} />
              </label>
              <label>
                Moc instalacji planowanej (kWp)
                <input type="number" step="0.1" value={entryModal.plannedInstallPower} required onChange={(event) => setEntryModal({ ...entryModal, plannedInstallPower: event.target.value })} />
              </label>
              <label>
                Moc instalacji istniejącej (kWp)
                <input type="number" step="0.1" value={entryModal.existingInstallPower} required onChange={(event) => setEntryModal({ ...entryModal, existingInstallPower: event.target.value })} />
              </label>
              <label>
                Moc Magazynu Energii planowany (kWp)
                <input type="number" step="0.1" value={entryModal.plannedStoragePower} required onChange={(event) => setEntryModal({ ...entryModal, plannedStoragePower: event.target.value })} />
              </label>
              <label>
                Moc Magazynu Energii istniejący (kWp)
                <input type="number" step="0.1" value={entryModal.existingStoragePower} required onChange={(event) => setEntryModal({ ...entryModal, existingStoragePower: event.target.value })} />
              </label>
              <label>
                Data
                <input type="date" value={entryModal.createdAt} onChange={(event) => setEntryModal({ ...entryModal, createdAt: event.target.value })} />
              </label>

              <div className="sales-plan-note-box">
                <h4>Notatki do wpisu</h4>
                <div className="sales-plan-note-list">
                  {entryModal.notes.length ? entryModal.notes.map((note) => (
                    <div key={note.id}>
                      <small>{note.createdAt}</small>
                      <p>{note.text}</p>
                    </div>
                  )) : <p className="map-none">Brak notatek</p>}
                </div>
                <div className="sales-plan-note-actions">
                  <input
                    value={entryModal.newNoteText}
                    onChange={(event) => setEntryModal({ ...entryModal, newNoteText: event.target.value })}
                    placeholder="Dodaj nową notatkę..."
                  />
                  <button type="button" className="primary-btn" onClick={addNoteToEntryDraft}>
                    Dodaj notatkę
                  </button>
                </div>
              </div>

              <div className="sales-plan-entry-buttons">
                <button type="button" className="primary-outline-btn" onClick={() => setEntryModal(null)}>
                  Anuluj
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  Zapisz wpis
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
