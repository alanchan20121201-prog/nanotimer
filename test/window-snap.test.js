'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDGE_SNAP_DISTANCE, snapPosition } = require('../src/main/window-snap');

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };

test('snaps to the nearest horizontal edge within threshold', () => {
  const result = snapPosition(
    { x: 8, y: 200, width: 300, height: 150 },
    workArea
  );
  assert.equal(result.x, 0);
  assert.equal(result.y, 200);
  assert.equal(result.snappedX, true);
});

test('does not snap outside the threshold', () => {
  const result = snapPosition(
    { x: EDGE_SNAP_DISTANCE + 1, y: 200, width: 300, height: 150 },
    workArea
  );
  assert.equal(result.x, EDGE_SNAP_DISTANCE + 1);
  assert.equal(result.snappedX, false);
});

test('snaps to the bottom-right edge within threshold', () => {
  const result = snapPosition(
    { x: 1610, y: 920, width: 300, height: 150 },
    workArea
  );
  assert.equal(result.x, 1620);
  assert.equal(result.y, 930);
  assert.equal(result.snappedX, true);
  assert.equal(result.snappedY, true);
});
