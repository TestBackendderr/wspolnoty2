import SpoldzielnieSection from '@/components/spoldzielnie/SpoldzielnieSection';
import type { Cooperative } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface SpoldzielniePageProps {
  cooperatives: Cooperative[];
  onAddCooperative: (values: AddEntryValues) => void;
  onUpdateCooperative?: (
    coopId: number,
    payload: Pick<Cooperative, 'status' | 'plannedPower' | 'installedPower'>,
  ) => void;
}

export default function SpoldzielniePage({
  cooperatives,
  onAddCooperative,
  onUpdateCooperative,
}: SpoldzielniePageProps) {
  return (
    <SpoldzielnieSection
      cooperatives={cooperatives}
      onAddCooperative={onAddCooperative}
      onUpdateCooperative={onUpdateCooperative}
    />
  );
}
