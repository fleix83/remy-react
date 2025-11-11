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
