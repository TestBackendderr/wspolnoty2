import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import {
  blockUser,
  createUser,
  deleteUser,
  listUsers,
  mapRoleToApi,
  unblockUser,
  updateUser,
  type ApiUserRole,
} from '@/services/users';
import type { User, UserRole } from '@/types/domain';

const PAGE_SIZE = 15;

function splitFullName(fullName: string): { name: string; surname: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { name: '', surname: '' };
  const [name, ...rest] = normalized.split(' ');
  return { name, surname: rest.join(' ') || 'Brak' };
}

const ROLE_FILTER_OPTIONS: { label: string; value: ApiUserRole | '' }[] = [
  { label: 'Wszystkie role', value: '' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Opiekun', value: 'OPIEKUN' },
];

export default function ZarzadzanieKontamiSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [addAccountFromButton, setAddAccountFromButton] = useState(false);
  const addAccountFromUrl = searchParams.get('addAccount') === '1';
  const addAccountModalOpen = addAccountFromUrl || addAccountFromButton;

  const handleAddModalOpenChange = (open: boolean) => {
    if (open) {
      setAddAccountFromButton(true);
      return;
    }
    setAddAccountFromButton(false);
    if (searchParams.get('addAccount') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('addAccount');
      setSearchParams(next, { replace: true });
    }
  };

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filterRole, setFilterRole] = useState<ApiUserRole | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('opiekun');
  const [editBlocked, setEditBlocked] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const result = await listUsers({
        page,
        limit: PAGE_SIZE,
        ...(filterRole ? { role: filterRole } : {}),
        sortOrder,
      });
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setFetchError('Nie udało się pobrać listy kont.');
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, sortOrder]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = (values: AddEntryValues) => {
    const name = (values['user-name'] ?? '').trim();
    const surname = (values['user-surname'] ?? '').trim();
    const email = (values['user-email'] ?? '').trim();
    const phoneNumber = (values['user-phone'] ?? '').trim();
    if (!name || !surname || !email || !phoneNumber) return;

    const rawRole = (values['user-role'] ?? '').trim().toLowerCase();
    const role: UserRole = rawRole === 'admin' ? 'admin' : 'opiekun';
    const password = (values['user-password'] ?? '').trim() || 'haslo123';

    void (async () => {
      setActionError('');
      try {
        await createUser({
          name,
          surname,
          email,
          phoneNumber,
          password,
          role: mapRoleToApi(role),
        });
        setPage(1);
        await fetchUsers();
      } catch {
        setActionError('Nie udało się utworzyć konta.');
      }
    })();
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone ?? '');
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditRole(user.role);
    setEditBlocked(Boolean(user.isBlocked));
    setEditError('');
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditError('');
  };

  const saveEdit = () => {
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Uzupelnij imie i e-mail.');
      return;
    }

    const shouldChangePassword = editNewPassword.trim().length > 0 || editConfirmPassword.trim().length > 0;
    if (shouldChangePassword) {
      if (!editNewPassword.trim() || !editConfirmPassword.trim()) {
        setEditError('Wypelnij oba pola nowego hasla.');
        return;
      }
      if (editNewPassword !== editConfirmPassword) {
        setEditError('Nowe hasla nie sa takie same.');
        return;
      }
    }

    const current = editingUser;
    const split = splitFullName(editName.trim() || current.name);

    setSaving(true);
    void (async () => {
      setEditError('');
      try {
        await updateUser(current.id, {
          name: split.name || editName.trim() || current.name,
          surname: split.surname || 'Brak',
          email: editEmail.trim() || current.email,
          phoneNumber: editPhone.trim(),
          role: mapRoleToApi(editRole),
          ...(shouldChangePassword ? { password: editNewPassword.trim() } : {}),
        });

        if (Boolean(editBlocked) !== Boolean(current.isBlocked)) {
          if (editBlocked) await blockUser(current.id);
          else await unblockUser(current.id);
        }

        closeEdit();
        await fetchUsers();
      } catch {
        setEditError('Nie udało się zapisać zmian.');
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDeleteUser = (userId: number) => {
    void (async () => {
      try {
        await deleteUser(userId);
        closeEdit();
        await fetchUsers();
      } catch {
        setEditError('Nie udało się usunąć konta.');
      }
    })();
  };

  const filterBar = (
    <div className="users-mgmt-toolbar">
      <select
        className="add-entry-select"
        value={filterRole}
        onChange={(e) => {
          setPage(1);
          setFilterRole(e.target.value as ApiUserRole | '');
        }}
      >
        {ROLE_FILTER_OPTIONS.map((o) => (
          <option key={o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className="add-entry-select"
        value={sortOrder}
        onChange={(e) => {
          setPage(1);
          setSortOrder(e.target.value as 'asc' | 'desc');
        }}
      >
        <option value="desc">Data rejestracji: najnowsi</option>
        <option value="asc">Data rejestracji: najstarsi</option>
      </select>
    </div>
  );

  const pagination =
    totalPages > 1 ? (
      <div className="users-mgmt-pagination">
        <span className="users-mgmt-count">Łącznie: {total} kont</span>
        <div className="users-mgmt-pagination-btns">
          <button className="primary-outline-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
            ‹ Poprzednia
          </button>
          <span className="users-mgmt-page-indicator">
            {page} / {totalPages}
          </span>
          <button
            className="primary-outline-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Następna ›
          </button>
        </div>
      </div>
    ) : total > 0 ? (
      <p className="users-mgmt-count-only">Łącznie: {total} kont</p>
    ) : null;

  return (
    <section className="panel">
      <div className="section-head-with-action">
        <h3>Zarzadzanie kontami</h3>
        <AddEntryModal
          buttonLabel="Dodaj nowe konto"
          modalTitle="Dodaj nowe konto"
          fields={[
            { id: 'user-name', label: 'Imie', placeholder: 'Jan' },
            { id: 'user-surname', label: 'Nazwisko', placeholder: 'Kowalski' },
            { id: 'user-email', label: 'Email', type: 'email', placeholder: 'jan@example.com' },
            { id: 'user-phone', label: 'Telefon', placeholder: '+48 600 123 456' },
            { id: 'user-role', label: 'Rola', options: ['Admin', 'Opiekun'] },
            { id: 'user-password', label: 'Haslo tymczasowe', placeholder: 'haslo123' },
          ]}
          open={addAccountModalOpen}
          onOpenChange={handleAddModalOpenChange}
          onSubmit={handleAddUser}
        />
      </div>

      {actionError ? <p className="email-warning users-mgmt-banner">{actionError}</p> : null}

      {filterBar}

      {loading ? (
        <p className="users-mgmt-loading">Ładowanie...</p>
      ) : fetchError ? (
        <p className="email-warning">{fetchError}</p>
      ) : (
        <>
          <div className="table-wrapper users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Imie</th>
                  <th>Email</th>
                  <th>Numer</th>
                  <th>Status</th>
                  <th>Rola</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || '—'}</td>
                      <td>
                        <span
                          className={`user-role-badge ${user.isBlocked ? 'status-blocked-badge' : 'status-active-badge'}`}
                        >
                          {user.isBlocked ? 'Zablokowany' : 'Aktywny'}
                        </span>
                      </td>
                      <td>
                        <span className={`user-role-badge role-${normalizeRole(user.role)}`}>{formatRole(user.role)}</span>
                      </td>
                      <td>
                        <button className="table-action-btn" onClick={() => openEdit(user)} type="button">
                          Edytuj
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Brak kont
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination}
        </>
      )}

      {editingUser ? (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Edytuj konto</h3>
            <div className="add-entry-form">
              <label htmlFor="edit-user-name">
                Imie i nazwisko
                <input id="edit-user-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
              <label htmlFor="edit-user-email">
                Poczta
                <input
                  id="edit-user-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </label>
              <label htmlFor="edit-user-phone">
                Numer
                <input id="edit-user-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </label>
              <div className="account-password-section">
                <strong>Zmien haslo (opcjonalnie)</strong>
                <label htmlFor="edit-user-password">
                  Nowe haslo
                  <input
                    id="edit-user-password"
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Wpisz nowe haslo"
                  />
                </label>
                <label htmlFor="edit-user-password-confirm">
                  Powtorz nowe haslo
                  <input
                    id="edit-user-password-confirm"
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder="Powtorz nowe haslo"
                  />
                </label>
              </div>
              <label htmlFor="edit-user-role">
                Rola
                <select
                  id="edit-user-role"
                  className="add-entry-select"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as User['role'])}
                >
                  <option value="admin">Admin</option>
                  <option value="opiekun">Opiekun</option>
                </select>
              </label>
              <label htmlFor="edit-user-blocked">
                Blokada
                <select
                  id="edit-user-blocked"
                  className="add-entry-select"
                  value={editBlocked ? 'yes' : 'no'}
                  onChange={(e) => setEditBlocked(e.target.value === 'yes')}
                >
                  <option value="no">Nie</option>
                  <option value="yes">Tak</option>
                </select>
              </label>
            </div>
            {editError ? <p className="form-error">{editError}</p> : null}
            <div className="add-entry-actions">
              <button
                className="table-action-btn danger"
                onClick={() => handleDeleteUser(editingUser.id)}
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
    </section>
  );
}

function normalizeRole(role: User['role']) {
  if (role === 'admin') return 'admin';
  if (role === 'caregiver' || role === 'opiekun') return 'opiekun';
  return 'default';
}

function formatRole(role: User['role']) {
  if (role === 'admin') return 'Admin';
  return 'Opiekun';
}
