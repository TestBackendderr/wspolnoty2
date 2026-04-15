interface SimpleListPanelProps {
  title: string;
  items: string[];
}

export default function SimpleListPanel({ title, items }: SimpleListPanelProps) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>Brak danych</p>
      ) : (
        <ul className="simple-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
