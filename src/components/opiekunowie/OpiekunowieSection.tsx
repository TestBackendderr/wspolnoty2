import SimpleListPanel from '@/components/common/SimpleListPanel';

interface OpiekunowieSectionProps {
  caregivers: string[];
}

export default function OpiekunowieSection({ caregivers }: OpiekunowieSectionProps) {
  return <SimpleListPanel title="Opiekunowie" items={caregivers} />;
}
