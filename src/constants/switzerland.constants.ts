/**
 * Swiss cantons and related constants
 * Used across the application for location selection (posts, therapists, user profiles)
 */

export interface Canton {
  code: string
  name: string
}

export const SWISS_CANTONS: Canton[] = [
  { code: '', name: 'Kanton auswählen' },
  { code: 'AG', name: 'Aargau' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'BE', name: 'Bern' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' },
  { code: 'GE', name: 'Genf' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Waadt' },
  { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' }
]

/**
 * Bordering cantons for each canton (curated, symmetric land-adjacency map).
 * Used to expand a user's default canton to its neighbours when filtering the
 * forum — no coordinates/geocoding, just a lookup. Codes only.
 */
export const CANTON_NEIGHBORS: Record<string, string[]> = {
  AG: ['ZH', 'ZG', 'LU', 'SO', 'BL', 'BE'],
  AI: ['SG', 'AR'],
  AR: ['SG', 'AI'],
  BE: ['JU', 'SO', 'AG', 'LU', 'OW', 'UR', 'VS', 'FR', 'VD', 'NE'],
  BL: ['BS', 'SO', 'AG', 'JU'],
  BS: ['BL'],
  FR: ['BE', 'VD', 'NE'],
  GE: ['VD'],
  GL: ['SZ', 'UR', 'GR', 'SG'],
  GR: ['SG', 'GL', 'UR', 'TI'],
  JU: ['BE', 'SO', 'BL', 'NE'],
  LU: ['AG', 'ZG', 'SZ', 'NW', 'OW', 'BE'],
  NE: ['VD', 'FR', 'BE', 'JU'],
  NW: ['LU', 'OW', 'UR'],
  OW: ['BE', 'LU', 'NW', 'UR'],
  SG: ['ZH', 'TG', 'AR', 'AI', 'GR', 'GL', 'SZ'],
  SH: ['ZH', 'TG'],
  SO: ['BE', 'JU', 'BL', 'AG'],
  SZ: ['ZH', 'ZG', 'LU', 'UR', 'GL', 'SG'],
  TG: ['ZH', 'SH', 'SG'],
  TI: ['UR', 'VS', 'GR'],
  UR: ['BE', 'OW', 'NW', 'SZ', 'GL', 'GR', 'TI', 'VS'],
  VD: ['GE', 'VS', 'FR', 'NE', 'BE'],
  VS: ['VD', 'BE', 'UR', 'TI'],
  ZG: ['ZH', 'AG', 'LU', 'SZ'],
  ZH: ['AG', 'ZG', 'SZ', 'SG', 'TG', 'SH']
}
