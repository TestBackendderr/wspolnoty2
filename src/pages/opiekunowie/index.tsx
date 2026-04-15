import OpiekunowieSection from '@/components/opiekunowie/OpiekunowieSection';
import type { AppDatabase } from '@/types/domain';

interface OpiekunowiePageProps {
  db: AppDatabase;
}

export default function OpiekunowiePage({ db }: OpiekunowiePageProps) {
  return <OpiekunowieSection caregivers={db.caregivers.map((x) => x.name)} />;
}
