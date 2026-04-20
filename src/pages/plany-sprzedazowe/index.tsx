import PlanySprzedazoweSection from '@/components/plany-sprzedazowe/PlanySprzedazoweSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function PlanySprzedazowePage() {
  const { db } = useAppData();
  return (
    <PlanySprzedazoweSection
      salesPlans={db.salesPlans}
      caregivers={db.caregivers}
    />
  );
}
