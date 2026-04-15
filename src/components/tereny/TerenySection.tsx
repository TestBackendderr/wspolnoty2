import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import type { Area } from '@/types/domain';

interface TerenySectionProps {
  areas: Area[];
  onAddArea: (values: AddEntryValues) => void;
}

export default function TerenySection({ areas, onAddArea }: TerenySectionProps) {
  return (
    <section className="panel">
      <div className="section-head-with-action">
        <h3>Tereny ({areas.length})</h3>
        <AddEntryModal
          buttonLabel="Dodaj teren"
          modalTitle="Dodaj teren"
          fields={[
            { id: 'area-name', label: 'Nazwa terenu', placeholder: 'np. Teren A' },
            { id: 'area-type', label: 'Typ terenu', placeholder: 'np. Miasto' },
            { id: 'area-postal', label: 'Kod pocztowy', placeholder: '00-000' },
            { id: 'area-voivodeship', label: 'Wojewodztwo', placeholder: 'Mazowieckie' },
          ]}
          onSubmit={onAddArea}
        />
      </div>
      <div className="table-wrapper areas-table-wrap">
        <table className="areas-table">
          <thead>
            <tr>
              <th>Typ</th>
              <th>Nazwa</th>
              <th>Kod pocztowy</th>
              <th>Wojewodztwo</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area.id}>
                <td>{area.type || '-'}</td>
                <td>{area.name}</td>
                <td>{area.postalCode || '-'}</td>
                <td>{area.voivodeship || '-'}</td>
              </tr>
            ))}
            {areas.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-row">
                  Brak terenow - dodaj pierwszy
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
