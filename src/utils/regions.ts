const REGION_PAIRS: Array<{ api: string; label: string }> = [
  { api: 'Dolnoslaskie', label: 'Dolnośląskie' },
  { api: 'Kujawsko-pomorskie', label: 'Kujawsko-pomorskie' },
  { api: 'Lubelskie', label: 'Lubelskie' },
  { api: 'Lubuskie', label: 'Lubuskie' },
  { api: 'Lodzkie', label: 'Łódzkie' },
  { api: 'Malopolskie', label: 'Małopolskie' },
  { api: 'Mazowieckie', label: 'Mazowieckie' },
  { api: 'Opolskie', label: 'Opolskie' },
  { api: 'Podkarpackie', label: 'Podkarpackie' },
  { api: 'Podlaskie', label: 'Podlaskie' },
  { api: 'Pomorskie', label: 'Pomorskie' },
  { api: 'Slaskie', label: 'Śląskie' },
  { api: 'Swietokrzyskie', label: 'Świętokrzyskie' },
  { api: 'Warminsko-mazurskie', label: 'Warmińsko-mazurskie' },
  { api: 'Wielkopolskie', label: 'Wielkopolskie' },
  { api: 'Zachodniopomorskie', label: 'Zachodniopomorskie' },
];

function normalizeRegionKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z-]/g, '');
}

const regionByApiKey = new Map(REGION_PAIRS.map((entry) => [normalizeRegionKey(entry.api), entry.label]));
const apiByRegionKey = new Map(
  REGION_PAIRS.flatMap((entry) => [
    [normalizeRegionKey(entry.api), entry.api],
    [normalizeRegionKey(entry.label), entry.api],
  ]),
);

export function toDisplayRegion(region: string | null | undefined): string {
  if (!region) return '';
  return regionByApiKey.get(normalizeRegionKey(region)) ?? region;
}

export function toApiRegion(region: string | null | undefined): string {
  if (!region) return '';
  return apiByRegionKey.get(normalizeRegionKey(region)) ?? region;
}
