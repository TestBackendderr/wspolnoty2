import DashboardSection from '@/components/dashboard/DashboardSection';
import type { AppDatabase, Cooperative } from '@/types/domain';

interface DashboardPageProps {
  db: AppDatabase;
  cooperatives: Cooperative[];
}

export default function DashboardPage({ db, cooperatives }: DashboardPageProps) {
  return <DashboardSection db={db} cooperatives={cooperatives} />;
}
