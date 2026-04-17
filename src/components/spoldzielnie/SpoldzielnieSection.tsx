import { useState } from 'react';

import CooperativesTable from '@/components/common/CooperativesTable';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import { VOIVODESHIPS } from '@/constants/voivodeships';
import type { Cooperative } from '@/types/domain';

interface SpoldzielnieSectionProps {
  cooperatives: Cooperative[];
  onAddCooperative: (values: AddEntryValues) => void;
  onUpdateCooperative?: (
    coopId: number,
    payload: Pick<Cooperative, 'status' | 'plannedPower' | 'installedPower'>,
  ) => void;
  onDeleteCooperative?: (coopId: number) => void;
}

export default function SpoldzielnieSection({
  cooperatives,
  onAddCooperative,
  onUpdateCooperative,
  onDeleteCooperative,
}: SpoldzielnieSectionProps) {
  const [editing, setEditing] = useState<Cooperative | null>(null);
  const [editStatus, setEditStatus] = useState<Cooperative['status']>('planowana');
  const [editPlanned, setEditPlanned] = useState<string>('0');
  const [editInstalled, setEditInstalled] = useState<string>('0');

  const openEdit = (coop: Cooperative) => {
    if (!onUpdateCooperative) return;
    setEditing(coop);
    setEditStatus(coop.status);
    setEditPlanned(String(coop.plannedPower ?? 0));
    setEditInstalled(String(coop.installedPower ?? 0));
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!editing || !onUpdateCooperative) return;
    const plannedPower = Number(editPlanned);
    const installedPower = Number(editInstalled);
    onUpdateCooperative(editing.id, {
      status: editStatus,
      plannedPower: Number.isFinite(plannedPower) ? plannedPower : editing.plannedPower,
      installedPower: Number.isFinite(installedPower) ? installedPower : editing.installedPower,
    });
    closeEdit();
  };

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
        onSubmit={onAddCooperative}
      />
      <section className="panel">
        <h3>Spoldzielnie energetyczne</h3>
        <CooperativesTable cooperatives={cooperatives} onEditCooperative={onUpdateCooperative ? openEdit : undefined} />
      </section>

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
                  <option value="aktywna">aktywny</option>
                  <option value="w trakcie tworzenia">w trakcie tworzenia</option>
                  <option value="planowana">planowana</option>
                  <option value="zawieszona">zawieszona</option>
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
              {onDeleteCooperative ? (
                <button
                  className="table-action-btn danger"
                  onClick={() => {
                    onDeleteCooperative(editing.id);
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
    </>
  );
}
