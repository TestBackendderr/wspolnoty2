import AddEntryModal from '@/components/common/AddEntryModal';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import CalculationPdfReportButton from '@/components/kalkulator-pv-magazyn/CalculationPdfReportButton';
import {
  createCalculationProfile,
  deleteCalculationProfile,
  listAllCalculationProfiles,
  type CalculationProfile,
} from '@/services/calculationProfiles';
import {
  Chart,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Distributor = 'pge' | 'tauron' | 'enea' | 'energa' | 'eon';
type Tariff = 'C1x' | 'C2x' | 'B21' | 'B22' | 'B23' | 'G11' | 'G12';
type EmsType = 'none' | 'one-time' | 'monthly';
type SubsidyType = 'fixed' | 'percent';
type SeasonalityType = 'none' | 'summer' | 'winter';
type FinancingType = 'cash' | 'credit' | 'leasing';
type Tab = 'config' | 'results';

interface CalcFormData {
  companyName: string;
  address: string;
  nip: string;
  distributor: Distributor;
  tariff: Tariff;
  contractedPower: number;
  monthlySubscription: number;
  sellOsdPrice: number;
  distFee: number;
  avgEnergyPrice: number;
  inCoop: boolean;
  coopSellPrice: number;
  coopBuyPrice: number;
  coopMembershipFee: number;
  coopBalanceFee: number;
  annualConsumption: number;
  seasonalityType: SeasonalityType;
  existingPvPower: number;
  pvPower: number;
  selfConsPct: number;
  pvMount: 'sloped-roof' | 'flat-roof' | 'ground' | 'facade';
  pvType: 'existing' | 'planned';
  pvTotalPrice: number;
  batteryCapacity: number;
  batteryTotalPrice: number;
  emsType: EmsType;
  emsCost: number;
  inflation: number;
  subsidyType: SubsidyType;
  subsidyValue: number;
  financing: FinancingType;
  interestRate: number;
  loanYears: number;
}

interface MonthlyRow {
  month: number;
  consumption: number;
  production: number;
  autoconsumption: number;
  exportTotal: number;
  exportOsd: number;
  exportCoop: number;
  importValue: number;
  totalCost: number;
  revenue: number;
  net: number;
}

interface CalcResult {
  monthlyRows: MonthlyRow[];
  yearlyProduction: number;
  yearlyAutoconsumption: number;
  yearlyExport: number;
  yearlyImport: number;
  oldNet: number;
  newNet: number;
  annualSaving: number;
  savingsPercent: string;
  netInvestment: number;
  payback: number;
  roi: number;
  npv: number;
  newTotalCost: number;
  newRevenue: number;
  oldEnergyCost: number;
  oldDistTotal: number;
  oldFixedCost: number;
  newEnergyCost: number;
  newDistCost: number;
  newFixed: number;
  newBalanceCost: number;
  cashflows: number[];
}

const monthlyProdFactors = [
  0.035, 0.045, 0.08, 0.1, 0.12, 0.13, 0.13, 0.12, 0.09, 0.07, 0.045, 0.035,
];

const fixedFeeRates: Record<Distributor, Partial<Record<Tariff, number>>> = {
  pge: { C1x: 8.65, C2x: 9.22, B21: 10.31, B22: 10.88, B23: 11.72 },
  tauron: { C1x: 8.22, C2x: 8.79, B21: 9.84, B22: 10.35, B23: 11.2 },
  enea: { C1x: 8.91, C2x: 9.54, B21: 10.62, B22: 11.04, B23: 11.83 },
  energa: { C1x: 9.12, C2x: 9.88, B21: 11.08, B22: 11.64, B23: 12.24 },
  eon: { C1x: 7.98, C2x: 8.45, B21: 9.45, B22: 9.99, B23: 10.62 },
};

const ryczaltMonthly: Record<Distributor, number> = {
  pge: 10.824,
  tauron: 10.455,
  enea: 11.316,
  energa: 12.792,
  eon: 9.717,
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

export default function KalkulatorPvMagazynSection() {
  const configStorageKey = 'kalkulator-pv-magazyn-config';
  const cashflowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cashflowChartRef = useRef<Chart<'line'> | null>(null);
  const [tab, setTab] = useState<Tab>('config');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [formData, setFormData] = useState<CalcFormData>({
    companyName: '',
    address: '',
    nip: '',
    distributor: 'pge',
    tariff: 'C1x',
    contractedPower: 10,
    monthlySubscription: 86.5,
    sellOsdPrice: 0.55,
    distFee: 0.2,
    avgEnergyPrice: 0.62,
    inCoop: false,
    coopSellPrice: 0,
    coopBuyPrice: 0,
    coopMembershipFee: 0,
    coopBalanceFee: 0,
    annualConsumption: 12000,
    seasonalityType: 'none',
    existingPvPower: 0,
    pvPower: 6,
    selfConsPct: 35,
    pvMount: 'sloped-roof',
    pvType: 'planned',
    pvTotalPrice: 20000,
    batteryCapacity: 0,
    batteryTotalPrice: 0,
    emsType: 'none',
    emsCost: 1200,
    inflation: 6,
    subsidyType: 'fixed',
    subsidyValue: 7000,
    financing: 'cash',
    interestRate: 6.9,
    loanYears: 10,
  });
  const [calculationProfiles, setCalculationProfiles] = useState<CalculationProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [profilesActionError, setProfilesActionError] = useState('');
  const [profilesOpen, setProfilesOpen] = useState(false);

  const batteryPower = useMemo(() => round2(formData.pvPower * 1.5), [formData.pvPower]);

  const loadCalculationProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const items = await listAllCalculationProfiles();
      setCalculationProfiles(items);
    } catch {
      setProfilesError('Nie udało się pobrać zapisanych profili kalkulacji.');
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalculationProfiles();
  }, [loadCalculationProfiles]);

  const updateFixedFee = (next: CalcFormData) => {
    const { distributor, tariff, contractedPower } = next;
    const monthlyFee = tariff.startsWith('G')
      ? ryczaltMonthly[distributor]
      : (fixedFeeRates[distributor][tariff] ?? 0) * contractedPower;
    return { ...next, monthlySubscription: round2(monthlyFee) };
  };

  const onNumberChange =
    (key: keyof CalcFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setFormData((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));
    };

  const calculate = () => {
    const existingPvKwp = formData.existingPvPower;
    const plannedPvKwp = formData.pvPower;
    const totalPvKwp = existingPvKwp + plannedPvKwp;
    const battKwh = formData.batteryCapacity;
    const hasBattery = battKwh > 0;
    const batteryEff = 0.92;
    const yearlyProd = totalPvKwp * 1050;
    const monthlyProd = monthlyProdFactors.map((f) => yearlyProd * f);
    const selfRate = formData.selfConsPct / 100;

    let monthlyCons = new Array(12).fill(formData.annualConsumption / 12);
    if (formData.seasonalityType === 'summer') {
      const factors = [0.85, 0.85, 0.95, 1.05, 1.15, 1.3, 1.35, 1.3, 1.15, 1.05, 0.9, 0.85];
      monthlyCons = monthlyCons.map((v, i) => v * factors[i]);
    } else if (formData.seasonalityType === 'winter') {
      const factors = [1.3, 1.25, 1.15, 1.05, 0.9, 0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.3];
      monthlyCons = monthlyCons.map((v, i) => v * factors[i]);
    }
    const correctedAnnual = monthlyCons.reduce((s, v) => s + v, 0);
    if (correctedAnnual > 0) {
      const correction = formData.annualConsumption / correctedAnnual;
      monthlyCons = monthlyCons.map((v) => v * correction);
    }

    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let yearlyAutocons = 0;
    let yearlyExport = 0;
    let yearlyImport = 0;
    const monthlyRows: MonthlyRow[] = [];

    for (let i = 0; i < 12; i += 1) {
      const cons = monthlyCons[i];
      const prod = monthlyProd[i];
      const directAutocons = Math.min(prod * selfRate, cons);
      const excess = prod - directAutocons;
      const deficit = cons - directAutocons;
      const maxShift = battKwh * batteryEff * monthDays[i];
      const shifted = hasBattery ? Math.min(excess, deficit, maxShift) : 0;
      const autocons = directAutocons + shifted;
      const exportTotal = excess - shifted;
      const importValue = deficit - shifted;
      const exportOsd = formData.inCoop ? 0 : exportTotal;
      const exportCoop = formData.inCoop ? exportTotal : 0;
      const revenue = exportOsd * formData.sellOsdPrice + exportCoop * formData.coopSellPrice;
      const energyCost = importValue * (formData.inCoop ? formData.coopBuyPrice : formData.avgEnergyPrice);
      const distCost = importValue * (formData.inCoop ? 0 : formData.distFee);
      const fixedCost = formData.monthlySubscription;
      const balanceCost = formData.inCoop ? (exportTotal + importValue) * formData.coopBalanceFee : 0;
      const emsMonthly = formData.emsType === 'monthly' ? formData.emsCost : 0;
      const memberFee = formData.inCoop ? formData.coopMembershipFee : 0;
      const totalCost = energyCost + distCost + fixedCost + balanceCost + emsMonthly + memberFee;
      const net = revenue - totalCost;

      monthlyRows.push({
        month: i + 1,
        consumption: cons,
        production: prod,
        autoconsumption: autocons,
        exportTotal,
        exportOsd,
        exportCoop,
        importValue,
        totalCost,
        revenue,
        net,
      });

      yearlyAutocons += autocons;
      yearlyExport += exportTotal;
      yearlyImport += importValue;
    }

    const oldYearlyProd = existingPvKwp * 1050;
    const monthlyOldProd = monthlyProdFactors.map((f) => oldYearlyProd * f);
    let yearlyOldImport = 0;
    let yearlyOldExport = 0;
    for (let i = 0; i < 12; i += 1) {
      const cons = monthlyCons[i];
      const prod = monthlyOldProd[i];
      const oldAutocons = Math.min(prod * selfRate, cons);
      yearlyOldExport += prod - oldAutocons;
      yearlyOldImport += cons - oldAutocons;
    }

    const oldEnergyCost = yearlyOldImport * formData.avgEnergyPrice;
    const oldDistVariable = yearlyOldImport * formData.distFee;
    const oldFixedCost = formData.monthlySubscription * 12;
    const oldDistTotal = oldDistVariable - oldFixedCost;
    const oldGrossCosts = oldEnergyCost + oldDistTotal + oldFixedCost;
    const oldRevenue = yearlyOldExport * formData.sellOsdPrice;
    const oldNet = oldGrossCosts - oldRevenue;

    const emsYearly = formData.emsType === 'monthly' ? formData.emsCost * 12 : 0;
    const coopYearlyMembership = formData.inCoop ? formData.coopMembershipFee * 12 : 0;
    const newFixed = formData.monthlySubscription * 12 + emsYearly + coopYearlyMembership;
    const newEnergyCost = yearlyImport * (formData.inCoop ? formData.coopBuyPrice : formData.avgEnergyPrice);
    const newDistCost = yearlyImport * (formData.inCoop ? 0 : formData.distFee);
    const newRevenue = yearlyExport * (formData.inCoop ? formData.coopSellPrice : formData.sellOsdPrice);
    const newBalanceCost = formData.inCoop ? (yearlyExport + yearlyImport) * formData.coopBalanceFee : 0;
    const newTotalCost = newEnergyCost + newDistCost + newFixed + newBalanceCost;
    const newNet = newTotalCost - newRevenue;
    const annualSaving = oldNet - newNet;
    const savingsPercent =
      oldNet > 0 ? `${(((oldNet - newNet) / oldNet) * 100).toFixed(1)} %` : '—';

    const emsOneTime = formData.emsType === 'one-time' ? formData.emsCost : 0;
    const investment = (formData.pvType === 'planned' ? formData.pvTotalPrice : 0) + formData.batteryTotalPrice + emsOneTime;
    const subsidy = formData.subsidyType === 'percent' ? investment * (formData.subsidyValue / 100) : formData.subsidyValue;
    const netInvestment = Math.max(0, investment - subsidy);
    const inflation = formData.inflation / 100;
    const discount = 0.07;
    let cumulative = -netInvestment;
    let npv = -netInvestment;
    const cashflows: number[] = [];
    for (let y = 1; y <= 25; y += 1) {
      const cashflow = annualSaving * Math.pow(1 + inflation, y - 1);
      cashflows.push(cashflow);
      cumulative += cashflow;
      npv += cashflow / Math.pow(1 + discount, y);
    }
    const roi = netInvestment > 0 ? (cumulative / netInvestment) * 100 : 0;
    const payback = annualSaving > 0 ? netInvestment / annualSaving : Number.POSITIVE_INFINITY;

    setResult({
      monthlyRows,
      yearlyProduction: yearlyProd,
      yearlyAutoconsumption: yearlyAutocons,
      yearlyExport,
      yearlyImport,
      oldNet,
      newNet,
      annualSaving,
      savingsPercent,
      netInvestment,
      payback,
      roi,
      npv,
      newTotalCost,
      newRevenue,
      oldEnergyCost,
      oldDistTotal,
      oldFixedCost,
      newEnergyCost,
      newDistCost,
      newFixed,
      newBalanceCost,
      cashflows,
    });
    setTab('results');
  };

  const handleAddCalculationProfile = (values: AddEntryValues) => {
    const power = Number(values['calc-pv-power'] ?? 0);
    const capacity = Number(values['calc-storage'] ?? 0);
    if (!Number.isFinite(power) || !Number.isFinite(capacity) || power < 0 || capacity < 0) {
      setProfilesActionError('Podaj poprawne wartości mocy i pojemności.');
      return;
    }

    void (async () => {
      setProfilesActionError('');
      try {
        await createCalculationProfile({ power: Math.round(power), capacity: Math.round(capacity) });
        await loadCalculationProfiles();
      } catch {
        setProfilesActionError('Nie udało się zapisać profilu kalkulacji.');
      }
    })();
  };

  const applyCalculationProfile = (profile: CalculationProfile) => {
    setFormData((prev) => ({
      ...prev,
      pvPower: profile.power,
      batteryCapacity: profile.capacity,
    }));
    setTab('config');
  };

  const removeCalculationProfile = (profileId: number) => {
    void (async () => {
      setProfilesActionError('');
      try {
        await deleteCalculationProfile(profileId);
        await loadCalculationProfiles();
      } catch {
        setProfilesActionError('Nie udało się usunąć profilu kalkulacji.');
      }
    })();
  };

  const saveConfig = () => {
    localStorage.setItem(configStorageKey, JSON.stringify(formData));
  };

  const loadConfig = () => {
    const raw = localStorage.getItem(configStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<CalcFormData>;
      setFormData((prev) => updateFixedFee({ ...prev, ...parsed }));
    } catch {
      // Ignore invalid stored data and keep current form state.
    }
  };

  useEffect(() => {
    if (!result || !cashflowCanvasRef.current || tab !== 'results') return;

    if (cashflowChartRef.current) {
      cashflowChartRef.current.destroy();
      cashflowChartRef.current = null;
    }

    const labels = Array.from({ length: 25 }, (_, i) => `Rok ${i + 1}`);
    cashflowChartRef.current = new Chart(cashflowCanvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Roczny cash-flow',
            data: result.cashflows,
            borderColor: '#0b8f27',
            backgroundColor: 'rgba(11, 143, 39, 0.14)',
            pointBackgroundColor: '#0b8f27',
            pointBorderColor: '#0b8f27',
            pointRadius: 2,
            pointHoverRadius: 3,
            borderWidth: 2.5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: {
            ticks: { maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 26 },
            grid: { color: 'rgba(0,0,0,0.07)' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.07)' },
          },
        },
      },
    });

    return () => {
      if (cashflowChartRef.current) {
        cashflowChartRef.current.destroy();
        cashflowChartRef.current = null;
      }
    };
  }, [result, tab]);

  return (
    <>
      <AddEntryModal
        buttonLabel="Dodaj profil kalkulacji"
        modalTitle="Dodaj profil kalkulacji PV + Magazyn"
        fields={[
          { id: 'calc-pv-power', label: 'Moc PV (kWp)', type: 'number', placeholder: '50' },
          { id: 'calc-storage', label: 'Pojemność magazynu (kWh)', type: 'number', placeholder: '100' },
        ]}
        onSubmit={handleAddCalculationProfile}
      />
      <section className="panel">
        <div className="calc-container">
          <h1 className="calc-title">Kalkulator Fotowoltaiki i Magazynu Energii</h1>
          <div className="calc-section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <h2 style={{ margin: 0 }}>Zapisane profile kalkulacji</h2>
              <button
                className="primary-outline-btn"
                onClick={() => setProfilesOpen((prev) => !prev)}
                type="button"
              >
                {profilesOpen ? 'Ukryj' : 'Pokaż'}
              </button>
            </div>
            {profilesActionError ? <p className="email-warning">{profilesActionError}</p> : null}
            {profilesOpen ? (
              profilesLoading ? (
                <p>Ładowanie profili...</p>
              ) : profilesError ? (
                <p className="email-warning">{profilesError}</p>
              ) : calculationProfiles.length ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {calculationProfiles.map((profile) => (
                    <article
                      key={profile.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'grid', gap: '0.15rem' }}>
                        <strong>Profil #{profile.id}</strong>
                        <span>Moc PV: {profile.power} kWp</span>
                        <span>Pojemność: {profile.capacity} kWh</span>
                        <small style={{ color: '#6b7280' }}>
                          {new Date(profile.createdAt).toLocaleString('pl-PL')}
                        </small>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="primary-outline-btn"
                          onClick={() => applyCalculationProfile(profile)}
                          type="button"
                        >
                          Użyj profilu
                        </button>
                        <button
                          className="table-action-btn danger"
                          onClick={() => removeCalculationProfile(profile.id)}
                          type="button"
                        >
                          Usuń profil
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>Brak zapisanych profili. Dodaj pierwszy, używając przycisku +.</p>
              )
            ) : (
              <div
                style={{
                  color: '#6b7280',
                  fontSize: '0.92rem',
                  border: '1px dashed #d1d5db',
                  borderRadius: '0.6rem',
                  padding: '0.65rem 0.8rem',
                }}
              >
                Sekcja profili jest ukryta.
              </div>
            )}
          </div>
          <div className="calc-tab">
            <button
              className={`calc-tablinks ${tab === 'config' ? 'active' : ''}`}
              onClick={() => setTab('config')}
              type="button"
            >
              Konfiguracja
            </button>
            <button
              className={`calc-tablinks ${tab === 'results' ? 'active' : ''}`}
              onClick={() => setTab('results')}
              type="button"
            >
              Wyniki
            </button>
          </div>

          {tab === 'config' ? (
            <div className="calc-tabcontent">
              <div className="calc-section">
                <h2>Dane odbiorcy</h2>
                <label className="calc-label">
                  Nazwa firmy / Imię i nazwisko
                  <input
                    className="calc-input"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  />
                </label>
                <label className="calc-label">
                  Adres
                  <input
                    className="calc-input"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </label>
                <label className="calc-label">
                  NIP
                  <input
                    className="calc-input"
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nip: e.target.value }))}
                  />
                </label>
              </div>
              <div className="calc-section">
                <h2>Dystrybucja i parametry umowne</h2>
                <label className="calc-label">
                  Obecny operator sieci (OSD)
                  <select
                    className="calc-select"
                    value={formData.distributor}
                    onChange={(e) =>
                      setFormData((prev) =>
                        updateFixedFee({ ...prev, distributor: e.target.value as Distributor }),
                      )
                    }
                  >
                    <option value="pge">PGE</option>
                    <option value="tauron">Tauron</option>
                    <option value="enea">Enea</option>
                    <option value="energa">Energa</option>
                    <option value="eon">E.ON</option>
                  </select>
                </label>
                <label className="calc-label">
                  Taryfa
                  <select
                    className="calc-select"
                    value={formData.tariff}
                    onChange={(e) =>
                      setFormData((prev) => updateFixedFee({ ...prev, tariff: e.target.value as Tariff }))
                    }
                  >
                    <option value="C1x">C1x</option>
                    <option value="C2x">C2x</option>
                    <option value="B21">B21</option>
                    <option value="B22">B22</option>
                    <option value="B23">B23</option>
                    <option value="G11">G11</option>
                    <option value="G12">G12</option>
                  </select>
                </label>
                <label className="calc-label">
                  Moc umowna (kW)
                  <input
                    className="calc-input"
                    type="number"
                    step="0.1"
                    value={formData.contractedPower}
                    onChange={(e) =>
                      setFormData((prev) =>
                        updateFixedFee({ ...prev, contractedPower: Number(e.target.value) || 0 }),
                      )
                    }
                  />
                </label>
                <label className="calc-label">
                  Oplata miesieczna stala / abonamentowa (zl/m-c)
                  <input className="calc-input" type="number" value={formData.monthlySubscription} readOnly />
                </label>
                <label className="calc-label">
                  Srednia cena odkupu energii z OSD (zl/kWh)
                  <input className="calc-input" type="number" step="0.01" value={formData.sellOsdPrice} onChange={onNumberChange('sellOsdPrice')} />
                </label>
                <label className="calc-label">
                  Srednia cena dystrybucji zmiennej (zl/kWh)
                  <input className="calc-input" type="number" step="0.01" value={formData.distFee} onChange={onNumberChange('distFee')} />
                </label>
              </div>

              <div className="calc-section">
                <h2>Energia czynna - ceny</h2>
                <label className="calc-label">
                  Średnia cena energii czynnej (zł/kWh)
                  <input className="calc-input" type="number" step="0.01" value={formData.avgEnergyPrice} onChange={onNumberChange('avgEnergyPrice')} />
                </label>
              </div>

              <div className="calc-section">
                <h2>Spółdzielnia energetyczna</h2>
                <label className="calc-label">
                  Czy w spółdzielni energetycznej?
                  <select
                    className="calc-select"
                    value={formData.inCoop ? 'yes' : 'no'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, inCoop: e.target.value === 'yes' }))}
                  >
                    <option value="no">Nie</option>
                    <option value="yes">Tak</option>
                  </select>
                </label>
                {formData.inCoop ? (
                  <>
                    <label className="calc-label">
                      Odkup energii w spółdzielni (zł/kWh)
                      <input className="calc-input" type="number" step="0.01" value={formData.coopSellPrice} onChange={onNumberChange('coopSellPrice')} />
                    </label>
                    <label className="calc-label">
                      Zakup energii w spółdzielni (zł/kWh)
                      <input className="calc-input" type="number" step="0.01" value={formData.coopBuyPrice} onChange={onNumberChange('coopBuyPrice')} />
                    </label>
                    <label className="calc-label">
                      Stała opłata członkowska (zł/m-c)
                      <input className="calc-input" type="number" step="0.01" value={formData.coopMembershipFee} onChange={onNumberChange('coopMembershipFee')} />
                    </label>
                    <label className="calc-label">
                      Opłata bilansowa od 1 kWh (zł/kWh)
                      <input className="calc-input" type="number" step="0.001" value={formData.coopBalanceFee} onChange={onNumberChange('coopBalanceFee')} />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="calc-section">
                <h2>Profil zużycia energii</h2>
                <label className="calc-label">
                  Roczne zużycie energii (kWh)
                  <input className="calc-input" type="number" step="100" value={formData.annualConsumption} onChange={onNumberChange('annualConsumption')} />
                </label>
                <label className="calc-label">
                  Wgraj plik z danymi godzinowymi / 15-minutowymi (opcjonalnie)
                  <input className="calc-input" type="file" accept=".csv,.xlsx,.xls" />
                </label>
                <p style={{ fontSize: '0.9em', color: '#555', marginTop: 8, marginBottom: 18 }}>
                  Format CSV: kolumna 1 = timestamp, kolumna 2 = zużycie (kWh). Obsługuje też raporty OSD.
                </p>
                <label className="calc-label">
                  Typ sezonowości prognozy
                  <select
                    className="calc-select"
                    value={formData.seasonalityType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seasonalityType: e.target.value as SeasonalityType }))}
                  >
                    <option value="none">Brak sezonowości</option>
                    <option value="summer">Sezonowość letnia</option>
                    <option value="winter">Sezonowość zimowa</option>
                  </select>
                </label>
              </div>

              <div className="calc-section">
                <h2>Instalacja PV</h2>
                <label className="calc-label">
                  Typ instalacji
                  <select
                    className="calc-select"
                    value={formData.pvType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pvType: e.target.value as 'existing' | 'planned' }))}
                  >
                    <option value="existing">Istniejąca</option>
                    <option value="planned">Planowana</option>
                  </select>
                </label>
                <label className="calc-label">
                  Moc istniejącej instalacji PV (kWp)
                  <input className="calc-input" type="number" step="0.1" value={formData.existingPvPower} onChange={onNumberChange('existingPvPower')} />
                </label>
                <label className="calc-label">
                  Moc planowanej dobudowy / nowej instalacji PV (kWp)
                  <input className="calc-input" type="number" step="0.1" value={formData.pvPower} onChange={onNumberChange('pvPower')} />
                </label>
                <label className="calc-label">
                  Zakładany poziom bezpośredniej autokonsumpcji (%)
                  <input className="calc-input" type="number" min="0" max="100" value={formData.selfConsPct} onChange={onNumberChange('selfConsPct')} />
                </label>
                <label className="calc-label">
                  Miejsce montażu
                  <select
                    className="calc-select"
                    value={formData.pvMount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pvMount: e.target.value as CalcFormData['pvMount'],
                      }))
                    }
                  >
                    <option value="sloped-roof">Dach skośny</option>
                    <option value="flat-roof">Dach płaski</option>
                    <option value="ground">Montaż gruntowy</option>
                    <option value="facade">Elewacja / balkon</option>
                  </select>
                </label>
                {formData.pvType === 'planned' ? (
                  <label className="calc-label">
                    Całkowita cena netto instalacji PV (zł)
                    <input className="calc-input" type="number" step="100" value={formData.pvTotalPrice} onChange={onNumberChange('pvTotalPrice')} />
                  </label>
                ) : null}
              </div>

              <div className="calc-section">
                <h2>Magazyn energii</h2>
                <label className="calc-label">
                  Pojemność magazynu (kWh)
                  <input className="calc-input" type="number" step="0.1" value={formData.batteryCapacity} onChange={onNumberChange('batteryCapacity')} />
                </label>
                <label className="calc-label">
                  Moc magazynu (kW) - sugerowana 1.5 x kWp PV
                  <input className="calc-input" type="number" value={batteryPower} readOnly />
                </label>
                <label className="calc-label">
                  Całkowita cena netto magazynu energii (zł)
                  <input className="calc-input" type="number" step="100" value={formData.batteryTotalPrice} onChange={onNumberChange('batteryTotalPrice')} />
                </label>
              </div>

              <div className="calc-section">
                <h2>Zarządzanie magazynem energii (EMS)</h2>
                <label className="calc-label">
                  Model opłat EMS
                  <select
                    className="calc-select"
                    value={formData.emsType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emsType: e.target.value as EmsType }))}
                  >
                    <option value="none">Brak / wliczone</option>
                    <option value="one-time">Jednorazowa opłata</option>
                    <option value="monthly">Miesieczna licencja</option>
                  </select>
                </label>
                {formData.emsType !== 'none' ? (
                  <label className="calc-label">
                    Wartosc EMS (zl)
                    <input className="calc-input" type="number" step="10" value={formData.emsCost} onChange={onNumberChange('emsCost')} />
                  </label>
                ) : null}
              </div>

              <div className="calc-section">
                <h2>Finansowanie i pozostałe</h2>
                <label className="calc-label">
                  Roczna inflacja cen energii (%)
                  <input className="calc-input" type="number" step="0.1" value={formData.inflation} onChange={onNumberChange('inflation')} />
                </label>
                <label className="calc-label">
                  Dotacja - typ
                  <select
                    className="calc-select"
                    value={formData.subsidyType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subsidyType: e.target.value as SubsidyType }))}
                  >
                    <option value="fixed">Kwota stała (zł)</option>
                    <option value="percent">Procent inwestycji</option>
                  </select>
                </label>
                <label className="calc-label">
                  Wartość dotacji
                  <input className="calc-input" type="number" step="100" value={formData.subsidyValue} onChange={onNumberChange('subsidyValue')} />
                </label>
                <label className="calc-label">
                  Sposób finansowania
                  <select
                    className="calc-select"
                    value={formData.financing}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, financing: e.target.value as FinancingType }))
                    }
                  >
                    <option value="cash">Gotówka / własne środki</option>
                    <option value="credit">Kredyt</option>
                    <option value="leasing">Leasing</option>
                  </select>
                </label>
                <label className="calc-label">
                  Oprocentowanie (%)
                  <input className="calc-input" type="number" step="0.1" value={formData.interestRate} onChange={onNumberChange('interestRate')} />
                </label>
                <label className="calc-label">
                  Okres spłaty (lata)
                  <input className="calc-input" type="number" min="1" value={formData.loanYears} onChange={onNumberChange('loanYears')} />
                </label>
                <button className="calc-button" onClick={calculate} type="button">
                  OBLICZ
                </button>
                <button className="calc-button" onClick={saveConfig} type="button">
                  Zapisz konfigurację
                </button>
                <button className="calc-button" onClick={loadConfig} type="button">
                  Wczytaj konfigurację
                </button>
              </div>
            </div>
          ) : (
            <div className="calc-tabcontent" style={{ display: 'block' }}>
              {result ? (
                <>
                  <div className="calc-section">
                    <h2>Podstawowe parametry</h2>
                    <p><b>OSD:</b> {formData.distributor.toUpperCase()}</p>
                    <p><b>Taryfa:</b> {formData.tariff} | <b>Moc umowna:</b> {formData.contractedPower.toFixed(1)} kW</p>
                    <p><b>Moc istniejącej PV:</b> {formData.existingPvPower.toFixed(1)} kWp</p>
                    <p><b>Moc planowanej PV:</b> {formData.pvPower.toFixed(1)} kWp</p>
                    <p><b>Roczne zużycie:</b> {formData.annualConsumption.toLocaleString('pl-PL')} kWh</p>
                    <p><b>Produkcja PV:</b> {result.yearlyProduction.toFixed(0)} kWh</p>
                    <p><b>Autokonsumpcja:</b> {result.yearlyAutoconsumption.toFixed(0)} kWh</p>
                    <p><b>Eksport:</b> {result.yearlyExport.toFixed(0)} kWh | <b>Import:</b> {result.yearlyImport.toFixed(0)} kWh</p>
                  </div>
                  <div className="calc-section">
                    <h2>Miesięczna tabela kosztów i przepływów energii</h2>
                    <div className="table-wrapper">
                      <table className="calc-table">
                        <thead>
                          <tr>
                            <th>M-c</th>
                            <th>Zużycie (kWh)</th>
                            <th>Produkcja PV (kWh)</th>
                            <th>Autokonsumpcja (kWh)</th>
                            <th>Eksport łącznie (kWh)</th>
                            <th>Do sieci (kWh)</th>
                            <th>Do spółdz. (kWh)</th>
                            <th>Import (kWh)</th>
                            <th>Koszt całk. (zł)</th>
                            <th>Przychód (zł)</th>
                            <th>Bilans netto (zł)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.monthlyRows.map((row) => (
                            <tr key={row.month}>
                              <td>{row.month}</td>
                              <td>{row.consumption.toFixed(0)}</td>
                              <td>{row.production.toFixed(0)}</td>
                              <td>{row.autoconsumption.toFixed(0)}</td>
                              <td>{row.exportTotal.toFixed(0)}</td>
                              <td>{row.exportOsd.toFixed(0)}</td>
                              <td>{row.exportCoop.toFixed(0)}</td>
                              <td>{row.importValue.toFixed(0)}</td>
                              <td>{row.totalCost.toFixed(2)}</td>
                              <td>{row.revenue.toFixed(2)}</td>
                              <td className={row.net >= 0 ? 'positive' : 'negative'}>{row.net.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="calc-section">
                    <h2>Porównanie struktury kosztów rocznych</h2>
                    <div className="table-wrapper">
                      <table className="calc-table">
                        <thead>
                          <tr>
                            <th>Kategoria</th>
                            <th>Przed inwestycją (zł/rok)</th>
                            <th>Po inwestycji (zł/rok)</th>
                            <th>Różnica (zł)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Energia czynna', before: result.oldEnergyCost, after: result.newEnergyCost },
                            { name: 'Dystrybucja (zmienna)', before: result.oldDistTotal, after: result.newDistCost },
                            { name: 'Opłata stała sieciowa / abonament', before: result.oldFixedCost, after: formData.monthlySubscription * 12 },
                            { name: 'Opłata bilansowa spółdzielni', before: 0, after: result.newBalanceCost },
                            { name: 'EMS + opłata członkowska', before: 0, after: result.newFixed - formData.monthlySubscription * 12 },
                            { name: 'RAZEM koszty', before: result.oldEnergyCost + result.oldDistTotal + result.oldFixedCost, after: result.newTotalCost },
                            { name: 'Przychód ze sprzedaży', before: result.oldEnergyCost + result.oldDistTotal + result.oldFixedCost - result.oldNet, after: result.newRevenue },
                            { name: 'Bilans netto', before: result.oldNet, after: result.newNet },
                          ].map((row) => {
                            const diff = row.before - row.after;
                            return (
                              <tr key={row.name}>
                                <td style={{ textAlign: 'left' }}>{row.name}</td>
                                <td>{row.before.toFixed(2)}</td>
                                <td>{row.after.toFixed(2)}</td>
                                <td className={diff >= 0 ? 'positive' : 'negative'}>{diff.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="calc-section">
                    <h2>Podsumowanie roczne</h2>
                    <p>
                      Stary bilans netto: <b>{result.oldNet.toFixed(2)} zł</b>
                      <br />
                      Koszty po inwestycji: <b>{result.newTotalCost.toFixed(2)} zł</b>
                      <br />
                      Przychód po inwestycji: <b>{result.newRevenue.toFixed(2)} zł</b>
                      <br />
                      Nowy bilans netto: <b>{result.newNet.toFixed(2)} zł</b>
                      <br />
                      Roczne oszczędności: <b className="positive">{result.annualSaving.toFixed(2)} zł</b> (
                      {result.savingsPercent})
                    </p>
                  </div>
                  <div className="calc-section">
                    <h2>Wyniki inwestycji (25 lat)</h2>
                    <p>
                      Inwestycja netto: <b>{result.netInvestment.toFixed(0)} zł</b>
                      <br />
                      Prosty okres zwrotu:{' '}
                      <b>{Number.isFinite(result.payback) ? `${result.payback.toFixed(1)} lat` : '—'}</b>
                      <br />
                      ROI po 25 latach: <b className="positive">{result.roi.toFixed(1)} %</b>
                      <br />
                      NPV (7%): <b className="positive">{result.npv.toFixed(0)} zł</b>
                    </p>
                    <div style={{ height: 360, marginTop: 12 }}>
                      <canvas ref={cashflowCanvasRef} />
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <CalculationPdfReportButton
                        formData={formData}
                        result={result}
                        cashflowCanvas={cashflowCanvasRef.current}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="calc-section">
                  <p>Najpierw uzupełnij konfigurację i kliknij OBLICZ.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
