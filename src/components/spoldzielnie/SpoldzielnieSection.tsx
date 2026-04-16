import CooperativesTable from '@/components/common/CooperativesTable';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import { VOIVODESHIPS } from '@/constants/voivodeships';
import type { Cooperative } from '@/types/domain';

interface SpoldzielnieSectionProps {
  cooperatives: Cooperative[];
  onAddCooperative: (values: AddEntryValues) => void;
}

export default function SpoldzielnieSection({
  cooperatives,
  onAddCooperative,
}: SpoldzielnieSectionProps) {
  return (
    <>
      <AddEntryModal
        buttonLabel="Nowa spoldzielnia"
        modalTitle="Dodaj spoldzielnie energetyczna"
        fields={[
          { id: 'coop-name', label: 'Nazwa spoldzielni', placeholder: 'np. Energia Plus' },
          { id: 'coop-address', label: 'Adres siedziby', placeholder: 'ul. Przykladowa 1' },
          { id: 'coop-voivodeship', label: 'Wojewodztwo', options: VOIVODESHIPS },
          { id: 'coop-planned-power', label: 'Moc planowana (kWp)', type: 'number', placeholder: '100' },
        ]}
        onSubmit={onAddCooperative}
      />
      <section className="panel">
        <h3>Spoldzielnie energetyczne</h3>
        <CooperativesTable cooperatives={cooperatives} />
      </section>
    </>
  );
}
