import { useState } from 'react';

import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import type { User } from '@/types/domain';

interface OpiekunowieSectionProps {
  caregivers: User[];
  onAddCaregiver: (values: AddEntryValues) => void;
  onUpdateCaregiver: (userId: number, payload: Pick<User, 'name' | 'email' | 'phone'>) => void;
  onToggleCaregiverBlocked: (userId: number) => void;
}

export default function OpiekunowieSection({
  caregivers,
  onAddCaregiver,
  onUpdateCaregiver,
  onToggleCaregiverBlocked,
}: OpiekunowieSectionProps) {
  const [editingCaregiver, setEditingCaregiver] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const openEditModal = (caregiver: User) => {
    setEditingCaregiver(caregiver);
    setEditName(caregiver.name);
    setEditPhone(caregiver.phone ?? '');
    setEditEmail(caregiver.email);
  };

  const closeEditModal = () => {
    setEditingCaregiver(null);
  };

  const saveEdit = () => {
    if (!editingCaregiver) return;
    if (!editName.trim()) return;
    if (!editEmail.trim()) return;
    onUpdateCaregiver(editingCaregiver.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
    });
    closeEditModal();
  };

  return (
    <section className="panel">
      <div className="section-head-with-action">
        <h3>Opiekunowie</h3>
        <AddEntryModal
          buttonLabel="Dodaj opiekuna"
          modalTitle="Dodaj opiekuna"
          fields={[
            { id: 'caregiver-first-name', label: 'Imie', placeholder: 'np. Jan' },
            { id: 'caregiver-last-name', label: 'Nazwisko', placeholder: 'np. Kowalski' },
            { id: 'caregiver-email', label: 'Email', type: 'email', placeholder: 'jan@example.com' },
            { id: 'caregiver-phone', label: 'Telefon', placeholder: '+48 500 000 000' },
          ]}
          onSubmit={onAddCaregiver}
        />
      </div>

      <div className="table-wrapper caregivers-table-wrap">
        <table className="caregivers-table">
          <thead>
            <tr>
              <th>Imie i nazwisko</th>
              <th>Telefon</th>
              <th>Email</th>
              <th>Status</th>
              <th className="actions-column">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {caregivers.length ? (
              caregivers.map((caregiver) => (
                <tr key={caregiver.id}>
                  <td>{caregiver.name}</td>
                  <td>{caregiver.phone || '—'}</td>
                  <td>{caregiver.email}</td>
                  <td>
                    <span
                      className={`user-role-badge ${
                        caregiver.isBlocked ? 'status-blocked-badge' : 'status-active-badge'
                      }`}
                    >
                      {caregiver.isBlocked ? 'zablokowany' : 'aktywny'}
                    </span>
                  </td>
                  <td className="caregiver-actions">
                    <button className="table-action-btn" onClick={() => openEditModal(caregiver)} type="button">
                      Edytuj
                    </button>
                    <button
                      className="table-action-btn danger"
                      onClick={() => onToggleCaregiverBlocked(caregiver.id)}
                      type="button"
                    >
                      {caregiver.isBlocked ? 'Odblokuj' : 'Zablokuj'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-row">
                  Brak danych
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCaregiver ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Edytuj opiekuna</h3>
            <div className="add-entry-form">
              <label htmlFor="edit-caregiver-name">
                Imie i nazwisko
                <input
                  id="edit-caregiver-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </label>
              <label htmlFor="edit-caregiver-phone">
                Telefon
                <input
                  id="edit-caregiver-phone"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                />
              </label>
              <label htmlFor="edit-caregiver-email">
                Email
                <input
                  id="edit-caregiver-email"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                />
              </label>
            </div>
            <p className="email-warning">
              Uwaga: zmiana emaila zmienia login opiekuna. Przekaz opiekunowi nowy email, poniewaz
              stary przestanie dzialac.
            </p>
            <div className="add-entry-actions">
              <button className="primary-outline-btn" onClick={closeEditModal} type="button">
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
