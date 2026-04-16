import ZarzadzanieKontamiSection from '@/components/zarzadzanie-kontami/ZarzadzanieKontamiSection';
import type { AppDatabase, User } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface ZarzadzanieKontamiPageProps {
  db: AppDatabase;
  onAddUser: (values: AddEntryValues) => void;
  onUpdateUser: (
    userId: number,
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password' | 'role' | 'isBlocked'>,
  ) => void;
}

export default function ZarzadzanieKontamiPage({
  db,
  onAddUser,
  onUpdateUser,
}: ZarzadzanieKontamiPageProps) {
  return <ZarzadzanieKontamiSection users={db.users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} />;
}
