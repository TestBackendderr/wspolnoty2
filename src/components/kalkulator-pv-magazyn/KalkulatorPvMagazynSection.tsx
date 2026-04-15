export default function KalkulatorPvMagazynSection() {
  return (
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
  );
}
