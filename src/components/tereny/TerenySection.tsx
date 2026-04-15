import SimpleListPanel from '@/components/common/SimpleListPanel';

interface TerenySectionProps {
  areas: string[];
}

export default function TerenySection({ areas }: TerenySectionProps) {
  return <SimpleListPanel title="Tereny" items={areas} />;
}
