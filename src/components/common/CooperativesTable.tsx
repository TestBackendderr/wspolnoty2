import type { Cooperative } from '@/types/domain';

interface CooperativesTableProps {
  cooperatives: Cooperative[];
  onEditCooperative?: (coop: Cooperative) => void;
  onViewHistory?: (coop: Cooperative) => void;
}

export default function CooperativesTable({
  cooperatives,
  onEditCooperative,
  onViewHistory,
}: CooperativesTableProps) {
  const showActions = Boolean(onEditCooperative) || Boolean(onViewHistory);

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Województwo</th>
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
              <td>{coop.plannedPower} kWp</td>
              <td>{coop.installedPower} kWp</td>
              {showActions ? (
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {onEditCooperative ? (
                      <button
                        className="table-action-btn"
                        onClick={() => onEditCooperative(coop)}
                        type="button"
                      >
                        Edytuj
                      </button>
                    ) : null}
                    {onViewHistory ? (
                      <button
                        className="table-action-btn"
                        onClick={() => onViewHistory(coop)}
                        type="button"
                      >
                        Historia
                      </button>
                    ) : null}
                  </div>
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
