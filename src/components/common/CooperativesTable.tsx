import type { Cooperative } from '@/types/domain';

interface CooperativesTableProps {
  cooperatives: Cooperative[];
  onEditCooperative?: (coop: Cooperative) => void;
}

export default function CooperativesTable({ cooperatives, onEditCooperative }: CooperativesTableProps) {
  const showActions = Boolean(onEditCooperative);

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Wojewodztwo</th>
            <th>Status</th>
            <th>Moc planowana</th>
            <th>Moc zainstalowana</th>
            {showActions ? <th>Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {cooperatives.map((coop) => (
            <tr key={coop.id}>
              <td>{coop.name}</td>
              <td>{coop.voivodeship}</td>
              <td>{coop.status}</td>
              <td>{coop.plannedPower}</td>
              <td>{coop.installedPower}</td>
              {showActions ? (
                <td>
                  <button className="table-action-btn" onClick={() => onEditCooperative?.(coop)} type="button">
                    Edytuj
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
          {cooperatives.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 6 : 5} className="empty-row">
                Brak spoldzielni
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
