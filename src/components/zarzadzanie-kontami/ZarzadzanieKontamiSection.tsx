import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import type { User } from '@/types/domain';

interface ZarzadzanieKontamiSectionProps {
  users: User[];
  onAddUser: (values: AddEntryValues) => void;
}

export default function ZarzadzanieKontamiSection({ users, onAddUser }: ZarzadzanieKontamiSectionProps) {
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
            { id: 'user-role', label: 'Rola', placeholder: 'admin / opiekun' },
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
              <th>Rola</th>
              <th>Powiadomienia</th>
            </tr>
          </thead>
          <tbody>
            {users.length ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`user-role-badge role-${normalizeRole(user.role)}`}>{user.role}</span>
                  </td>
                  <td>{user.notifications.length}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="empty-row">
                  Brak kont
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function normalizeRole(role: User['role']) {
  if (role === 'admin') return 'admin';
  if (role === 'caregiver' || role === 'opiekun') return 'opiekun';
  return 'default';
}
