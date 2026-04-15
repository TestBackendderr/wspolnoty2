import CooperativesTable from '@/components/common/CooperativesTable';
import type { AppDatabase, Cooperative } from '@/types/domain';

interface DashboardSectionProps {
  db: AppDatabase;
  cooperatives: Cooperative[];
}

export default function DashboardSection({ db, cooperatives }: DashboardSectionProps) {
  return (
    <>
      <section className="stats-grid">
        <article className="stat-card">
          <p>Spoldzielnie</p>
          <strong>{cooperatives.length}</strong>
        </article>
        <article className="stat-card">
          <p>Opiekunowie</p>
          <strong>{db.caregivers.length}</strong>
        </article>
        <article className="stat-card">
          <p>Tereny</p>
          <strong>{db.areas.length}</strong>
        </article>
        <article className="stat-card">
          <p>Zainstalowana moc</p>
          <strong>{cooperatives.reduce((sum, item) => sum + (item.installedPower ?? 0), 0)} kWp</strong>
        </article>
      </section>
      <section className="panel">
        <h3>Ostatnie spoldzielnie</h3>
        <CooperativesTable cooperatives={cooperatives} />
      </section>
    </>
  );
}
