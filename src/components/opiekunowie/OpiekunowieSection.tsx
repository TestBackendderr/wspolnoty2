import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { listUsers, updateUser } from '@/services/users';
import type { User } from '@/types/domain';

const PAGE_SIZE = 15;

function splitFullName(fullName: string): { name: string; surname: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { name: '', surname: '' };
  const [name, ...rest] = normalized.split(' ');
  return { name, surname: rest.join(' ') || 'Brak' };
}

export default function OpiekunowieSection() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  const [editingCaregiver, setEditingCaregiver] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const result = await listUsers({ page, limit: PAGE_SIZE, role: 'OPIEKUN', sortOrder });
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setFetchError('Nie udało się pobrać listy opiekunów.');
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openEditModal = (caregiver: User) => {
    setEditingCaregiver(caregiver);
    setEditName(caregiver.name);
    setEditPhone(caregiver.phone ?? '');
    setEditEmail(caregiver.email);
    setActionError('');
  };

  const closeEditModal = () => {
    setEditingCaregiver(null);
  };

  const saveEdit = () => {
    if (!editingCaregiver) return;
    if (!editName.trim() || !editEmail.trim()) return;

    const split = splitFullName(editName.trim());
    setSaving(true);
    void (async () => {
      setActionError('');
      try {
        await updateUser(editingCaregiver.id, {
          name: split.name,
          surname: split.surname,
          email: editEmail.trim(),
          phoneNumber: editPhone.trim(),
        });
        closeEditModal();
        await fetchUsers();
      } catch {
        setActionError('Nie udało się zaktualizować opiekuna.');
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <section className="panel">
      <div className="section-head-with-action">
        <h3>Opiekunowie</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="add-entry-select"
            value={sortOrder}
            onChange={(e) => {
              setPage(1);
              setSortOrder(e.target.value as 'asc' | 'desc');
            }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
          >
            <option value="desc">Najnowsi najpierw</option>
            <option value="asc">Najstarsi najpierw</option>
          </select>
          <button
            className="add-entity-btn"
            onClick={() => navigate('/users-management?addAccount=1')}
            type="button"
          >
            <span>+</span>
            <span>Dodaj opiekuna</span>
          </button>
        </div>
      </div>

      {actionError ? <p className="email-warning">{actionError}</p> : null}

      {loading ? (
        <p style={{ padding: '1rem', color: 'var(--text-muted, #888)' }}>Ładowanie...</p>
      ) : fetchError ? (
        <p className="email-warning">{fetchError}</p>
      ) : (
        <>
          <div className="table-wrapper caregivers-table-wrap">
            <table className="caregivers-table">
              <thead>
                <tr>
                  <th>Imię i nazwisko</th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th className="actions-column">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((caregiver) => (
                    <tr key={caregiver.id}>
                      <td>{caregiver.name}</td>
                      <td>{caregiver.phone || '—'}</td>
                      <td>{caregiver.email}</td>
                      <td className="caregiver-actions">
                        <button
                          className="table-action-btn"
                          onClick={() => openEditModal(caregiver)}
                          type="button"
                        >
                          Edytuj
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Brak danych
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted, #888)' }}>
                Łącznie: {total} opiekunów
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="primary-outline-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  ‹ Poprzednia
                </button>
                <span style={{ fontSize: '0.875rem' }}>
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
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #888)', marginTop: '0.75rem' }}>
              Łącznie: {total} opiekunów
            </p>
          ) : null}
        </>
      )}

      {editingCaregiver ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Edytuj opiekuna</h3>
            <div className="add-entry-form">
              <label htmlFor="edit-caregiver-name">
                Imię i nazwisko
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
              Uwaga: zmiana emaila zmienia login opiekuna. Przekaż opiekunowi nowy email, ponieważ
              stary przestanie działać.
            </p>
            <div className="add-entry-actions">
              <button className="primary-outline-btn" onClick={closeEditModal} type="button">
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
