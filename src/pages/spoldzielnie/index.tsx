import SpoldzielnieSection from '@/components/spoldzielnie/SpoldzielnieSection';
import type { Cooperative } from '@/types/domain';

interface SpoldzielniePageProps {
  cooperatives: Cooperative[];
}

export default function SpoldzielniePage({ cooperatives }: SpoldzielniePageProps) {
  return <SpoldzielnieSection cooperatives={cooperatives} />;
}
