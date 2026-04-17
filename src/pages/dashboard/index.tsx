import DashboardSection from '@/components/dashboard/DashboardSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function DashboardPage() {
  const { db, visibleCooperatives } = useAppData();
  return <DashboardSection db={db} cooperatives={visibleCooperatives} />;
}
