import { useState } from 'react';

import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import type { User } from '@/types/domain';

interface ZarzadzanieKontamiSectionProps {
  users: User[];
  onAddUser: (values: AddEntryValues) => void;
  onUpdateUser: (
    userId: number,
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password' | 'role' | 'isBlocked'>,
  ) => void;
  onDeleteUser?: (userId: number) => void;
}

export default function ZarzadzanieKontamiSection({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: ZarzadzanieKontamiSectionProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('opiekun');
  const [editBlocked, setEditBlocked] = useState(false);
  const [editError, setEditError] = useState('');

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

    setEditError('');
    onUpdateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      password: shouldChangePassword ? editNewPassword.trim() : editingUser.password,
      role: editRole,
      isBlocked: editBlocked,
    });
    closeEdit();
  };

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
          onSubmit={onAddUser}
        />
      </div>

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
                    <span className={`user-role-badge ${user.isBlocked ? 'status-blocked-badge' : 'status-active-badge'}`}>
                      {user.isBlocked ? 'Zablokowany' : 'Aktywny'}
                    </span>
                  </td>
                  <td>
                    <span className={`user-role-badge role-${normalizeRole(user.role)}`}>
                      {formatRole(user.role)}
                    </span>
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
              {onDeleteUser ? (
                <button
                  className="table-action-btn danger"
                  onClick={() => {
                    if (!editingUser) return;
                    onDeleteUser(editingUser.id);
                    closeEdit();
                  }}
                  type="button"
                >
                  Usun
                </button>
              ) : null}
              <button className="primary-outline-btn" onClick={closeEdit} type="button">
                Anuluj
              </button>
              <button className="primary-btn" onClick={saveEdit} type="button">
                Zapisz
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
