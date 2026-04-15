import SimpleListPanel from '@/components/common/SimpleListPanel';
import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface ZarzadzanieKontamiSectionProps {
  users: string[];
  onAddUser: (values: AddEntryValues) => void;
}

export default function ZarzadzanieKontamiSection({ users, onAddUser }: ZarzadzanieKontamiSectionProps) {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj nowe konto"
        modalTitle="Dodaj nowe konto"
        fields={[
          { id: 'user-name', label: 'Nazwa uzytkownika', placeholder: 'np. Jan Kowalski' },
          { id: 'user-email', label: 'Email', type: 'email', placeholder: 'jan@example.com' },
          { id: 'user-role', label: 'Rola', placeholder: 'admin / opiekun' },
          { id: 'user-password', label: 'Haslo tymczasowe', placeholder: 'haslo123' },
        ]}
        onSubmit={onAddUser}
      />
      <SimpleListPanel title="Zarzadzanie kontami" items={users} />
    </>
  );
}
