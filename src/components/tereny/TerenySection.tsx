import SimpleListPanel from '@/components/common/SimpleListPanel';
import AddEntryModal from '@/components/common/AddEntryModal';

interface TerenySectionProps {
  areas: string[];
}

export default function TerenySection({ areas }: TerenySectionProps) {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj teren"
        modalTitle="Dodaj teren"
        fields={[
          { id: 'area-name', label: 'Nazwa terenu', placeholder: 'np. Teren A' },
          { id: 'area-type', label: 'Typ terenu', placeholder: 'np. Miasto' },
          { id: 'area-postal', label: 'Kod pocztowy', placeholder: '00-000' },
          { id: 'area-voivodeship', label: 'Wojewodztwo', placeholder: 'Mazowieckie' },
        ]}
      />
      <SimpleListPanel title="Tereny" items={areas} />
    </>
  );
}
