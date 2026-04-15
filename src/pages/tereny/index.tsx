import TerenySection from '@/components/tereny/TerenySection';
import type { AppDatabase } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface TerenyPageProps {
  db: AppDatabase;
  onAddArea: (values: AddEntryValues) => void;
}

export default function TerenyPage({ db, onAddArea }: TerenyPageProps) {
  return <TerenySection areas={db.areas} onAddArea={onAddArea} />;
}
