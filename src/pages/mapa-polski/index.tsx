import MapaPolskiSection from '@/components/mapa-polski/MapaPolskiSection';
import type { AppDatabase } from '@/types/domain';

interface MapaPolskiPageProps {
  db: AppDatabase;
  onSetVoivodeshipLead: (voivodeshipId: string, caregiverId: number | null) => void;
  onSetVoivodeshipAssignments: (
    voivodeshipId: string,
    cooperativeIds: number[],
    areaIds: number[],
  ) => void;
}

export default function MapaPolskiPage({
  db,
  onSetVoivodeshipLead,
  onSetVoivodeshipAssignments,
}: MapaPolskiPageProps) {
  return (
    <MapaPolskiSection
      db={db}
      onSetVoivodeshipLead={onSetVoivodeshipLead}
      onSetVoivodeshipAssignments={onSetVoivodeshipAssignments}
    />
  );
}
