import ZarzadzanieKontamiSection from '@/components/zarzadzanie-kontami/ZarzadzanieKontamiSection';
import type { AppDatabase } from '@/types/domain';

interface ZarzadzanieKontamiPageProps {
  db: AppDatabase;
}

export default function ZarzadzanieKontamiPage({ db }: ZarzadzanieKontamiPageProps) {
  return <ZarzadzanieKontamiSection users={db.users.map((x) => `${x.name} (${x.role})`)} />;
}
