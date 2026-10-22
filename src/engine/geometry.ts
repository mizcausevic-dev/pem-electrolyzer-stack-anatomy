/**
 * Generic PEM stack layout in illustrative world units (not millimetres).
 * x = stacking axis, y = height, z = depth. Layer thicknesses are exaggerated
 * so the catalyst layers and membrane stay legible; the on-screen label says so.
 */
export const CELLS = 8;
export const PITCH = 50;
export const FOCUS_CELL = 3;

/** Offsets inside one repeating cell, measured from the cell origin. */
export const L = {
  bpp: [0, 16],
  chanCathode: [0, 4], // left face of the plate serves the previous cell's cathode
  web: [4, 12],
  chanAnode: [12, 16],
  ptl: [16, 26],
  acl: [26, 31],
  mem: [31, 37],
  ccl: [37, 42],
  gdl: [42, 50],
} as const;

export const Y = {
  active: 120,
  seal: 130,
  membrane: 132,
  plate: 186,
  endPlate: 200,
  tabTop: 236,
  inletHdr: [-160, -144],
  outletHdr: [138, 154],
  h2Hdr: [164, 178],
} as const;

export const Z = { plate: 150, endPlate: 166, tab: 40, rod: 160 } as const;

export const X = {
  leftEnd: [-244, -214],
  leftCol: [-214, -208],
  rightCol: [208, 214],
  rightEnd: [214, 244],
  firstCell: -208,
} as const;

export const cellOrigin = (k: number): number => X.firstCell + k * PITCH;
/** Plate k (0..CELLS) sits at the start of cell k; plate CELLS is the final plate. */
export const plateOrigin = cellOrigin;

export const FOCUS_O = cellOrigin(FOCUS_CELL);
export const FOCUS_MEM_X = FOCUS_O + (L.mem[0] + L.mem[1]) / 2;

/** Centre-line x of cell k's anode channel and cathode channel. */
export const anodeChanX = (k: number): number => cellOrigin(k) + (L.chanAnode[0] + L.chanAnode[1]) / 2;
export const cathodeChanX = (k: number): number => cellOrigin(k + 1) + (L.chanCathode[0] + L.chanCathode[1]) / 2;

export const INLET_Y = (Y.inletHdr[0] + Y.inletHdr[1]) / 2;
export const OUTLET_Y = (Y.outletHdr[0] + Y.outletHdr[1]) / 2;
export const H2_Y = (Y.h2Hdr[0] + Y.h2Hdr[1]) / 2;
export const ANODE_HDR_END = anodeChanX(CELLS - 1) + 3;
export const H2_HDR_START = cathodeChanX(0) - 3;

export const TAB_LEFT_X = (X.leftCol[0] + X.leftCol[1]) / 2;
export const TAB_RIGHT_X = (X.rightCol[0] + X.rightCol[1]) / 2;
