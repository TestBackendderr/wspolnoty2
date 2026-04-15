import CooperativesTable from '@/components/common/CooperativesTable';
import type { AppDatabase, Cooperative } from '@/types/domain';

interface DashboardSectionProps {
  db: AppDatabase;
  cooperatives: Cooperative[];
}

export default function DashboardSection({ db, cooperatives }: DashboardSectionProps) {
  const totalCoops = cooperatives.length;
  const activeCoops = cooperatives.filter((c) => c.status === 'aktywna').length;
  const totalCaregivers = db.caregivers.length;
  const totalAreas = db.areas.length;
  const totalInstalledPower = cooperatives.reduce((sum, item) => sum + (item.installedPower ?? 0), 0);

  const memberCounts = cooperatives.reduce(
    (acc, coop) => {
      coop.members.forEach((member) => {
        const status = member.status.toLowerCase();
        if (status.includes('aktywn')) acc.active += 1;
        else if (status.includes('rejestrow')) acc.registering += 1;
        else acc.inactive += 1;
      });
      return acc;
    },
    { active: 0, registering: 0, inactive: 0 },
  );
  const totalMembers = memberCounts.active + memberCounts.registering + memberCounts.inactive;
  const activePercent = totalMembers ? (memberCounts.active / totalMembers) * 100 : 0;
  const registeringPercent = totalMembers ? (memberCounts.registering / totalMembers) * 100 : 0;
  const inactivePercent = totalMembers ? (memberCounts.inactive / totalMembers) * 100 : 0;
  const donutStyle = {
    background: `conic-gradient(
      #10b981 0% ${activePercent}%,
      #f59e0b ${activePercent}% ${activePercent + registeringPercent}%,
      #6b7280 ${activePercent + registeringPercent}% 100%
    )`,
  };

  const voivodeshipData = cooperatives.reduce<Record<string, number>>((acc, coop) => {
    const key = coop.voivodeship || 'nieokreslone';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const voivodeshipBars = Object.entries(voivodeshipData).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxVoivodeshipValue = voivodeshipBars.length > 0 ? voivodeshipBars[0][1] : 1;

  const latestCooperatives = [...cooperatives].sort((a, b) => b.id - a.id).slice(0, 6);

  return (
    <>
      <section className="dashboard-grid">
        <article className="dashboard-kpi-card">
          <p>Spoldzielnie</p>
          <strong>{totalCoops}</strong>
          <small>{activeCoops} aktywnych</small>
        </article>
        <article className="dashboard-kpi-card">
          <p>Opiekunowie</p>
          <strong>{totalCaregivers}</strong>
        </article>
        <article className="dashboard-kpi-card">
          <p>Tereny</p>
          <strong>{totalAreas}</strong>
        </article>
        <article className="dashboard-kpi-card">
          <p>Calkowita zainstalowana moc</p>
          <strong>{totalInstalledPower} kWp</strong>
        </article>

        <article className="dashboard-panel dashboard-members-panel">
          <h3>Struktura wszystkich czlonkow w systemie</h3>
          <div className="members-donut-layout">
            <div className="members-donut" style={donutStyle}>
              <div className="members-donut-center">
                <strong>{totalMembers}</strong>
                <span>Czlonkowie</span>
              </div>
            </div>
            <div className="members-legend">
              <div className="members-legend-row">
                <span className="members-legend-dot active" />
                <span>Aktywni</span>
                <strong>
                  {memberCounts.active} ({activePercent.toFixed(0)}%)
                </strong>
              </div>
              <div className="members-legend-row">
                <span className="members-legend-dot registering" />
                <span>Rejestrowani</span>
                <strong>
                  {memberCounts.registering} ({registeringPercent.toFixed(0)}%)
                </strong>
              </div>
              <div className="members-legend-row">
                <span className="members-legend-dot inactive" />
                <span>Nieaktywni</span>
                <strong>
                  {memberCounts.inactive} ({inactivePercent.toFixed(0)}%)
                </strong>
              </div>
            </div>
          </div>
        </article>

        <article className="dashboard-panel dashboard-voivodeship-panel">
          <h3>Liczba spoldzielni w wojewodztwach</h3>
          {voivodeshipBars.length ? (
            <div className="voivodeship-bars">
              {voivodeshipBars.map(([name, count]) => (
                <div className="voivodeship-row" key={name}>
                  <span>{name}</span>
                  <div className="voivodeship-bar-track">
                    <div
                      className="voivodeship-bar-fill"
                      style={{ width: `${(count / maxVoivodeshipValue) * 100}%` }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-row">Brak danych do wykresu.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <h3>Ostatnio dodane spoldzielnie</h3>
        {latestCooperatives.length ? (
          <div className="latest-coops-grid">
            {latestCooperatives.map((coop) => (
              <article className="latest-coop-card" key={coop.id}>
                <div className="latest-coop-top">
                  <strong>{coop.name}</strong>
                  <span className={`status-badge status-${normalizeStatus(coop.status)}`}>{coop.status}</span>
                </div>
                <p>{coop.voivodeship}</p>
                <small>
                  Planowana moc: {coop.plannedPower} kWp | Zainstalowana: {coop.installedPower} kWp
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-row">Brak spoldzielni energetycznych. Dodaj pierwsza w sekcji Spoldzielnie.</p>
        )}
      </section>

      <section className="panel">
        <h3>Tabela spoldzielni</h3>
        <CooperativesTable cooperatives={cooperatives} />
      </section>
    </>
  );
}

function normalizeStatus(status: Cooperative['status']) {
  if (status === 'w trakcie tworzenia') return 'w-trakcie-tworzenia';
  return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}
