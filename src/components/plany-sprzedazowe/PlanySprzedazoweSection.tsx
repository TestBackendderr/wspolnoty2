import { useMemo, useState } from 'react';

import type { User } from '@/types/domain';

interface PlanySprzedazoweSectionProps {
  salesPlans: Array<Record<string, unknown>>;
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
  salesPlans,
  caregivers,
}: PlanySprzedazoweSectionProps) {
  const quarterOptions = useMemo(() => getQuarterOptions(), []);
  const [selectedQuarter, setSelectedQuarter] = useState(quarterOptions[0]);

  const rows = salesPlans
    .map((plan, index) => {
      const id = typeof plan.id === 'number' ? plan.id : index;
      const caregiverId = typeof plan.caregiverId === 'number' ? plan.caregiverId : null;
      const caregiver = caregivers.find((c) => c.id === caregiverId);
      const cooperativeName =
        typeof plan.cooperativeName === 'string' && plan.cooperativeName.trim()
          ? plan.cooperativeName
          : '—';
      const target = typeof plan.target === 'number' ? plan.target : 0;
      const realized = typeof plan.realized === 'number' ? plan.realized : 0;
      const progress = target > 0 ? Math.min(100, (realized / target) * 100) : 0;
      return {
        id,
        caregiverName: caregiver?.name ?? '—',
        cooperativeName,
        target,
        realized,
        progress,
      };
    })
    .filter((row) => row.cooperativeName !== '—' || row.target > 0 || row.realized > 0);

  return (
    <section className="panel sales-plan-panel">
      <div className="sales-plan-header">
        <h3>Plany sprzedażowe - {selectedQuarter}</h3>
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
              <th>Spółdzielnia</th>
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
                  Brak planów sprzedażowych
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
