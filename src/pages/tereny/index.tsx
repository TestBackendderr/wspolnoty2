import TerenySection from '@/components/tereny/TerenySection';
import type { AppDatabase } from '@/types/domain';

interface TerenyPageProps {
  db: AppDatabase;
}

export default function TerenyPage({ db }: TerenyPageProps) {
  return <TerenySection areas={db.areas.map((x) => `${x.name} (${x.voivodeship})`)} />;
}
