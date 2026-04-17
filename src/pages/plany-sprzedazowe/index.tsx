import PlanySprzedazoweSection from '@/components/plany-sprzedazowe/PlanySprzedazoweSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function PlanySprzedazowePage() {
  const { db, visibleCooperatives } = useAppData();
  return (
    <PlanySprzedazoweSection
      cooperatives={visibleCooperatives}
      caregivers={db.caregivers}
    />
  );
}
