import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFrame } from '../src/engine/render.ts';
import { renderHero } from '../src/engine/hero.ts';
import { CHAPTERS, LAST_FRAME } from '../src/engine/constants.ts';

/**
 * Minimal CanvasRenderingContext2D stand-in that folds every state write and
 * draw call into an FNV-1a hash. Two renders are identical iff their hashes match.
 */
class RecordingContext {
  private h = 0x811c9dc5;
  private state: Record<string, unknown> = { font: '10px sans-serif', globalAlpha: 1 };
  private stack: Record<string, unknown>[] = [];
  calls = 0;
  texts: string[] = [];

  private mix(s: string): void {
    this.calls++;
    for (let i = 0; i < s.length; i++) {
      this.h ^= s.charCodeAt(i);
      this.h = Math.imul(this.h, 0x01000193) >>> 0;
    }
  }
  digest(): string {
    return this.h.toString(16).padStart(8, '0');
  }

  constructor() {
    const props = [
      'fillStyle',
      'strokeStyle',
      'lineWidth',
      'globalAlpha',
      'textBaseline',
      'textAlign',
      'lineDashOffset',
      'lineJoin',
      'lineCap',
    ];
    for (const p of [...props, 'font']) {
      Object.defineProperty(this, p, {
        get: () => this.state[p],
        set: (nv: unknown) => {
          this.state[p] = nv;
          this.mix(`${p}=${typeof nv === 'object' ? (nv as { id: string }).id : String(nv)}`);
        },
      });
    }
    const methods = [
      'beginPath',
      'closePath',
      'moveTo',
      'lineTo',
      'arc',
      'rect',
      'roundRect',
      'fill',
      'stroke',
      'fillRect',
      'strokeRect',
      'fillText',
      'clip',
      'setTransform',
      'setLineDash',
    ];
    for (const m of methods) {
      (this as unknown as Record<string, (...a: unknown[]) => void>)[m] = (...args: unknown[]) => {
        if (m === 'fillText') this.texts.push(`${String(args[0])}@${String((this as unknown as { globalAlpha: number }).globalAlpha)}`);
        this.mix(`${m}(${args.map((a) => (Array.isArray(a) ? a.join(',') : String(a))).join(',')})`);
      };
    }
  }

  save(): void {
    this.stack.push({ ...this.state });
    this.mix('save');
  }
  restore(): void {
    this.state = this.stack.pop() ?? this.state;
    this.mix('restore');
  }
  measureText(t: string): { width: number } {
    const size = Number(/([\d.]+)px/.exec(String(this.state.font))?.[1] ?? 10);
    return { width: t.length * size * 0.56 };
  }
  private grad(kind: string, args: number[]) {
    const id = `${kind}(${args.join(',')})`;
    const stops: string[] = [];
    const g = {
      get id() {
        return `${id}[${stops.join(';')}]`;
      },
      addColorStop: (o: number, c: string) => stops.push(`${o}:${c}`),
    };
    return g;
  }
  createLinearGradient(...a: number[]) {
    return this.grad('lin', a);
  }
  createRadialGradient(...a: number[]) {
    return this.grad('rad', a);
  }
}

function hashFrame(f: number, hud = true): { digest: string; calls: number; texts: string[] } {
  const ctx = new RecordingContext();
  renderFrame(ctx as unknown as CanvasRenderingContext2D, f, { hud });
  return { digest: ctx.digest(), calls: ctx.calls, texts: ctx.texts };
}

const CLOCK = /^(\d\d:\d\d\.\d\d|F \d{4} \/ .*)@/;

const SAMPLES = [0, 60, 149, 150, 230, 299, 300, 392, 420, 509, 510, 640, 749, 750, 905, LAST_FRAME];

test('same frame index always produces the same draw stream', () => {
  for (const f of SAMPLES) {
    const a = hashFrame(f);
    const b = hashFrame(f);
    assert.equal(a.digest, b.digest, `frame ${f}`);
    assert.ok(a.calls > 500, `frame ${f} drew only ${a.calls} calls`);
  }
});

test('render order does not matter: no hidden state carries between frames', () => {
  const fresh = new Map(SAMPLES.map((f) => [f, hashFrame(f).digest]));
  const shuffled = [...SAMPLES].reverse();
  for (const f of shuffled) {
    hashFrame((f * 7919) % (LAST_FRAME + 1));
    assert.equal(hashFrame(f).digest, fresh.get(f), `frame ${f} changed after rendering other frames`);
  }
});

test('frames inside every chapter differ, so the timeline actually moves', () => {
  const digests = new Set(CHAPTERS.flatMap((c) => [c.start + 5, Math.floor((c.start + c.end) / 2)]).map((f) => hashFrame(f).digest));
  assert.equal(digests.size, CHAPTERS.length * 2);
});

test('closing view keeps every label at full, unchanging opacity for the last two seconds', () => {
  // Flow dashes and bubbles keep moving to show circulation, so pixels differ; the annotation layer must not.
  const texts = (f: number) => hashFrame(f).texts.filter((t) => !CLOCK.test(t));
  const end = texts(LAST_FRAME);
  assert.ok(end.length > 40, `only ${end.length} text runs on the final frame`);
  for (let f = LAST_FRAME - 59; f < LAST_FRAME; f += 7) assert.deepEqual(texts(f), end, `frame ${f}`);
});

test('out-of-range and fractional frame indices clamp to valid frames', () => {
  assert.equal(hashFrame(-50).digest, hashFrame(0).digest);
  assert.equal(hashFrame(5000).digest, hashFrame(LAST_FRAME).digest);
  assert.equal(hashFrame(41.6).digest, hashFrame(42).digest);
});

test('hero image render is deterministic', () => {
  const a = new RecordingContext();
  const b = new RecordingContext();
  renderHero(a as unknown as CanvasRenderingContext2D);
  renderHero(b as unknown as CanvasRenderingContext2D);
  assert.equal(a.digest(), b.digest());
});
