import SimpleListPanel from '@/components/common/SimpleListPanel';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface OpiekunowieSectionProps {
  caregivers: string[];
  onAddCaregiver: (values: AddEntryValues) => void;
}

export default function OpiekunowieSection({ caregivers, onAddCaregiver }: OpiekunowieSectionProps) {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj opiekuna"
        modalTitle="Dodaj opiekuna"
        fields={[
          { id: 'caregiver-first-name', label: 'Imie', placeholder: 'np. Jan' },
          { id: 'caregiver-last-name', label: 'Nazwisko', placeholder: 'np. Kowalski' },
          { id: 'caregiver-email', label: 'Email', type: 'email', placeholder: 'jan@example.com' },
          { id: 'caregiver-phone', label: 'Telefon', placeholder: '+48 500 000 000' },
        ]}
        onSubmit={onAddCaregiver}
      />
      <SimpleListPanel title="Opiekunowie" items={caregivers} />
    </>
  );
}
