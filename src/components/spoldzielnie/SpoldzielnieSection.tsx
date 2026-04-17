import { useState, useEffect, useCallback } from 'react';

import CooperativesTable from '@/components/common/CooperativesTable';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import { VOIVODESHIPS } from '@/constants/voivodeships';
import {
  listCooperatives,
  createCooperative,
  updateCooperative,
  deleteCooperative,
  formatCooperativeHistoryMessage,
  mapStatusToApi,
  type CooperativeApiStatus,
} from '@/services/cooperatives';
import type { Cooperative, CooperativeHistoryItem } from '@/types/domain';

const PAGE_SIZE = 15;

const STATUS_OPTIONS: { label: string; value: CooperativeApiStatus | '' }[] = [
  { label: 'Wszystkie statusy', value: '' },
  { label: 'Aktywna', value: 'ACTIVE' },
  { label: 'W trakcie tworzenia', value: 'IN_PROGRESS' },
  { label: 'Planowana', value: 'PLANNED' },
  { label: 'Zawieszona', value: 'PAUSED' },
];

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** When `cooperatives` prop is passed, the section works in read-only, prop-driven mode (e.g. caregiver view). */
interface SpoldzielnieSectionProps {
  cooperatives?: Cooperative[];
  onAddCooperative?: (values: AddEntryValues) => void;
  onUpdateCooperative?: (
    coopId: number,
    payload: Pick<Cooperative, 'status' | 'plannedPower' | 'installedPower'>,
  ) => void;
  onDeleteCooperative?: (coopId: number) => void;
}

export default function SpoldzielnieSection({
  cooperatives: cooperativesProp,
  onAddCooperative: onAddCooperativeProp,
  onUpdateCooperative: onUpdateCooperativeProp,
  onDeleteCooperative: onDeleteCooperativeProp,
}: SpoldzielnieSectionProps) {
  const selfFetch = cooperativesProp === undefined;

  // ── self-fetch state ──────────────────────────────────────────────────────
  const [cooperatives, setCooperatives] = useState<Cooperative[]>(cooperativesProp ?? []);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<CooperativeApiStatus | ''>('');
  const [filterRegion, setFilterRegion] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  // ── edit modal state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState<Cooperative | null>(null);
  const [editStatus, setEditStatus] = useState<Cooperative['status']>('planowana');
  const [editPlanned, setEditPlanned] = useState('0');
  const [editInstalled, setEditInstalled] = useState('0');
  const [saving, setSaving] = useState(false);

  // ── history modal state ───────────────────────────────────────────────────
  const [historyCoopName, setHistoryCoopName] = useState('');
  const [historyItems, setHistoryItems] = useState<CooperativeHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchCooperatives = useCallback(async () => {
    if (!selfFetch) return;
    setLoading(true);
    setFetchError('');
    try {
      const result = await listCooperatives({
        page,
        limit: PAGE_SIZE,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterRegion ? { region: filterRegion } : {}),
        sortOrder,
      });
      setCooperatives(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setFetchError('Nie udało się pobrać listy spółdzielni.');
    } finally {
      setLoading(false);
    }
  }, [selfFetch, page, filterStatus, filterRegion, sortOrder]);

  useEffect(() => {
    void fetchCooperatives();
  }, [fetchCooperatives]);

  // keep in sync when prop changes (caregiver mode)
  useEffect(() => {
    if (!selfFetch && cooperativesProp) setCooperatives(cooperativesProp);
  }, [selfFetch, cooperativesProp]);

  // ── add cooperative ───────────────────────────────────────────────────────
  const handleAddCooperative = (values: AddEntryValues) => {
    if (!selfFetch) {
      onAddCooperativeProp?.(values);
      return;
    }
    const name = (values['coop-name'] ?? '').trim();
    if (!name) return;

    void (async () => {
      setActionError('');
      try {
        await createCooperative({
          name,
          address: (values['coop-address'] ?? '').trim(),
          region: (values['coop-voivodeship'] ?? '').trim() || 'nieokreslone',
          ratedPower: Number(values['coop-planned-power'] ?? 0) || 0,
        });
        setPage(1);
        await fetchCooperatives();
      } catch {
        setActionError('Nie udało się dodać spółdzielni.');
      }
    })();
  };

  // ── edit modal ────────────────────────────────────────────────────────────
  const openEdit = (coop: Cooperative) => {
    setEditing(coop);
    setEditStatus(coop.status);
    setEditPlanned(String(coop.plannedPower ?? 0));
    setEditInstalled(String(coop.installedPower ?? 0));
    setActionError('');
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!editing) return;

    const plannedPower = Number(editPlanned);
    const installedPower = Number(editInstalled);
    const resolvedPlanned = Number.isFinite(plannedPower) ? plannedPower : editing.plannedPower;
    const resolvedInstalled = Number.isFinite(installedPower) ? installedPower : editing.installedPower;
    const resolvedStatus = editStatus;

    const payload = {
      status: resolvedStatus,
      plannedPower: resolvedPlanned,
      installedPower: resolvedInstalled,
    };

    if (!selfFetch) {
      onUpdateCooperativeProp?.(editing.id, payload);
      closeEdit();
      return;
    }

    // Build diff — only send fields that actually changed
    type UpdatePatch = Parameters<typeof updateCooperative>[1];
    const patch: UpdatePatch = {};
    if (resolvedStatus !== editing.status) patch.status = mapStatusToApi(resolvedStatus);
    if (resolvedPlanned !== editing.plannedPower) patch.ratedPower = resolvedPlanned;
    if (resolvedInstalled !== editing.installedPower) patch.installedPower = resolvedInstalled;

    if (Object.keys(patch).length === 0) {
      closeEdit();
      return;
    }

    setSaving(true);
    void (async () => {
      setActionError('');
      try {
        await updateCooperative(editing.id, patch);
        closeEdit();
        await fetchCooperatives();
      } catch {
        setActionError('Nie udało się zaktualizować spółdzielni.');
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDelete = (coopId: number) => {
    if (!selfFetch) {
      onDeleteCooperativeProp?.(coopId);
      return;
    }
    void (async () => {
      setActionError('');
      try {
        await deleteCooperative(coopId);
        closeEdit();
        await fetchCooperatives();
      } catch {
        setActionError('Nie udało się usunąć spółdzielni.');
      }
    })();
  };

  // ── history modal ─────────────────────────────────────────────────────────
  const openHistory = (coop: Cooperative) => {
    setHistoryCoopName(coop.name);
    setHistoryItems(coop.history ?? []);
    setHistoryOpen(true);
  };

  const closeHistory = () => setHistoryOpen(false);

  const canEdit = selfFetch || Boolean(onUpdateCooperativeProp);

  const filterBar = selfFetch ? (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
      <select
        className="add-entry-select"
        value={filterStatus}
        onChange={(e) => { setPage(1); setFilterStatus(e.target.value as CooperativeApiStatus | ''); }}
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className="add-entry-select"
        value={filterRegion}
        onChange={(e) => { setPage(1); setFilterRegion(e.target.value); }}
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
      >
        <option value="">Wszystkie województwa</option>
        {VOIVODESHIPS.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <select
        className="add-entry-select"
        value={sortOrder}
        onChange={(e) => { setPage(1); setSortOrder(e.target.value as 'asc' | 'desc'); }}
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
      >
        <option value="desc">Najnowsze najpierw</option>
        <option value="asc">Najstarsze najpierw</option>
      </select>
    </div>
  ) : null;

  const pagination = selfFetch && totalPages > 1 ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
        Łącznie: {total} spółdzielni
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="primary-outline-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
          ‹ Poprzednia
        </button>
        <span style={{ fontSize: '0.875rem' }}>{page} / {totalPages}</span>
        <button className="primary-outline-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">
          Następna ›
        </button>
      </div>
    </div>
  ) : selfFetch && total > 0 ? (
    <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.75rem' }}>
      Łącznie: {total} spółdzielni
    </p>
  ) : null;

  return (
    <>
      <AddEntryModal
        buttonLabel="Nowa spoldzielnia"
        modalTitle="Dodaj spoldzielnie energetyczna"
        fields={[
          { id: 'coop-name', label: 'Nazwa spoldzielni', placeholder: 'np. Energia Plus' },
          { id: 'coop-address', label: 'Adres siedziby', placeholder: 'ul. Przykladowa 1' },
          { id: 'coop-voivodeship', label: 'Wojewodztwo', options: VOIVODESHIPS },
          { id: 'coop-planned-power', label: 'Moc planowana (kWp)', type: 'number', placeholder: '100' },
        ]}
        onSubmit={handleAddCooperative}
      />

      <section className="panel">
        <h3>Spoldzielnie energetyczne</h3>

        {actionError ? <p className="email-warning" style={{ marginBottom: '0.75rem' }}>{actionError}</p> : null}

        {filterBar}

        {loading ? (
          <p style={{ padding: '1rem', color: '#9ca3af' }}>Ładowanie...</p>
        ) : fetchError ? (
          <p className="email-warning">{fetchError}</p>
        ) : (
          <>
            <CooperativesTable
              cooperatives={cooperatives}
              onEditCooperative={canEdit ? openEdit : undefined}
              onViewHistory={selfFetch ? openHistory : undefined}
            />
            {pagination}
          </>
        )}
      </section>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editing ? (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Edytuj spoldzielnie</h3>
            <form className="add-entry-form" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="edit-coop-status">
                Status
                <select
                  id="edit-coop-status"
                  className="calc-select add-entry-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Cooperative['status'])}
                >
                  <option value="aktywna">Aktywna</option>
                  <option value="w trakcie tworzenia">W trakcie tworzenia</option>
                  <option value="planowana">Planowana</option>
                  <option value="zawieszona">Zawieszona</option>
                </select>
              </label>
              <label htmlFor="edit-coop-planned">
                Moc planowana (kWp)
                <input
                  id="edit-coop-planned"
                  value={editPlanned}
                  onChange={(e) => setEditPlanned(e.target.value)}
                  type="number"
                  step="0.1"
                />
              </label>
              <label htmlFor="edit-coop-installed">
                Moc zainstalowana (kWp)
                <input
                  id="edit-coop-installed"
                  value={editInstalled}
                  onChange={(e) => setEditInstalled(e.target.value)}
                  type="number"
                  step="0.1"
                />
              </label>
            </form>
            <div className="add-entry-actions">
              <button
                className="table-action-btn danger"
                onClick={() => handleDelete(editing.id)}
                type="button"
              >
                Usun
              </button>
              <button className="primary-outline-btn" onClick={closeEdit} type="button">
                Anuluj
              </button>
              <button className="primary-btn" onClick={saveEdit} type="button" disabled={saving}>
                {saving ? 'Zapisuję...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── History modal ──────────────────────────────────────────────────── */}
      {historyOpen ? (
        <div className="modal-backdrop" onClick={closeHistory}>
          <div
            className="modal-card coop-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="coop-history-header">
              <div>
                <p className="coop-history-label">Historia zmian</p>
                <h3 className="coop-history-title">{historyCoopName}</h3>
              </div>
              <button className="coop-history-close" onClick={closeHistory} type="button" aria-label="Zamknij">
                ×
              </button>
            </div>

            <div className="coop-history-body">
              {historyItems.length === 0 ? (
                <p className="coop-history-empty">Brak historii dla tej spółdzielni.</p>
              ) : (
                <ol className="coop-timeline">
                  {historyItems.map((item, idx) => {
                    const { date, time } = formatDateTime(item.createdAt);
                    const isFirst = idx === 0;
                    return (
                      <li key={item.id} className="coop-timeline-item">
                        <div className={`coop-timeline-dot ${isFirst ? 'coop-timeline-dot--first' : ''}`} />
                        <div className="coop-timeline-content">
                          <div className="coop-timeline-meta">
                            <span className="coop-timeline-date">{date}</span>
                            <span className="coop-timeline-time">{time}</span>
                            {item.actionBy ? (
                              <span className="coop-timeline-author">
                                {item.actionBy.name} {item.actionBy.surname}
                              </span>
                            ) : null}
                          </div>
                          <p className="coop-timeline-message">
                            {formatCooperativeHistoryMessage(item.message)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
