export const VOIVODESHIPS = [
  'Dolnoslaskie',
  'Kujawsko-pomorskie',
  'Lubelskie',
  'Lubuskie',
  'Lodzkie',
  'Malopolskie',
  'Mazowieckie',
  'Opolskie',
  'Podkarpackie',
  'Podlaskie',
  'Pomorskie',
  'Slaskie',
  'Swietokrzyskie',
  'Warminsko-mazurskie',
  'Wielkopolskie',
  'Zachodniopomorskie',
] as const;

export type VoivodeshipName = (typeof VOIVODESHIPS)[number];
