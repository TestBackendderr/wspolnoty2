import PlanySprzedazoweSection from '@/components/plany-sprzedazowe/PlanySprzedazoweSection';
import type { Cooperative, User } from '@/types/domain';

interface PlanySprzedazowePageProps {
  cooperatives: Cooperative[];
  caregivers: User[];
}

export default function PlanySprzedazowePage({ cooperatives, caregivers }: PlanySprzedazowePageProps) {
  return <PlanySprzedazoweSection cooperatives={cooperatives} caregivers={caregivers} />;
}
