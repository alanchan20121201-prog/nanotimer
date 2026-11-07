'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveModePlacement } = require('../src/main/display-placement');

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
const capsule = { width: 348, height: 236 };
const mini = { width: 208, height: 208 };

test('returns the remembered corner for a normal mode change', () => {
  const result = resolveModePlacement({
    from: { x: 500, y: 400, ...mini },
    size: capsule,
    workArea,
    remembered: { x: 120, y: 240 }
  });

  assert.deepEqual(result, { x: 120, y: 240 });
});

test('centres on the current window when the mode has no corner yet', () => {
  const result = resolveModePlacement({
    from: { x: 500, y: 400, ...mini },
    size: capsule,
    workArea
  });

  assert.deepEqual(result, { x: 430, y: 386 });
});

test('a capsule blooming out of the mini circle ignores the remembered corner', () => {
  const result = resolveModePlacement({
    from: { x: 500, y: 400, ...mini },
    size: capsule,
    workArea,
    remembered: { x: 120, y: 240 },
    bloomFromMini: true
  });

  // Same centre as the circle, so the pointer never leaves the panel.
  assert.deepEqual(result, { x: 430, y: 386 });
});

test('leaving fullscreen centres instead of reusing a remembered corner', () => {
  const result = resolveModePlacement({
    from: { x: 0, y: 0, width: 1920, height: 1080 },
    size: capsule,
    workArea,
    remembered: { x: 900, y: 700 },
    restoredFromFullscreen: true
  });

  assert.deepEqual(result, { x: 786, y: 422 });
});

test('clamps a remembered corner to the work area', () => {
  const result = resolveModePlacement({
    from: { x: 0, y: 0, ...mini },
    size: capsule,
    workArea,
    remembered: { x: 1900, y: -40 }
  });

  assert.deepEqual(result, { x: 1572, y: 0 });
});

test('ignores a malformed remembered corner and centres instead', () => {
  const result = resolveModePlacement({
    from: { x: 500, y: 400, ...mini },
    size: capsule,
    workArea,
    remembered: { x: 120 }
  });

  assert.deepEqual(result, { x: 430, y: 386 });
});

test('returns null when the current bounds are unusable', () => {
  assert.equal(
    resolveModePlacement({
      from: { x: 0, y: 0 },
      size: capsule,
      workArea
    }),
    null
  );
});
