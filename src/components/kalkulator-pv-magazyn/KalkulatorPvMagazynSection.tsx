import AddEntryModal from '@/components/common/AddEntryModal';

export default function KalkulatorPvMagazynSection() {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj profil kalkulacji"
        modalTitle="Dodaj profil kalkulacji PV + Magazyn"
        fields={[
          { id: 'calc-profile-name', label: 'Nazwa profilu', placeholder: 'np. Profil testowy' },
          { id: 'calc-pv-power', label: 'Moc PV (kWp)', type: 'number', placeholder: '50' },
          { id: 'calc-storage', label: 'Pojemnosc magazynu (kWh)', type: 'number', placeholder: '100' },
        ]}
      />
      <section className="panel">
        <h3>Kalkulator PV + Magazyn</h3>
        <div className="calc-grid">
          <label>
            Moc instalacji (kWp)
            <input type="number" placeholder="np. 50" />
          </label>
          <label>
            Pojemnosc magazynu (kWh)
            <input type="number" placeholder="np. 100" />
          </label>
          <button className="primary-btn" type="button">
            Oblicz
          </button>
        </div>
      </section>
    </>
  );
}
