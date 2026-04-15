import Card from '@/components/common/Card';
import StatCard from '@/components/common/StatCard';
import type { Cooperative, User } from '@/types/domain';

interface DashboardProps {
  currentUser: User;
  cooperatives: Cooperative[];
  onLogout: () => void;
}

export default function Dashboard({
  currentUser,
  cooperatives,
  onLogout,
}: DashboardProps) {
  const activeCoops = cooperatives.filter((coop) => coop.status === 'aktywna').length;
  const totalMembers = cooperatives.reduce(
    (sum, coop) => sum + (coop.members?.length ?? 0),
    0,
  );
  const totalInstalledPower = cooperatives.reduce(
    (sum, coop) => sum + (coop.installedPower ?? 0),
    0,
  );

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>System zarzadzania wspolnotami energetycznymi</p>
        </div>
        <button className="primary-outline-btn" onClick={onLogout} type="button">
          Wyloguj
        </button>
      </header>

      <section className="stats-grid">
        <StatCard label="Liczba spoldzielni" value={cooperatives.length} />
        <StatCard label="Aktywne spoldzielnie" value={activeCoops} />
        <StatCard label="Liczba czlonkow" value={totalMembers} />
        <StatCard
          label="Moc zainstalowana (kWp)"
          value={totalInstalledPower.toLocaleString('pl-PL')}
        />
      </section>

      <Card
        title="Ostatnio dodane spoldzielnie"
        action={<span className="badge-role">{currentUser.role}</span>}
      >
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
              {cooperatives.slice(0, 12).map((coop) => (
                <tr key={coop.id}>
                  <td>{coop.name}</td>
                  <td>{coop.voivodeship}</td>
                  <td>
                    <span className={`status-pill status-${normalizeStatus(coop.status)}`}>
                      {coop.status}
                    </span>
                  </td>
                  <td>{coop.plannedPower}</td>
                  <td>{coop.installedPower}</td>
                </tr>
              ))}
              {cooperatives.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Brak danych. Dane pojawia sie automatycznie po dopelnieniu bazy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}

function normalizeStatus(status: Cooperative['status']): string {
  if (status === 'w trakcie tworzenia') {
    return 'tworzenie';
  }
  return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}
