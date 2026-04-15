import CooperativesTable from '@/components/common/CooperativesTable';
import type { Cooperative } from '@/types/domain';

interface SpoldzielnieSectionProps {
  cooperatives: Cooperative[];
}

export default function SpoldzielnieSection({ cooperatives }: SpoldzielnieSectionProps) {
  return (
    <section className="panel">
      <h3>Spoldzielnie energetyczne</h3>
      <CooperativesTable cooperatives={cooperatives} />
    </section>
  );
}
