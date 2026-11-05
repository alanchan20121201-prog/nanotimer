'use strict';

const EDGE_SNAP_DISTANCE = 20;

/**
 * Return the nearest work-area edge position for a window.
 *
 * The caller applies this after the native drag settles. Using the display's
 * work area (rather than its full bounds) keeps the widget above the taskbar
 * and dock.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {{ x: number, y: number, width: number, height: number }} workArea
 * @param {number} [threshold]
 */
function snapPosition(bounds, workArea, threshold = EDGE_SNAP_DISTANCE) {
  const values = [
    bounds?.x,
    bounds?.y,
    bounds?.width,
    bounds?.height,
    workArea?.x,
    workArea?.y,
    workArea?.width,
    workArea?.height,
    threshold
  ];

  if (!values.every(Number.isFinite)) {
    return {
      x: Number.isFinite(bounds?.x) ? bounds.x : 0,
      y: Number.isFinite(bounds?.y) ? bounds.y : 0,
      snappedX: false,
      snappedY: false
    };
  }

  const right = workArea.x + Math.max(0, workArea.width - bounds.width);
  const bottom = workArea.y + Math.max(0, workArea.height - bounds.height);
  let x = bounds.x;
  let y = bounds.y;

  if (Math.abs(x - workArea.x) <= threshold) {
    x = workArea.x;
  } else if (Math.abs(x - right) <= threshold) {
    x = right;
  }

  if (Math.abs(y - workArea.y) <= threshold) {
    y = workArea.y;
  } else if (Math.abs(y - bottom) <= threshold) {
    y = bottom;
  }

  return {
    x,
    y,
    snappedX: x !== bounds.x,
    snappedY: y !== bounds.y
  };
}

module.exports = {
  EDGE_SNAP_DISTANCE,
  snapPosition
};
