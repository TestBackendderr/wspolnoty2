import MapaPolskiSection from '@/components/mapa-polski/MapaPolskiSection';
import type { AppDatabase } from '@/types/domain';

interface MapaPolskiPageProps {
  db: AppDatabase;
}

export default function MapaPolskiPage({ db }: MapaPolskiPageProps) {
  return <MapaPolskiSection db={db} />;
}
