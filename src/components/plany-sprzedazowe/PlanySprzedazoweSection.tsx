import AddEntryModal from '@/components/common/AddEntryModal';

export default function PlanySprzedazoweSection() {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj wpis planu"
        modalTitle="Dodaj wpis planu sprzedazowego"
        fields={[
          { id: 'plan-quarter', label: 'Kwartal', placeholder: 'np. Q2 2026' },
          { id: 'plan-coop', label: 'Spoldzielnia', placeholder: 'np. Energia Plus' },
          { id: 'plan-target', label: 'Cel (MWh)', type: 'number', placeholder: '250' },
        ]}
      />
      <section className="panel">
        <h3>Plany sprzedazowe</h3>
        <p>Widok planow sprzedazowych jest przygotowany jako osobna strona.</p>
      </section>
    </>
  );
}
