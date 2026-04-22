import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CooperativesTable from '@/components/common/CooperativesTable';
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
import { listAreas } from '@/services/areas';
import { listAllUsers, listUsers } from '@/services/users';
import type { Cooperative, CooperativeHistoryItem } from '@/types/domain';

const PAGE_SIZE = 15;
type CreateMember = {
  id: number;
  userId: number;
  fullName: string;
  status: 'aktywny' | 'nieaktywny';
};

type CooperativeCreateFormValues = {
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
};

type CooperativeEditFormValues = {
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
  status: Cooperative['status'];
};

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
  onAddCooperative?: (values: AddEntryValues) => Promise<void> | void;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editValues, setEditValues] = useState<CooperativeEditFormValues>({
    name: '',
    address: '',
    voivodeship: VOIVODESHIPS[0] ?? '',
    plannedPower: '0',
    installedPower: '0',
    registrationDate: '',
    caregiverId: '',
    boardName: '',
    boardEmail: '',
    boardPhone: '',
    status: 'planowana' as Cooperative['status'],
  });
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [caregivers, setCaregivers] = useState<Array<{ id: number; name: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [createMembers, setCreateMembers] = useState<CreateMember[]>([]);
  const [editSelectedAreaIds, setEditSelectedAreaIds] = useState<number[]>([]);
  const [editMembers, setEditMembers] = useState<CreateMember[]>([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberMode, setMemberMode] = useState<'create' | 'edit'>('create');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberStatus, setMemberStatus] = useState<'aktywny' | 'nieaktywny'>('aktywny');
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [createValues, setCreateValues] = useState<CooperativeCreateFormValues>({
    name: '',
    address: '',
    voivodeship: VOIVODESHIPS[0] ?? '',
    plannedPower: '0',
    installedPower: '0',
    registrationDate: new Date().toISOString().slice(0, 10),
    caregiverId: '',
    boardName: '',
    boardEmail: '',
    boardPhone: '',
  });

  // ── history modal state ───────────────────────────────────────────────────
  const [historyCoopName, setHistoryCoopName] = useState('');
  const [historyItems, setHistoryItems] = useState<CooperativeHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsCoop, setDetailsCoop] = useState<Cooperative | null>(null);

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

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── add cooperative ───────────────────────────────────────────────────────
  const handleAddCooperative = async (values: AddEntryValues): Promise<number | null> => {
    if (!selfFetch) {
      await onAddCooperativeProp?.(values);
      return null;
    }
    const name = (values['coop-name'] ?? '').trim();
    if (!name) return null;

    setActionError('');
    try {
      const areaIds = String(values['coop-area-ids'] ?? '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
      const membersRaw = String(values['coop-members'] ?? '[]');
      const parsedMembers = JSON.parse(membersRaw) as CreateMember[];
      const supervisorId = Number(values['coop-caregiver-id'] ?? 0);
      const registrationDate = (values['coop-registration-date'] ?? '').trim();

      const memberDtos = parsedMembers
        .filter((m) => Number.isInteger(m.userId) && m.userId > 0)
        .map((m) => ({ userId: m.userId, status: m.status === 'aktywny' ? 'AKTYWNY' : 'NIEAKTYWNY' }));

      const installedPowerVal = Number(values['coop-installed-power'] ?? 0);

      const created = await createCooperative({
        name,
        address: (values['coop-address'] ?? '').trim(),
        region: (values['coop-voivodeship'] ?? '').trim() || 'nieokreślone',
        ratedPower: Number(values['coop-planned-power'] ?? 0) || 0,
        ...(installedPowerVal > 0 ? { installedPower: installedPowerVal } : {}),
        boardName: (values['coop-board-name'] ?? '').trim(),
        boardEmail: (values['coop-board-email'] ?? '').trim(),
        boardPhone: (values['coop-board-phone'] ?? '').trim(),
        supervisorId,
        registrationDate,
        ...(areaIds.length > 0 ? { areaIds } : {}),
        ...(memberDtos.length > 0 ? { members: memberDtos } : {}),
      });
      setPage(1);
      await fetchCooperatives();
      return created.id;
    } catch {
      setActionError('Nie udało się dodać spółdzielni.');
      throw new Error('create_failed');
    }
  };

  useEffect(() => {
    if (!createOpen && !editing) return;
    void (async () => {
      try {
        const [usersRes, areasRes] = await Promise.all([
          listUsers({ page: 1, limit: 200, role: 'OPIEKUN', sortOrder: 'asc' }),
          listAreas({ page: 1, limit: 200, sortOrder: 'asc' }),
        ]);
        setCaregivers(usersRes.data.map((u) => ({ id: u.id, name: u.name })));
        setAreas(areasRes.data.map((a) => ({ id: a.id, name: a.name })));
        const usersAll = await listAllUsers();
        setAllUsers(usersAll.map((u) => ({ id: u.id, name: u.name })).filter((u) => u.name.trim().length > 0));
      } catch {
        // Keep modal usable even when optional lists fail to load.
      }
    })();
  }, [createOpen, editing]);

  const resetCreateForm = () => {
    setSelectedAreaIds([]);
    setCreateMembers([]);
    setEditMembers([]);
    setEditSelectedAreaIds([]);
    setMemberModalOpen(false);
    setMemberUserId('');
    setMemberStatus('aktywny');
    setEditingMemberId(null);
    setCreateValues({
      name: '',
      address: '',
      voivodeship: VOIVODESHIPS[0] ?? '',
      plannedPower: '0',
      installedPower: '0',
      registrationDate: new Date().toISOString().slice(0, 10),
      caregiverId: '',
      boardName: '',
      boardEmail: '',
      boardPhone: '',
    });
  };

  const closeCreate = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const submitCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !createValues.name.trim()
      || !createValues.address.trim()
      || !createValues.boardName.trim()
      || !createValues.boardEmail.trim()
      || !createValues.boardPhone.trim()
      || !createValues.caregiverId
    ) {
      return;
    }
    const values: AddEntryValues = {
      'coop-name': createValues.name,
      'coop-address': createValues.address,
      'coop-voivodeship': createValues.voivodeship,
      'coop-planned-power': createValues.plannedPower,
      'coop-installed-power': createValues.installedPower,
      'coop-caregiver-id': createValues.caregiverId,
      'coop-board-name': createValues.boardName,
      'coop-board-email': createValues.boardEmail,
      'coop-board-phone': createValues.boardPhone,
      'coop-registration-date': createValues.registrationDate,
      'coop-area-ids': selectedAreaIds.join(','),
      'coop-members': JSON.stringify(createMembers),
    };
    setCreateSaving(true);
    void (async () => {
      try {
        const createdId = await handleAddCooperative(values);
        if (createdId) {
          const existingRaw = localStorage.getItem('coop_creation_details_v1');
          const existing = existingRaw ? JSON.parse(existingRaw) as Record<string, unknown> : {};
          existing[String(createdId)] = {
            cooperativeId: createdId,
            board: {
              name: createValues.boardName,
              email: createValues.boardEmail,
              phone: createValues.boardPhone,
            },
            members: createMembers,
            areaIds: selectedAreaIds,
            registrationDate: createValues.registrationDate,
          };
          localStorage.setItem('coop_creation_details_v1', JSON.stringify(existing));
          navigate(`/mapa?linkCoop=${createdId}`);
        }
        closeCreate();
      } finally {
        setCreateSaving(false);
      }
    })();
  };

  const openMembersModalForCreate = () => {
    setMemberMode('create');
    setEditingMemberId(null);
    setMemberUserId('');
    setMemberStatus('aktywny');
    setMemberModalOpen(true);
  };

  const openMembersModalForEdit = (member: CreateMember) => {
    setMemberMode('create');
    setEditingMemberId(member.id);
    setMemberUserId(String(member.userId));
    setMemberStatus(member.status);
    setMemberModalOpen(true);
  };

  const openMembersModalForEditCoop = () => {
    setMemberMode('edit');
    setEditingMemberId(null);
    setMemberUserId('');
    setMemberStatus('aktywny');
    setMemberModalOpen(true);
  };

  const openMemberRowForEditCoop = (member: CreateMember) => {
    setMemberMode('edit');
    setEditingMemberId(member.id);
    setMemberUserId(String(member.userId));
    setMemberStatus(member.status);
    setMemberModalOpen(true);
  };

  const saveMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedUserId = Number(memberUserId);
    if (!selectedUserId) return;
    const selectedUser = allUsers.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;

    const sourceMembers = memberMode === 'create' ? createMembers : editMembers;
    const setMembers = memberMode === 'create' ? setCreateMembers : setEditMembers;
    const duplicate = sourceMembers.find(
      (m) => m.userId === selectedUserId && m.id !== editingMemberId,
    );
    if (duplicate) return;

    if (editingMemberId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMemberId
            ? { ...m, userId: selectedUserId, fullName: selectedUser.name, status: memberStatus }
            : m,
        ),
      );
    } else {
      setMembers((prev) => [
        ...prev,
        { id: Date.now(), userId: selectedUserId, fullName: selectedUser.name, status: memberStatus },
      ]);
    }
    setMemberModalOpen(false);
    setEditingMemberId(null);
    setMemberUserId('');
    setMemberStatus('aktywny');
  };

  const deleteMember = (memberId: number) => {
    if (memberMode === 'create') setCreateMembers((prev) => prev.filter((m) => m.id !== memberId));
    else setEditMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  // ── edit modal ────────────────────────────────────────────────────────────
  const openEdit = (coop: Cooperative) => {
    setEditing(coop);
    setEditValues({
      name: coop.name,
      address: coop.address,
      voivodeship: coop.voivodeship,
      plannedPower: String(coop.plannedPower ?? 0),
      installedPower: String(coop.installedPower ?? 0),
      registrationDate: coop.registrationDate
        ? coop.registrationDate.slice(0, 10)
        : '',
      caregiverId: coop.caregiverId ? String(coop.caregiverId) : '',
      boardName: coop.boardName ?? '',
      boardEmail: coop.boardEmail ?? '',
      boardPhone: coop.boardPhone ?? '',
      status: coop.status,
    });
    setEditSelectedAreaIds([]);
    setEditMembers(
      (coop.members ?? []).map((m) => ({
        id: m.id,
        userId: m.id,
        fullName: m.fullName,
        status: m.status === 'aktywny' ? 'aktywny' : 'nieaktywny',
      })),
    );
    setActionError('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditMembers([]);
    setEditSelectedAreaIds([]);
  };

  const saveEdit = () => {
    if (!editing) return;

    const plannedPower = Number(editValues.plannedPower);
    const installedPower = Number(editValues.installedPower);
    const resolvedPlanned = Number.isFinite(plannedPower) ? plannedPower : editing.plannedPower;
    const resolvedInstalled = Number.isFinite(installedPower) ? installedPower : editing.installedPower;
    const resolvedStatus = editValues.status;

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
    if (editValues.name.trim() !== editing.name) patch.name = editValues.name.trim();
    if (editValues.address.trim() !== editing.address) patch.address = editValues.address.trim();
    if (editValues.voivodeship.trim() !== editing.voivodeship) patch.region = editValues.voivodeship.trim();
    if (resolvedStatus !== editing.status) patch.status = mapStatusToApi(resolvedStatus);
    if (resolvedPlanned !== editing.plannedPower) patch.ratedPower = resolvedPlanned;
    if (resolvedInstalled !== editing.installedPower) patch.installedPower = resolvedInstalled;
    if (editValues.boardName.trim() && editValues.boardName.trim() !== (editing.boardName ?? ''))
      patch.boardName = editValues.boardName.trim();
    if (editValues.boardEmail.trim() && editValues.boardEmail.trim() !== (editing.boardEmail ?? ''))
      patch.boardEmail = editValues.boardEmail.trim();
    if (editValues.boardPhone.trim() && editValues.boardPhone.trim() !== (editing.boardPhone ?? ''))
      patch.boardPhone = editValues.boardPhone.trim();
    if (editValues.registrationDate.trim())
      patch.registrationDate = editValues.registrationDate.trim();
    if (editMembers.length > 0) {
      patch.members = editMembers.map((m) => ({
        userId: m.userId,
        status: m.status === 'aktywny' ? 'AKTYWNY' : 'NIEAKTYWNY',
      }));
    }
    if (editSelectedAreaIds.length > 0) patch.areaIds = editSelectedAreaIds;

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
  const openDetails = (coop: Cooperative) => setDetailsCoop(coop);
  const closeDetails = () => setDetailsCoop(null);

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
      <button className="add-entity-btn" onClick={() => setCreateOpen(true)} type="button">
        <span>+</span>
        <span>Nowa spółdzielnia</span>
      </button>

      <section className="panel">
        <h3>Spółdzielnie energetyczne</h3>

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
              onViewDetails={openDetails}
            />
            {pagination}
          </>
        )}
      </section>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {createOpen ? (
        <div className="modal-backdrop" onClick={closeCreate}>
          <div className="modal-card coop-create-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Nowa spółdzielnia energetyczna</h3>
            <form className="add-entry-form coop-create-form" onSubmit={submitCreate}>
              <input
                id="coop-name"
                name="coop-name"
                value={createValues.name}
                onChange={(e) => setCreateValues((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Nazwa spółdzielni"
                className="coop-create-name-input"
              />

              <div className="coop-create-grid-2">
                <label htmlFor="coop-address">
                  Adres siedziby
                  <input
                    id="coop-address"
                    name="coop-address"
                    value={createValues.address}
                    onChange={(e) => setCreateValues((prev) => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </label>
                <label htmlFor="coop-voivodeship">
                  Województwo
                  <select
                    id="coop-voivodeship"
                    name="coop-voivodeship"
                    className="add-entry-select"
                    value={createValues.voivodeship}
                    onChange={(e) => setCreateValues((prev) => ({ ...prev, voivodeship: e.target.value }))}
                  >
                    {VOIVODESHIPS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="coop-create-grid-2">
                <label htmlFor="coop-planned-power">
                  Moc planowana (kW)
                  <input
                    id="coop-planned-power"
                    name="coop-planned-power"
                    type="number"
                    step="0.1"
                    min="0"
                    value={createValues.plannedPower}
                    onChange={(e) => setCreateValues((prev) => ({ ...prev, plannedPower: e.target.value }))}
                    required
                  />
                </label>
                <label htmlFor="coop-installed-power">
                  Moc zainstalowana (kWp)
                  <input
                    id="coop-installed-power"
                    name="coop-installed-power"
                    type="number"
                    step="0.1"
                    min="0"
                    value={createValues.installedPower}
                    onChange={(e) => setCreateValues((prev) => ({ ...prev, installedPower: e.target.value }))}
                  />
                </label>
              </div>

              <label htmlFor="coop-registration-date">
                Data rejestracji spółdzielni
                <input
                  id="coop-registration-date"
                  name="coop-registration-date"
                  type="date"
                  value={createValues.registrationDate}
                  onChange={(e) => setCreateValues((prev) => ({ ...prev, registrationDate: e.target.value }))}
                  required
                />
              </label>

              <label htmlFor="coop-caregiver-id">
                Opiekun
                <select
                  id="coop-caregiver-id"
                  name="coop-caregiver-id"
                  className="add-entry-select"
                  value={createValues.caregiverId}
                  onChange={(e) => setCreateValues((prev) => ({ ...prev, caregiverId: e.target.value }))}
                  required
                >
                  <option value="">— wybierz opiekuna —</option>
                  {caregivers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <div>
                <label>Tereny działania</label>
                <div className="coop-create-areas">
                  {areas.length === 0 ? (
                    <span className="coop-create-empty-areas">Brak terenów</span>
                  ) : (
                    areas.map((area) => (
                      <label key={area.id} className="coop-create-area-item" htmlFor={`area-${area.id}`}>
                        <input
                          id={`area-${area.id}`}
                          type="checkbox"
                          checked={selectedAreaIds.includes(area.id)}
                          onChange={(e) => {
                            setSelectedAreaIds((prev) =>
                              e.target.checked ? [...prev, area.id] : prev.filter((id) => id !== area.id),
                            );
                          }}
                        />
                        {area.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="coop-create-board">
                <p>Zarząd</p>
                <div className="coop-create-grid-3">
                  <label htmlFor="coop-board-name">
                    Imię i nazwisko
                    <input
                      id="coop-board-name"
                      name="coop-board-name"
                      value={createValues.boardName}
                      onChange={(e) => setCreateValues((prev) => ({ ...prev, boardName: e.target.value }))}
                      required
                    />
                  </label>
                  <label htmlFor="coop-board-email">
                    Email
                    <input
                      id="coop-board-email"
                      name="coop-board-email"
                      type="email"
                      value={createValues.boardEmail}
                      onChange={(e) => setCreateValues((prev) => ({ ...prev, boardEmail: e.target.value }))}
                      required
                    />
                  </label>
                  <label htmlFor="coop-board-phone">
                    Telefon
                    <input
                      id="coop-board-phone"
                      name="coop-board-phone"
                      value={createValues.boardPhone}
                      onChange={(e) => setCreateValues((prev) => ({ ...prev, boardPhone: e.target.value }))}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="coop-create-members-head">
                <p>Członkowie ({createMembers.length})</p>
                <button className="primary-btn" type="button" onClick={openMembersModalForCreate}>
                  + Dodaj / edytuj członków
                </button>
              </div>
              {createMembers.length === 0 ? (
                <p className="coop-create-members-empty">
                  Brak członków - dodaj pierwszego przyciskiem powyżej
                </p>
              ) : (
                <div className="coop-create-members-list">
                  {createMembers.map((member) => (
                    <div key={member.id} className="coop-create-member-row">
                      <div>
                        <strong>{member.fullName}</strong>
                        <span>{member.status}</span>
                      </div>
                      <div className="coop-create-member-actions">
                        <button type="button" className="table-action-btn" onClick={() => openMembersModalForEdit(member)}>
                          Edytuj
                        </button>
                        <button type="button" className="table-action-btn danger" onClick={() => { setMemberMode('create'); deleteMember(member.id); }}>
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-entry-actions coop-create-actions">
                <button className="primary-outline-btn" onClick={closeCreate} type="button">
                  Anuluj
                </button>
                <button className="primary-btn" type="submit" disabled={createSaving}>
                  {createSaving ? 'Zapisywanie...' : 'Zapisz spółdzielnię'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card coop-create-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Edytuj spółdzielnię</h3>
            <form className="add-entry-form coop-create-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
              <input
                value={editValues.name}
                onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Nazwa spółdzielni"
                className="coop-create-name-input"
              />

              <div className="coop-create-grid-2">
                <label htmlFor="edit-coop-address">
                  Adres siedziby
                  <input
                    id="edit-coop-address"
                    value={editValues.address}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </label>
                <label htmlFor="edit-coop-voivodeship">
                  Województwo
                  <select
                    id="edit-coop-voivodeship"
                    className="add-entry-select"
                    value={editValues.voivodeship}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, voivodeship: e.target.value }))}
                  >
                    {VOIVODESHIPS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="coop-create-grid-2">
                <label htmlFor="edit-coop-planned">
                  Planowana moc (kWp)
                  <input
                    id="edit-coop-planned"
                    value={editValues.plannedPower}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, plannedPower: e.target.value }))}
                    type="number"
                    step="0.1"
                  />
                </label>
                <label htmlFor="edit-coop-installed">
                  Moc zainstalowana (kWp)
                  <input
                    id="edit-coop-installed"
                    value={editValues.installedPower}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, installedPower: e.target.value }))}
                    type="number"
                    step="0.1"
                  />
                </label>
              </div>

              <label htmlFor="edit-coop-caregiver-id">
                Opiekun
                <select
                  id="edit-coop-caregiver-id"
                  className="add-entry-select"
                  value={editValues.caregiverId}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, caregiverId: e.target.value }))}
                >
                  <option value="">— wybierz opiekuna —</option>
                  {caregivers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <div>
                <label>Tereny działania</label>
                <div className="coop-create-areas">
                  {areas.length === 0 ? (
                    <span className="coop-create-empty-areas">Brak terenów</span>
                  ) : (
                    areas.map((area) => (
                      <label key={area.id} className="coop-create-area-item" htmlFor={`edit-area-${area.id}`}>
                        <input
                          id={`edit-area-${area.id}`}
                          type="checkbox"
                          checked={editSelectedAreaIds.includes(area.id)}
                          onChange={(e) => {
                            setEditSelectedAreaIds((prev) =>
                              e.target.checked ? [...prev, area.id] : prev.filter((id) => id !== area.id),
                            );
                          }}
                        />
                        {area.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="coop-create-board">
                <p>Zarząd</p>
                <div className="coop-create-grid-3">
                  <label htmlFor="edit-board-name">
                    Imię i nazwisko
                    <input
                      id="edit-board-name"
                      value={editValues.boardName}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, boardName: e.target.value }))}
                    />
                  </label>
                  <label htmlFor="edit-board-email">
                    Email
                    <input
                      id="edit-board-email"
                      type="email"
                      value={editValues.boardEmail}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, boardEmail: e.target.value }))}
                    />
                  </label>
                  <label htmlFor="edit-board-phone">
                    Telefon
                    <input
                      id="edit-board-phone"
                      value={editValues.boardPhone}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, boardPhone: e.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div className="coop-create-members-head">
                <p>Członkowie ({editMembers.length})</p>
                <button className="primary-btn" type="button" onClick={openMembersModalForEditCoop}>
                  + Dodaj / edytuj członków
                </button>
              </div>
              {editMembers.length === 0 ? (
                <p className="coop-create-members-empty">
                  Brak członków - dodaj pierwszego przyciskiem powyżej
                </p>
              ) : (
                <div className="coop-create-members-list">
                  {editMembers.map((member) => (
                    <div key={member.id} className="coop-create-member-row">
                      <div>
                        <strong>{member.fullName}</strong>
                        <span>{member.status}</span>
                      </div>
                      <div className="coop-create-member-actions">
                        <button type="button" className="table-action-btn" onClick={() => openMemberRowForEditCoop(member)}>
                          Edytuj
                        </button>
                        <button type="button" className="table-action-btn danger" onClick={() => { setMemberMode('edit'); deleteMember(member.id); }}>
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label htmlFor="edit-coop-status">
                Status
                <select
                  id="edit-coop-status"
                  className="add-entry-select"
                  value={editValues.status}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, status: e.target.value as Cooperative['status'] }))}
                >
                  <option value="planowana">Planowana</option>
                  <option value="w trakcie tworzenia">W trakcie tworzenia</option>
                  <option value="aktywna">Aktywna</option>
                  <option value="zawieszona">Zawieszona</option>
                </select>
              </label>

              <label htmlFor="edit-coop-registration-date">
                Data rejestracji spółdzielni
                <input
                  id="edit-coop-registration-date"
                  type="date"
                  value={editValues.registrationDate}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, registrationDate: e.target.value }))}
                />
              </label>

              <div className="add-entry-actions coop-create-actions">
                <button
                  className="table-action-btn danger"
                  onClick={() => handleDelete(editing.id)}
                  type="button"
                >
                  Usuń
                </button>
                <button className="primary-outline-btn" onClick={closeEdit} type="button">
                  Anuluj
                </button>
                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving ? 'Zapisuję...' : 'Zapisz spółdzielnię'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {memberModalOpen ? (
        <div className="modal-backdrop" onClick={() => setMemberModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{editingMemberId ? 'Edytuj członka' : 'Dodaj członka'}</h3>
            <form className="add-entry-form" onSubmit={saveMember}>
              <label htmlFor="member-user-id">
                Użytkownik
                <select
                  id="member-user-id"
                  className="add-entry-select"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  required
                >
                  <option value="">— wybierz użytkownika —</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="member-status">
                Status
                <select
                  id="member-status"
                  className="add-entry-select"
                  value={memberStatus}
                  onChange={(e) => setMemberStatus(e.target.value as 'aktywny' | 'nieaktywny')}
                >
                  <option value="aktywny">aktywny</option>
                  <option value="nieaktywny">nieaktywny</option>
                </select>
              </label>
              <div className="add-entry-actions">
                <button type="button" className="primary-outline-btn" onClick={() => setMemberModalOpen(false)}>
                  Anuluj
                </button>
                <button type="submit" className="primary-btn">
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsCoop ? (
        <div className="modal-backdrop" onClick={closeDetails}>
          <div
            className="modal-card coop-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* header */}
            <div className="coop-history-header">
              <div>
                <p className="coop-history-label">Szczegóły spółdzielni</p>
                <h3 className="coop-history-title">{detailsCoop.name}</h3>
              </div>
              <button className="coop-history-close" onClick={closeDetails} type="button" aria-label="Zamknij">
                ×
              </button>
            </div>

            {/* body */}
            <div className="coop-history-body coop-details-body">

              {/* row 1: address + region + status */}
              <div className="coop-details-grid-3">
                <div className="coop-details-field">
                  <span className="coop-details-label">Adres</span>
                  <span className="coop-details-value">{detailsCoop.address || '—'}</span>
                </div>
                <div className="coop-details-field">
                  <span className="coop-details-label">Region</span>
                  <span className="coop-details-value">{detailsCoop.voivodeship || '—'}</span>
                </div>
                <div className="coop-details-field">
                  <span className="coop-details-label">Status</span>
                  <span className={`coop-details-status-badge coop-details-status--${detailsCoop.status.replace(/\s+/g, '-')}`}>
                    {detailsCoop.status}
                  </span>
                </div>
              </div>

              {/* row 2: powers */}
              <div className="coop-details-grid-2">
                <div className="coop-details-power-card">
                  <span className="coop-details-power-label">Moc planowana</span>
                  <span className="coop-details-power-value">{detailsCoop.plannedPower} <small>kWp</small></span>
                </div>
                <div className="coop-details-power-card">
                  <span className="coop-details-power-label">Moc zainstalowana</span>
                  <span className="coop-details-power-value">
                    {detailsCoop.installedPower > 0 ? <>{detailsCoop.installedPower} <small>kWp</small></> : '—'}
                  </span>
                </div>
              </div>

              {/* section: zarząd */}
              <div className="coop-details-section">
                <p className="coop-details-section-title">Zarząd</p>
                <div className="coop-details-grid-3">
                  <div className="coop-details-field">
                    <span className="coop-details-label">Imię i nazwisko</span>
                    <span className="coop-details-value">{detailsCoop.boardName || '—'}</span>
                  </div>
                  <div className="coop-details-field">
                    <span className="coop-details-label">E-mail</span>
                    {detailsCoop.boardEmail
                      ? <a className="coop-details-link" href={`mailto:${detailsCoop.boardEmail}`}>{detailsCoop.boardEmail}</a>
                      : <span className="coop-details-value">—</span>}
                  </div>
                  <div className="coop-details-field">
                    <span className="coop-details-label">Telefon</span>
                    {detailsCoop.boardPhone
                      ? <a className="coop-details-link" href={`tel:${detailsCoop.boardPhone}`}>{detailsCoop.boardPhone}</a>
                      : <span className="coop-details-value">—</span>}
                  </div>
                </div>
              </div>

              {/* section: opiekun */}
              <div className="coop-details-section">
                <p className="coop-details-section-title">Opiekun</p>
                {detailsCoop.supervisor ? (
                  <div className="coop-details-grid-3">
                    <div className="coop-details-field">
                      <span className="coop-details-label">Imię i nazwisko</span>
                      <span className="coop-details-value">{detailsCoop.supervisor.name} {detailsCoop.supervisor.surname}</span>
                    </div>
                    <div className="coop-details-field">
                      <span className="coop-details-label">E-mail</span>
                      <a className="coop-details-link" href={`mailto:${detailsCoop.supervisor.email}`}>{detailsCoop.supervisor.email}</a>
                    </div>
                    <div className="coop-details-field">
                      <span className="coop-details-label">Telefon</span>
                      <a className="coop-details-link" href={`tel:${detailsCoop.supervisor.phoneNumber}`}>{detailsCoop.supervisor.phoneNumber}</a>
                    </div>
                  </div>
                ) : <p className="coop-details-empty">Brak opiekuna.</p>}
              </div>

              {/* section: obszary + czlonkowie side by side */}
              <div className="coop-details-grid-2">
                <div className="coop-details-section">
                  <p className="coop-details-section-title">Obszary ({detailsCoop.areas?.length ?? 0})</p>
                  {detailsCoop.areas && detailsCoop.areas.length > 0 ? (
                    <div className="coop-details-tag-list">
                      {detailsCoop.areas.map((area) => (
                        <span key={area.id} className="coop-details-tag">
                          {area.name}
                          <em>{area.region}</em>
                        </span>
                      ))}
                    </div>
                  ) : <p className="coop-details-empty">Brak obszarów.</p>}
                </div>

                <div className="coop-details-section">
                  <p className="coop-details-section-title">Członkowie ({detailsCoop.members.length})</p>
                  {detailsCoop.members.length > 0 ? (
                    <div className="coop-details-members-list">
                      {detailsCoop.members.map((member) => (
                        <div key={member.id} className="coop-details-member-row">
                          <span className="coop-details-member-avatar">
                            {member.fullName.charAt(0).toUpperCase()}
                          </span>
                          <span className="coop-details-value">{member.fullName}</span>
                          <span className={`coop-details-status-badge coop-details-status--${member.status.replace(/\s+/g, '-')}`}>
                            {member.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="coop-details-empty">Brak członków.</p>}
                </div>
              </div>

              {/* footer: meta */}
              <div className="coop-details-meta">
                {detailsCoop.createdBy && (
                  <span>
                    Utworzył: <strong>{detailsCoop.createdBy.name} {detailsCoop.createdBy.surname}</strong>
                  </span>
                )}
                {detailsCoop.registrationDate && (
                  <span>
                    Data rejestracji: <strong>{new Date(detailsCoop.registrationDate).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </span>
                )}
                {detailsCoop.createdAt && (
                  <span>
                    Dodano: <strong>{new Date(detailsCoop.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </span>
                )}
                {detailsCoop.updatedAt && detailsCoop.updatedAt !== detailsCoop.createdAt && (
                  <span>
                    Edytowano: <strong>{new Date(detailsCoop.updatedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </span>
                )}
              </div>

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
