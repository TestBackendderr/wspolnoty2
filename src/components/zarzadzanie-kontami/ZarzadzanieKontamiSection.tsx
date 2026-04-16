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
}

export default function ZarzadzanieKontamiSection({
  users,
  onAddUser,
  onUpdateUser,
}: ZarzadzanieKontamiSectionProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('opiekun');
  const [editBlocked, setEditBlocked] = useState(false);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone ?? '');
    setEditPassword(user.password);
    setEditRole(user.role);
    setEditBlocked(Boolean(user.isBlocked));
  };

  const closeEdit = () => setEditingUser(null);

  const saveEdit = () => {
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) return;
    onUpdateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      password: editPassword.trim(),
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
            { id: 'user-name', label: 'Nazwa uzytkownika', placeholder: 'np. Jan Kowalski' },
            { id: 'user-email', label: 'Email', type: 'email', placeholder: 'jan@example.com' },
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
              <label htmlFor="edit-user-password">
                Haslo
                <input
                  id="edit-user-password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </label>
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
            <div className="add-entry-actions">
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
