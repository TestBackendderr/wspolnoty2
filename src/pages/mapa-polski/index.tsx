import MapaPolskiSection from '@/components/mapa-polski/MapaPolskiSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function MapaPolskiPage() {
  const { db, handleSetVoivodeshipLead, handleSetVoivodeshipAssignments } =
    useAppData();

  return (
    <MapaPolskiSection
      db={db}
      onSetVoivodeshipLead={handleSetVoivodeshipLead}
      onSetVoivodeshipAssignments={handleSetVoivodeshipAssignments}
    />
  );
}
