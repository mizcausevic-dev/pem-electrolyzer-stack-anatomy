export const FPS = 30;
export const TOTAL_FRAMES = 1020;
export const LAST_FRAME = TOTAL_FRAMES - 1;
export const W = 1920;
export const H = 1080;

export interface Chapter {
  n: number;
  id: 'mea' | 'water' | 'gas' | 'cooling' | 'bop';
  title: string;
  start: number;
  end: number;
  summary: string;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    n: 1,
    id: 'mea',
    title: 'MEA & plates',
    start: 0,
    end: 149,
    summary:
      'A section plane cuts through a generic PEM stack to reveal the repeating cell: bipolar plate, porous transport layer, catalyst-coated membrane and gas diffusion layer.',
  },
  {
    n: 2,
    id: 'water',
    title: 'Water feed',
    start: 150,
    end: 299,
    summary:
      'Deionized water fills the anode inlet manifold, rises through each anode flow channel and reaches the anode catalyst layer through the porous transport layer.',
  },
  {
    n: 3,
    id: 'gas',
    title: 'Gas evolution',
    start: 300,
    end: 509,
    summary:
      'With DC power applied, water is oxidized at the anode (2H2O to O2 + 4H+ + 4e-). Protons cross the membrane, electrons take the external path, and hydrogen forms at the cathode (4H+ + 4e- to 2H2).',
  },
  {
    n: 4,
    id: 'cooling',
    title: 'Cooling',
    start: 510,
    end: 749,
    summary:
      'Losses inside the cells appear as heat. Circulating anode water carries that heat out of the stack to a heat exchanger, and temperature sensors close the control loop.',
  },
  {
    n: 5,
    id: 'bop',
    title: 'Balance of plant',
    start: 750,
    end: 1019,
    summary:
      'Pulling back, the stack becomes one block in a system: power conversion, water treatment, gas-liquid separation, hydrogen purification, heat rejection and controls.',
  },
];

export function chapterAt(frame: number): Chapter {
  for (const c of CHAPTERS) if (frame <= c.end) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

export function timecode(frame: number): string {
  const s = Math.floor(frame / FPS);
  const ff = frame % FPS;
  return `00:${String(s).padStart(2, '0')}.${String(ff).padStart(2, '0')}`;
}
