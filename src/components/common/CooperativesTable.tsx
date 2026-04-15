import type { Cooperative } from '@/types/domain';

interface CooperativesTableProps {
  cooperatives: Cooperative[];
}

export default function CooperativesTable({ cooperatives }: CooperativesTableProps) {
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
            </tr>
          ))}
          {cooperatives.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-row">
                Brak spoldzielni
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
