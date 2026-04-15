import CooperativesTable from '@/components/common/CooperativesTable';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { Cooperative } from '@/types/domain';

interface SpoldzielnieSectionProps {
  cooperatives: Cooperative[];
}

export default function SpoldzielnieSection({ cooperatives }: SpoldzielnieSectionProps) {
  return (
    <>
      <AddEntryModal
        buttonLabel="Nowa spoldzielnia"
        modalTitle="Dodaj spoldzielnie energetyczna"
        fields={[
          { id: 'coop-name', label: 'Nazwa spoldzielni', placeholder: 'np. Energia Plus' },
          { id: 'coop-address', label: 'Adres siedziby', placeholder: 'ul. Przykladowa 1' },
          { id: 'coop-voivodeship', label: 'Wojewodztwo', placeholder: 'Mazowieckie' },
          { id: 'coop-planned-power', label: 'Moc planowana (kWp)', type: 'number', placeholder: '100' },
        ]}
      />
      <section className="panel">
        <h3>Spoldzielnie energetyczne</h3>
        <CooperativesTable cooperatives={cooperatives} />
      </section>
    </>
  );
}
