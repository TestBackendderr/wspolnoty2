import AddEntryModal from '@/components/common/AddEntryModal';

export default function MapaPolskiSection() {
  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj punkt na mapie"
        modalTitle="Dodaj punkt na mapie"
        fields={[
          { id: 'map-point-name', label: 'Nazwa punktu', placeholder: 'np. Warszawa - Centrum' },
          { id: 'map-point-voivodeship', label: 'Wojewodztwo', placeholder: 'Mazowieckie' },
          { id: 'map-point-value', label: 'Wartosc (GWh)', type: 'number', placeholder: '12' },
        ]}
      />
      <section className="panel">
        <h3>Mapa Polski</h3>
        <div className="map-placeholder">Tu bedzie mapa (Leaflet) jak w oryginalnym projekcie.</div>
      </section>
    </>
  );
}
