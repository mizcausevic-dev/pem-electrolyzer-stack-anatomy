import { Projector, cameraAt, sectionCutAt } from './camera.ts';
import { LAST_FRAME } from './constants.ts';
import { clamp } from './math.ts';
import { drawExterior, drawExteriorLabels } from './scenes/exterior.ts';
import { drawElectrons, drawGas, drawThermalField, drawWater } from './scenes/flows.ts';
import { drawBackground, drawHud, drawHudFades } from './scenes/hud.ts';
import { drawSceneLabels } from './scenes/labels.ts';
import { drawMicro, drawMicroOverlay } from './scenes/micro.ts';
import { drawPlant, drawPlantLabels } from './scenes/plant.ts';
import { drawFocusSpotlight, drawSection } from './scenes/section.ts';

export interface RenderOptions {
  hud?: boolean;
}

/**
 * Renders one frame onto a 1920x1080 context. The output depends only on the
 * frame index: no clocks, no stored state, no unseeded randomness.
 */
export function renderFrame(ctx: CanvasRenderingContext2D, frame: number, opts: RenderOptions = {}): void {
  const f = clamp(Math.round(frame), 0, LAST_FRAME);
  const cam = cameraAt(f);
  const proj = new Projector(cam);
  const zCut = sectionCutAt(f);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.setLineDash([]);
  drawBackground(ctx);

  if (!proj.flat) drawExterior(ctx, proj, f, zCut);

  proj.setPlane(ctx, zCut);
  drawPlant(ctx, proj, f);
  proj.setPlane(ctx, zCut);
  drawSection(ctx, proj, zCut);
  drawThermalField(ctx, proj, f);
  drawWater(ctx, proj, f);
  drawGas(ctx, proj, f);
  drawElectrons(ctx, proj, f);
  drawFocusSpotlight(ctx, f, zCut);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawMicro(ctx, proj, f);
  // Fades sit between the stage and the annotation layer so panels and callouts stay full strength.
  if (opts.hud !== false) drawHudFades(ctx);
  if (!proj.flat || f < 130) drawExteriorLabels(ctx, proj, f, zCut);
  drawSceneLabels(ctx, proj, f);
  drawPlantLabels(ctx, proj, f);
  drawMicroOverlay(ctx, proj, f);

  if (opts.hud !== false) drawHud(ctx, f, proj);
  ctx.restore();
}
