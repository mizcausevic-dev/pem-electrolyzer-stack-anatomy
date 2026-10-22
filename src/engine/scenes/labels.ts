import type { Projector } from '../camera.ts';
import { FOCUS_CELL, FOCUS_O, L, cathodeChanX, anodeChanX, cellOrigin, plateOrigin, INLET_Y, X } from '../geometry.ts';
import { bracket, label } from '../draw.ts';
import { C } from '../palette.ts';
import { win } from '../math.ts';
import { DC_LEFT } from './flows.ts';

const o = FOCUS_O;

/** Callouts for chapters 01 to 04 that are anchored to stack geometry. */
export function drawSceneLabels(ctx: CanvasRenderingContext2D, proj: Projector, f: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const P = (x: number, y: number) => proj.project(x, y, 0);
  const w = (a: number, b: number) => win(f, a, b, 10, 12);

  // 01 MEA & plates: layer callouts once the camera faces the cut.
  if (f >= 108 && f <= 200) {
    label(ctx, P(o + 8, 55), 'Bipolar plate', { dx: -190, dy: -24, sub: 'typ. coated titanium; separates cells', alpha: w(112, 190) });
    label(ctx, P(anodeChanX(FOCUS_CELL), 30), 'Anode flow channel', { dx: -230, dy: 4, accent: C.cyan, sub: 'section through one channel', alpha: w(116, 190) });
    label(ctx, P(o + 21, 8), 'Porous transport layer', { dx: -250, dy: 12, sub: 'typ. sintered titanium', alpha: w(120, 190) });
    label(ctx, P(o + 28.5, -18), 'Anode catalyst layer', { dx: -250, dy: 30, sub: 'typ. iridium oxide', alpha: w(124, 190) });
    label(ctx, P(o + 34, 50), 'Proton exchange membrane', { dx: 230, dy: -36, sub: 'solid polymer electrolyte (PFSA)', alpha: w(126, 190) });
    label(ctx, P(o + 39.5, 22), 'Cathode catalyst layer', { dx: 250, dy: -8, sub: 'typ. platinum on carbon', alpha: w(130, 190) });
    label(ctx, P(o + 46, -4), 'Gas diffusion layer', { dx: 240, dy: 20, sub: 'typ. carbon paper', alpha: w(134, 190) });
    label(ctx, P(cathodeChanX(FOCUS_CELL), -24), 'Cathode flow channel', { dx: 200, dy: 26, accent: C.cyan, alpha: w(138, 190) });
    const a = P(o + L.ptl[0], 0);
    const b = P(o + L.gdl[1], 0);
    bracket(ctx, a.x, b.x, 252, 'Membrane electrode assembly (MEA)', C.inkDim, w(118, 192), 'catalyst-coated membrane + transport layers');
  }

  // 02 Water feed.
  if (f >= 180 && f <= 312) {
    label(ctx, P(X.leftEnd[0], INLET_Y), 'Deionized water in', { dx: 90, dy: -110, accent: C.cyan, sub: 'from the water loop (shown in chapter 04)', alpha: w(184, 246) });
    label(ctx, P(-130, INLET_Y - 8), 'Anode inlet manifold', { dx: 60, dy: 70, accent: C.cyan, sub: 'feeds every cell in parallel', alpha: w(190, 246) });
    label(ctx, P(anodeChanX(FOCUS_CELL), -132), 'Port into each anode channel', { dx: 110, dy: -70, accent: C.cyan, alpha: w(198, 250) });
    label(ctx, P(anodeChanX(FOCUS_CELL), 30), 'Water rises in the anode channel', { dx: -230, dy: -40, accent: C.cyan, alpha: w(246, 310) });
    label(ctx, P(o + 22, 0), 'Porous titanium carries water to the catalyst', { dx: 210, dy: 70, accent: C.cyan, alpha: w(254, 310) });
    label(ctx, P(cathodeChanX(FOCUS_CELL), -40), 'Cathode side: no liquid feed', { dx: 190, dy: 50, sub: 'generic anode-feed configuration', alpha: w(262, 310) });
  }

  // 03 Gas evolution: DC connection before the push-in, gas paths after the pull-back.
  if (f >= 314 && f <= 362) {
    label(ctx, P(DC_LEFT[2][0], DC_LEFT[2][1]), 'DC power applied', { dx: -60, dy: 70, accent: C.gold, sub: 'electrons leave the + end and return at the \u2212 end', alpha: w(318, 360) });
    label(ctx, P(plateOrigin(5) + 8, 40), 'Electrons cross each bipolar plate', { dx: 120, dy: 60, accent: C.gold, sub: 'cells are connected in series', alpha: w(324, 360) });
  }
  if (f >= 462 && f <= 530) {
    label(ctx, P(anodeChanX(FOCUS_CELL), 100), 'O_2 + water to the outlet manifold', { dx: -220, dy: -10, accent: C.o2, alpha: w(466, 528) });
    label(ctx, P(cathodeChanX(FOCUS_CELL), 116), 'H_2 to the cathode manifold', { dx: 170, dy: -46, accent: C.cyan, sub: 'dashed: behind the section plane', alpha: w(470, 528) });
    label(ctx, P(cathodeChanX(FOCUS_CELL + 1), 30), '2 H_2 : 1 O_2 by moles', { dx: 170, dy: 60, accent: C.cyan, sub: 'bubble rates follow the stoichiometry', alpha: w(474, 528) });
  }

  // 04 Cooling: stack-side callouts (loop callouts live with the plant).
  if (f >= 530 && f <= 760) {
    label(ctx, P(cellOrigin(2) + 34, 40), 'Heat from cell losses', { dx: 150, dy: -110, accent: C.gold, sub: 'overpotentials and ohmic resistance (qualitative)', alpha: w(540, 700) });
    label(ctx, P(150, -60), 'Temperature field', { dx: -40, dy: 230, accent: C.gold, tag: 'FIELD', sub: 'qualitative, no values; warms along the flow path', alpha: w(560, 752) });
  }
  ctx.restore();
}

