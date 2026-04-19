import { useMemo, useState } from 'react';

import type { Cooperative } from '@/types/domain';

type SortKey = 'name' | 'voivodeship' | 'status' | 'plannedPower' | 'installedPower';

interface CooperativesTableProps {
  cooperatives: Cooperative[];
  onEditCooperative?: (coop: Cooperative) => void;
  onViewHistory?: (coop: Cooperative) => void;
}

function compareCooperatives(
  a: Cooperative,
  b: Cooperative,
  key: SortKey,
  dir: 'asc' | 'desc',
): number {
  const sign = dir === 'asc' ? 1 : -1;
  let cmp = 0;
  switch (key) {
    case 'name':
      cmp = a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' });
      break;
    case 'voivodeship':
      cmp = a.voivodeship.localeCompare(b.voivodeship, 'pl', { sensitivity: 'base' });
      break;
    case 'status':
      cmp = a.status.localeCompare(b.status, 'pl', { sensitivity: 'base' });
      break;
    case 'plannedPower':
      cmp = a.plannedPower - b.plannedPower;
      break;
    case 'installedPower':
      cmp = a.installedPower - b.installedPower;
      break;
    default:
      cmp = 0;
  }
  if (cmp !== 0) return sign * cmp;
  return a.id - b.id;
}

export default function CooperativesTable({
  cooperatives,
  onEditCooperative,
  onViewHistory,
}: CooperativesTableProps) {
  const showActions = Boolean(onEditCooperative) || Boolean(onViewHistory);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedCooperatives = useMemo(() => {
    if (!sortKey) return cooperatives;
    return [...cooperatives].sort((a, b) => compareCooperatives(a, b, sortKey, sortDir));
  }, [cooperatives, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="table-sort-placeholder" aria-hidden />;
    return (
      <span className="table-sort-arrow" aria-hidden>
        {sortDir === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th scope="col">
              <button
                type="button"
                className={`table-sort-btn ${sortKey === 'name' ? 'table-sort-active' : ''}`}
                onClick={() => toggleSort('name')}
              >
                Nazwa
                {sortIndicator('name')}
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                className={`table-sort-btn ${sortKey === 'voivodeship' ? 'table-sort-active' : ''}`}
                onClick={() => toggleSort('voivodeship')}
              >
                Województwo
                {sortIndicator('voivodeship')}
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                className={`table-sort-btn ${sortKey === 'status' ? 'table-sort-active' : ''}`}
                onClick={() => toggleSort('status')}
              >
                Status
                {sortIndicator('status')}
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                className={`table-sort-btn ${sortKey === 'plannedPower' ? 'table-sort-active' : ''}`}
                onClick={() => toggleSort('plannedPower')}
              >
                Moc planowana
                {sortIndicator('plannedPower')}
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                className={`table-sort-btn ${sortKey === 'installedPower' ? 'table-sort-active' : ''}`}
                onClick={() => toggleSort('installedPower')}
              >
                Moc zainstalowana
                {sortIndicator('installedPower')}
              </button>
            </th>
            {showActions ? <th>Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {sortedCooperatives.map((coop) => (
            <tr key={coop.id}>
              <td>{coop.name}</td>
              <td>{coop.voivodeship}</td>
              <td>{coop.status}</td>
              <td>{coop.plannedPower} kWp</td>
              <td>{coop.installedPower} kWp</td>
              {showActions ? (
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {onEditCooperative ? (
                      <button
                        className="table-action-btn"
                        onClick={() => onEditCooperative(coop)}
                        type="button"
                      >
                        Edytuj
                      </button>
                    ) : null}
                    {onViewHistory ? (
                      <button
                        className="table-action-btn"
                        onClick={() => onViewHistory(coop)}
                        type="button"
                      >
                        Historia
                      </button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
          {sortedCooperatives.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 6 : 5} className="empty-row">
                Brak spoldzielni
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
