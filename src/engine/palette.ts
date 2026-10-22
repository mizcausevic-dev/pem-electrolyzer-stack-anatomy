/**
 * Accent colors are explanatory overlays, not literal emission:
 * cyan = primary pathway (water, protons, hydrogen), gold = energy or actuation,
 * violet = sensing or state change.
 */
export const C = {
  stage: '#0B1019',
  stageLift: '#111A28',
  grid: 'rgba(130, 150, 182, 0.055)',

  struct: '#344257',
  structLight: '#4B5B73',
  structDark: '#232E3E',
  void: '#060A11',

  steel: '#3A475B',
  steelLight: '#55647B',
  titanium: '#57667C',
  titaniumLight: '#76859B',
  titaniumDark: '#3E4B5E',
  ptlBase: '#26313F',
  ptlGrain: '#66758B',
  aclBase: '#2A3446',
  aclGrain: '#8C9AB0',
  membrane: '#AEBACB',
  cclBase: '#171C24',
  cclCarbon: '#353C47',
  cclPt: '#C9D0DB',
  gdlBase: '#1A2029',
  gdlFiber: '#47505E',
  gasket: '#1C232C',
  copper: '#7A604D',
  copperLight: '#9A7B63',

  ink: '#E8EDF5',
  inkDim: '#A3B0C2',
  inkFaint: '#66758B',
  line: 'rgba(232, 237, 245, 0.18)',

  cyan: '#00E5FF',
  gold: '#FFD166',
  violet: '#9D4EDD',
  violetText: '#CDA6F5',
  o2: '#DCE3EC',

  panel: 'rgba(12, 18, 29, 0.78)',
  panelBorder: 'rgba(232, 237, 245, 0.10)',
} as const;

export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(4)})`;
}
