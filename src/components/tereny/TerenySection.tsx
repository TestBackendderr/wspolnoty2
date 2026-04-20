import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/providers/authContext';
import { VOIVODESHIPS } from '@/constants/voivodeships';
import {
  createArea,
  deleteArea,
  listAreas,
  updateArea,
} from '@/services/areas';
import { listUsers } from '@/services/users';
import type { Area, User } from '@/types/domain';

const PAGE_SIZE = 15;

interface EditState {
  name: string;
  type: string;
  postalCode: string;
  voivodeship: string;
  responsibleUserId: string;
}

export default function TerenySection() {
  const { currentUser } = useAuth();
  const canManageAreas = currentUser?.role === 'admin';
  const [areas, setAreas] = useState<Area[]>([]);
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filterRegion, setFilterRegion] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [listVersion, setListVersion] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addValues, setAddValues] = useState<EditState>({
    name: '',
    type: '',
    postalCode: '',
    voivodeship: '',
    responsibleUserId: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditState>({
    name: '',
    type: '',
    postalCode: '',
    voivodeship: '',
    responsibleUserId: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let targetPage = page;
      let result = await listAreas({
        page: targetPage,
        limit: PAGE_SIZE,
        ...(filterRegion ? { region: filterRegion } : {}),
        sortOrder,
      });

      if (result.totalPages >= 1 && targetPage > result.totalPages) {
        targetPage = result.totalPages;
        result = await listAreas({
          page: targetPage,
          limit: PAGE_SIZE,
          ...(filterRegion ? { region: filterRegion } : {}),
          sortOrder,
        });
      }

      setAreas(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      if (targetPage !== page) setPage(targetPage);
    } catch {
      setError('Nie udalo sie pobrac terenow.');
    } finally {
      setLoading(false);
    }
  }, [page, filterRegion, sortOrder, listVersion]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!canManageAreas) return;
    void (async () => {
      try {
        const result = await listUsers({
          page: 1,
          limit: 200,
          role: 'OPIEKUN',
          sortOrder: 'asc',
        });
        setCaregivers(result.data);
      } catch {
        setError('Nie udalo sie pobrac listy opiekunow.');
      }
    })();
  }, [canManageAreas]);

  const handleAddSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageAreas) return;
    if (!addValues.name.trim()) return;
    const responsibleUserId = addValues.responsibleUserId
      ? Number(addValues.responsibleUserId)
      : undefined;
    try {
      setAddLoading(true);
      await createArea({
        name: addValues.name.trim(),
        type: addValues.type.trim(),
        postalCode: addValues.postalCode.trim(),
        region: addValues.voivodeship,
        ...(responsibleUserId ? { responsibleUserId } : {}),
      });
      setError('');
      setAddOpen(false);
      setAddValues({
        name: '',
        type: '',
        postalCode: '',
        voivodeship: '',
        responsibleUserId: '',
      });
      setPage(1);
      setListVersion((v) => v + 1);
    } catch {
      setError('Nie udalo sie dodac terenu.');
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (area: Area) => {
    if (!canManageAreas) return;
    setEditId(area.id);
    setEditValues({
      name: area.name,
      type: area.type,
      postalCode: area.postalCode,
      voivodeship: area.voivodeship,
      responsibleUserId: area.responsibleUser ? String(area.responsibleUser.id) : '',
    });
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageAreas) return;
    if (editId === null) return;
    const responsibleUserId = editValues.responsibleUserId
      ? Number(editValues.responsibleUserId)
      : null;
    try {
      setEditLoading(true);
      const updated = await updateArea(editId, {
        name: editValues.name.trim(),
        type: editValues.type.trim(),
        postalCode: editValues.postalCode.trim(),
        region: editValues.voivodeship,
        responsibleUserId,
      });
      setAreas((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setError('');
      setEditId(null);
    } catch {
      setError('Nie udalo sie zaktualizowac terenu.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManageAreas) return;
    if (!window.confirm('Czy na pewno chcesz usunac ten teren?')) return;
    try {
      await deleteArea(id);
      setError('');
      setListVersion((v) => v + 1);
    } catch {
      setError('Nie udalo sie usunac terenu.');
    }
  };

  const tableColSpan = canManageAreas ? 6 : 5;

  const filterBar = (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
    >
      <select
        className="add-entry-select"
        value={filterRegion}
        onChange={(e) => {
          setPage(1);
          setFilterRegion(e.target.value);
        }}
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
      >
        <option value="">Wszystkie województwa</option>
        {VOIVODESHIPS.map((v) => (
          <option key={v} value={v}>
            {v}
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
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
      >
        <option value="desc">Najnowsze najpierw</option>
        <option value="asc">Najstarsze najpierw</option>
      </select>
    </div>
  );

  const pagination =
    totalPages > 1 ? (
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
        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Łącznie: {total} terenów
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
            Nastepna ›
          </button>
        </div>
      </div>
    ) : total > 0 ? (
      <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.75rem' }}>
        Łącznie: {total} terenów
      </p>
    ) : null;

  return (
    <section className="panel">
      <div className="section-head-with-action">
        <h3>Tereny ({total})</h3>
        {canManageAreas ? (
          <button
            className="add-entity-btn"
            onClick={() => setAddOpen(true)}
            type="button"
          >
            <span>+</span>
            <span>Dodaj teren</span>
          </button>
        ) : null}
      </div>

      {error ? <div className="email-warning">{error}</div> : null}

      {filterBar}

      {loading ? (
        <p style={{ padding: '1rem', color: '#9ca3af' }}>Ladowanie...</p>
      ) : (
        <>
          <div className="table-wrapper areas-table-wrap">
            <table className="areas-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Nazwa</th>
                  <th>Kod pocztowy</th>
                  <th>Wojewodztwo</th>
                  <th>Opiekun</th>
                  {canManageAreas ? <th>Akcje</th> : null}
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr key={area.id}>
                    <td>{area.type || '-'}</td>
                    <td>{area.name}</td>
                    <td>{area.postalCode || '-'}</td>
                    <td>{area.voivodeship || '-'}</td>
                    <td>
                      {area.responsibleUser
                        ? `${area.responsibleUser.name} ${area.responsibleUser.surname}`
                        : 'не назначен'}
                    </td>
                    {canManageAreas ? (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="table-action-btn"
                            onClick={() => openEdit(area)}
                            type="button"
                          >
                            Edytuj
                          </button>
                          <button
                            className="table-action-btn danger"
                            onClick={() => void handleDelete(area.id)}
                            type="button"
                          >
                            Usun
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="empty-row">
                      Brak terenow dla wybranych filtrow — dodaj pierwszy lub zmien
                      filtry.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {pagination}
        </>
      )}

      {/* Add modal */}
      {addOpen ? (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Dodaj teren</h3>
            <form className="add-entry-form" onSubmit={(e) => void handleAddSubmit(e)}>
              <label htmlFor="add-name">
                Nazwa terenu
                <input
                  id="add-name"
                  type="text"
                  value={addValues.name}
                  onChange={(e) =>
                    setAddValues((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="np. Teren A"
                  required
                />
              </label>
              <label htmlFor="add-type">
                Typ terenu
                <input
                  id="add-type"
                  type="text"
                  value={addValues.type}
                  onChange={(e) =>
                    setAddValues((p) => ({ ...p, type: e.target.value }))
                  }
                  placeholder="np. miejski"
                  required
                />
              </label>
              <label htmlFor="add-postal">
                Kod pocztowy
                <input
                  id="add-postal"
                  type="text"
                  value={addValues.postalCode}
                  onChange={(e) =>
                    setAddValues((p) => ({ ...p, postalCode: e.target.value }))
                  }
                  placeholder="00-000"
                  required
                />
              </label>
              <label htmlFor="add-region">
                Wojewodztwo
                <select
                  id="add-region"
                  value={addValues.voivodeship}
                  onChange={(e) =>
                    setAddValues((p) => ({ ...p, voivodeship: e.target.value }))
                  }
                  className="add-entry-select"
                  required
                >
                  <option value="">Wybierz</option>
                  {VOIVODESHIPS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="add-responsible-user">
                Opiekun (opcjonalnie)
                <select
                  id="add-responsible-user"
                  value={addValues.responsibleUserId}
                  onChange={(e) =>
                    setAddValues((p) => ({ ...p, responsibleUserId: e.target.value }))
                  }
                  className="add-entry-select"
                >
                  <option value="">Nie przypisuj</option>
                  {caregivers.map((caregiver) => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="add-entry-actions">
                <button
                  className="primary-outline-btn"
                  onClick={() => setAddOpen(false)}
                  type="button"
                >
                  Anuluj
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={addLoading}
                >
                  {addLoading ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit modal */}
      {editId !== null ? (
        <div className="modal-backdrop" onClick={() => setEditId(null)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Edytuj teren</h3>
            <form className="add-entry-form" onSubmit={(e) => void handleEditSubmit(e)}>
              <label htmlFor="edit-name">
                Nazwa terenu
                <input
                  id="edit-name"
                  type="text"
                  value={editValues.name}
                  onChange={(e) =>
                    setEditValues((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label htmlFor="edit-type">
                Typ terenu
                <input
                  id="edit-type"
                  type="text"
                  value={editValues.type}
                  onChange={(e) =>
                    setEditValues((p) => ({ ...p, type: e.target.value }))
                  }
                  required
                />
              </label>
              <label htmlFor="edit-postal">
                Kod pocztowy
                <input
                  id="edit-postal"
                  type="text"
                  value={editValues.postalCode}
                  onChange={(e) =>
                    setEditValues((p) => ({
                      ...p,
                      postalCode: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label htmlFor="edit-region">
                Wojewodztwo
                <select
                  id="edit-region"
                  value={editValues.voivodeship}
                  onChange={(e) =>
                    setEditValues((p) => ({
                      ...p,
                      voivodeship: e.target.value,
                    }))
                  }
                  className="add-entry-select"
                  required
                >
                  <option value="">Wybierz</option>
                  {VOIVODESHIPS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="edit-responsible-user">
                Opiekun (opcjonalnie)
                <select
                  id="edit-responsible-user"
                  value={editValues.responsibleUserId}
                  onChange={(e) =>
                    setEditValues((p) => ({
                      ...p,
                      responsibleUserId: e.target.value,
                    }))
                  }
                  className="add-entry-select"
                >
                  <option value="">Nie przypisuj</option>
                  {caregivers.map((caregiver) => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="add-entry-actions">
                <button
                  className="primary-outline-btn"
                  onClick={() => setEditId(null)}
                  type="button"
                >
                  Anuluj
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={editLoading}
                >
                  {editLoading ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
