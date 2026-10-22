import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Projector, cameraAt, sectionCutAt } from '../src/engine/camera.ts';
import { LAST_FRAME } from '../src/engine/constants.ts';

test('camera has no cuts: per-frame zoom, pan and rotation steps stay bounded', () => {
  for (let f = 0; f < LAST_FRAME; f++) {
    const a = cameraAt(f);
    const b = cameraAt(f + 1);
    const zoomStep = Math.abs(Math.log(b.zoom / a.zoom));
    assert.ok(zoomStep < 0.2, `zoom step ${zoomStep.toFixed(3)} at frame ${f}`);
    const qa = new Projector(a).project(a.tx, a.ty, 0);
    const qb = new Projector(b).project(a.tx, a.ty, 0);
    const pan = Math.hypot(qb.x - qa.x, qb.y - qa.y);
    assert.ok(pan < 70, `screen pan ${pan.toFixed(1)} px at frame ${f}`);
    assert.ok(Math.abs(b.yaw - a.yaw) < 0.05 && Math.abs(b.pitch - a.pitch) < 0.05, `rotation step at frame ${f}`);
  }
});

test('the closing system view holds still for the last two seconds', () => {
  const end = cameraAt(LAST_FRAME);
  for (let f = LAST_FRAME - 59; f <= LAST_FRAME; f++) assert.deepEqual(cameraAt(f), end, `frame ${f}`);
});

test('section plane sweeps once, monotonically, then stays at the mid-plane', () => {
  let prev = sectionCutAt(0);
  for (let f = 1; f <= LAST_FRAME; f++) {
    const z = sectionCutAt(f);
    assert.ok(z <= prev + 1e-9, `section plane moved back at frame ${f}`);
    prev = z;
  }
  assert.equal(sectionCutAt(80), 0);
  assert.equal(sectionCutAt(LAST_FRAME), 0);
});
