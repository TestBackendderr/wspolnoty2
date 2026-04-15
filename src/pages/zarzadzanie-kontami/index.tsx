import ZarzadzanieKontamiSection from '@/components/zarzadzanie-kontami/ZarzadzanieKontamiSection';
import type { AppDatabase } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface ZarzadzanieKontamiPageProps {
  db: AppDatabase;
  onAddUser: (values: AddEntryValues) => void;
}

export default function ZarzadzanieKontamiPage({ db, onAddUser }: ZarzadzanieKontamiPageProps) {
  return <ZarzadzanieKontamiSection users={db.users} onAddUser={onAddUser} />;
}
