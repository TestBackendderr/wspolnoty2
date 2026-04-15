import SimpleListPanel from '@/components/common/SimpleListPanel';

interface ZarzadzanieKontamiSectionProps {
  users: string[];
}

export default function ZarzadzanieKontamiSection({ users }: ZarzadzanieKontamiSectionProps) {
  return <SimpleListPanel title="Zarzadzanie kontami" items={users} />;
}
