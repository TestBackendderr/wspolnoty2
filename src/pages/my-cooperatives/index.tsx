import SpoldzielnieSection from '@/components/spoldzielnie/SpoldzielnieSection';
import { useAppData } from '@/app/providers/appDataContext';

export default function MyCooperativesPage() {
  const { visibleCooperatives, handleAddCooperative, handleDeleteCooperative } =
    useAppData();

  return (
    <SpoldzielnieSection
      cooperatives={visibleCooperatives}
      onAddCooperative={handleAddCooperative}
      onDeleteCooperative={handleDeleteCooperative}
    />
  );
}
