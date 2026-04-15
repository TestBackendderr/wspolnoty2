import { useMemo, useState } from 'react';

import type { Cooperative, User } from '@/types/domain';

interface PlanySprzedazoweSectionProps {
  cooperatives: Cooperative[];
  caregivers: User[];
}

function getQuarterOptions(baseDate = new Date()) {
  const quarter = Math.floor(baseDate.getMonth() / 3) + 1;
  const year = baseDate.getFullYear();
  return [
    `Q${quarter} ${year}`,
    `Q${((quarter % 4) + 1)} ${quarter === 4 ? year + 1 : year}`,
    `Q${quarter === 1 ? 4 : quarter - 1} ${quarter === 1 ? year - 1 : year}`,
  ];
}

export default function PlanySprzedazoweSection({
  cooperatives,
  caregivers,
}: PlanySprzedazoweSectionProps) {
  const quarterOptions = useMemo(() => getQuarterOptions(), []);
  const [selectedQuarter, setSelectedQuarter] = useState(quarterOptions[0]);

  const rows = cooperatives.map((coop) => {
    const caregiver = caregivers.find((c) => c.id === coop.caregiverId);
    const target = coop.plannedPower ? Math.round(coop.plannedPower * 1000) : 0;
    const realized = coop.installedPower ? Math.round(coop.installedPower * 1000) : 0;
    const progress = target > 0 ? Math.min(100, (realized / target) * 100) : 0;
    return {
      id: coop.id,
      caregiverName: caregiver?.name ?? '—',
      cooperativeName: coop.name,
      target,
      realized,
      progress,
    };
  });

  return (
    <section className="panel sales-plan-panel">
      <div className="sales-plan-header">
        <h3>Plany sprzedazowe - {selectedQuarter}</h3>
        <select
          className="sales-plan-quarter-select"
          value={selectedQuarter}
          onChange={(event) => setSelectedQuarter(event.target.value)}
        >
          {quarterOptions.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrapper">
        <table className="sales-plan-table">
          <thead>
            <tr>
              <th>Opiekun</th>
              <th>Spoldzielnia</th>
              <th>Cel (kWh)</th>
              <th>Zrealizowane (kWh)</th>
              <th>Realizacja</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.caregiverName}</td>
                  <td>{row.cooperativeName}</td>
                  <td>{row.target.toLocaleString('pl-PL')}</td>
                  <td>{row.realized.toLocaleString('pl-PL')}</td>
                  <td>{row.progress.toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-row">
                  Brak spoldzielni
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
