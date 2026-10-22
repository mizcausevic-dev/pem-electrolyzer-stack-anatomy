import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, FPS, LAST_FRAME, TOTAL_FRAMES, chapterAt, timecode } from '../src/engine/constants.ts';
import { BADGES, CAPTIONS, NOTES } from '../src/engine/scenes/hud.ts';

test('format matches the brief: 34 s at 30 fps, frames 0-1019', () => {
  assert.equal(FPS, 30);
  assert.equal(TOTAL_FRAMES, 1020);
  assert.equal(LAST_FRAME, 1019);
  assert.equal(TOTAL_FRAMES / FPS, 34);
});

test('chapter boundaries match the brief exactly and tile the timeline', () => {
  const expected = [
    [0, 149],
    [150, 299],
    [300, 509],
    [510, 749],
    [750, 1019],
  ];
  assert.deepEqual(
    CHAPTERS.map((c) => [c.start, c.end]),
    expected,
  );
  for (let i = 1; i < CHAPTERS.length; i++) assert.equal(CHAPTERS[i].start, CHAPTERS[i - 1].end + 1);
});

test('chapterAt resolves boundary frames to the right chapter', () => {
  const cases: [number, number][] = [
    [0, 1],
    [149, 1],
    [150, 2],
    [299, 2],
    [300, 3],
    [509, 3],
    [510, 4],
    [749, 4],
    [750, 5],
    [1019, 5],
  ];
  for (const [f, n] of cases) assert.equal(chapterAt(f).n, n, `frame ${f}`);
});

test('timecode is seconds plus frames', () => {
  assert.equal(timecode(0), '00:00.00');
  assert.equal(timecode(149), '00:04.29');
  assert.equal(timecode(1019), '00:33.29');
});

test('closing caption, note and scale badge are fully visible on the final frame', () => {
  for (const list of [CAPTIONS, NOTES, BADGES]) {
    const last = list[list.length - 1];
    assert.ok(last.a < LAST_FRAME && last.b > LAST_FRAME + 12, `${last.text} must not fade before frame ${LAST_FRAME}`);
  }
});

test('every scale, slow-motion and time-compression change is labeled on screen', () => {
  const text = BADGES.map((b) => b.text).join(' | ');
  for (const needle of ['SCALE CHANGE', 'SLOW MOTION', 'TIME COMPRESSED', 'NOT TO SCALE', 'NOT DISASSEMBLY']) {
    assert.ok(text.includes(needle), `missing badge: ${needle}`);
  }
});
