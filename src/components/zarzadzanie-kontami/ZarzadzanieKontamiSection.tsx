import SimpleListPanel from '@/components/common/SimpleListPanel';
import AddEntryModal from '@/components/common/AddEntryModal';

interface ZarzadzanieKontamiSectionProps {
  users: string[];
}

export default function ZarzadzanieKontamiSection({ users }: ZarzadzanieKontamiSectionProps) {
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
      />
      <SimpleListPanel title="Zarzadzanie kontami" items={users} />
    </>
  );
}
