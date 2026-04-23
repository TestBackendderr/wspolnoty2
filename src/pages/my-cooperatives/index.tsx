import SpoldzielnieSection from '@/components/spoldzielnie/SpoldzielnieSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function MyCooperativesPage() {
  const { visibleCooperatives, handleDeleteCooperative } =
    useAppData();

  return (
    <SpoldzielnieSection
      cooperatives={visibleCooperatives}
      onDeleteCooperative={handleDeleteCooperative}
    />
  );
}
