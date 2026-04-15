import SpoldzielnieSection from '@/components/spoldzielnie/SpoldzielnieSection';
import type { Cooperative } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface SpoldzielniePageProps {
  cooperatives: Cooperative[];
  onAddCooperative: (values: AddEntryValues) => void;
}

export default function SpoldzielniePage({ cooperatives, onAddCooperative }: SpoldzielniePageProps) {
  return <SpoldzielnieSection cooperatives={cooperatives} onAddCooperative={onAddCooperative} />;
}
