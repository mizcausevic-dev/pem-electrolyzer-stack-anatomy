import { Projector } from './camera.ts';
import { H, W } from './constants.ts';
import { glassPanel, label } from './draw.ts';
import { FOCUS_O, L, X, cathodeChanX, anodeChanX, OUTLET_Y } from './geometry.ts';
import { C } from './palette.ts';
import { drawExterior } from './scenes/exterior.ts';
import { drawElectrons, drawGas, drawWater } from './scenes/flows.ts';
import { drawBackground } from './scenes/hud.ts';
import { drawSection } from './scenes/section.ts';
import { drawRich, font } from './text.ts';

const DEG = Math.PI / 180;
/** Flow state borrowed from chapter 03 so water, gas and current are all present. */
const FLOW_FRAME = 486;

/** Static hero / social card composition, rendered by the same engine as the animation. */
export function renderHero(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground(ctx);

  const proj = new Projector({ tx: -175, ty: 30, zoom: 1.62, yaw: 30 * DEG, pitch: 14 * DEG });
  drawExterior(ctx, proj, 300, 0);
  proj.setPlane(ctx, 0);
  drawSection(ctx, proj, 0);
  drawWater(ctx, proj, FLOW_FRAME);
  drawGas(ctx, proj, FLOW_FRAME);
  drawElectrons(ctx, proj, FLOW_FRAME);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const P = (x: number, y: number) => proj.project(x, y, 0);
  label(ctx, P(FOCUS_O + L.mem[0] + 3, -60), 'Membrane electrode assembly', { dx: -90, dy: 250, sub: 'catalyst-coated membrane + transport layers', size: 20 });
  label(ctx, P(cathodeChanX(5), 60), 'H_2 out', { dx: 130, dy: -60, accent: C.cyan, sub: 'primary pathway', size: 20 });
  label(ctx, P(X.leftEnd[0] + 10, OUTLET_Y), 'O_2 + water out', { dx: -40, dy: -110, accent: C.o2, size: 20 });
  label(ctx, P(anodeChanX(1), -40), 'Water in', { dx: -60, dy: 190, accent: C.cyan, size: 20 });
  label(ctx, P(-140, 300), 'DC power', { dx: 120, dy: -40, accent: C.gold, size: 20 });

  const fade = ctx.createLinearGradient(0, 0, 820, 0);
  fade.addColorStop(0, 'rgba(11,16,25,0.96)');
  fade.addColorStop(0.75, 'rgba(11,16,25,0.75)');
  fade.addColorStop(1, 'rgba(11,16,25,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 820, H);

  ctx.textBaseline = 'alphabetic';
  ctx.font = font(18, 600, 'mono');
  ctx.fillStyle = C.inkDim;
  ctx.fillText('HYDROGEN & FUEL CELL SYSTEMS', 96, 300);
  ctx.font = font(76, 700);
  ctx.fillStyle = C.ink;
  ctx.fillText('Inside a PEM', 92, 392);
  ctx.fillText('electrolyzer stack', 92, 476);
  ctx.font = font(27, 500);
  ctx.fillStyle = C.inkDim;
  ctx.fillText('A frame-exact anatomy explainer, built in code.', 96, 540);
  ctx.fillText('34 seconds. 1,020 deterministic frames.', 96, 578);

  drawRich(ctx, '2H_2O -> 2H_2 + O_2', 96, 664, { size: 30, weight: 500, family: 'mono', color: C.ink });

  const chips: [string, string][] = [
    [C.cyan, 'primary pathway'],
    [C.gold, 'energy'],
    [C.violet, 'sensing / state'],
  ];
  let cx = 96;
  for (const [col, t] of chips) {
    ctx.font = font(17, 600, 'mono');
    const w = ctx.measureText(t).width + 44;
    glassPanel(ctx, cx, 712, w, 40, 20);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx + 20, 732, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillText(t, cx + 34, 738);
    cx += w + 10;
  }

  ctx.font = font(14, 500, 'mono');
  ctx.fillStyle = C.inkFaint;
  ctx.fillText('Generic PEM schematic \u00b7 illustrative, not a certified design \u00b7 mechanism: U.S. DOE', 96, H - 64);
  ctx.textAlign = 'right';
  ctx.fillText('section view \u00b7 layer thickness exaggerated', W - 64, H - 64);
  ctx.textAlign = 'left';
  ctx.restore();
}
