'use strict';

/**
 * Work out where a display-mode window should land.
 *
 * Three rules, in order:
 *  - leaving fullscreen always centres: the current bounds are the whole
 *    screen, so they carry no useful position;
 *  - a capsule blooming out of the mini circle centres on the circle. The
 *    capsule has its own remembered corner, but restoring it would move the
 *    pill away from the pointer that just clicked the ring, and the pointer
 *    would end up on the desktop while the renderer still believes it is over
 *    the panel;
 *  - every other switch returns to the mode's remembered corner.
 *
 * The result is clamped to the display work area (not its full bounds) so a
 * widget near the edge never lands under the taskbar.
 *
 * @param {object} options
 * @param {{ x: number, y: number, width: number, height: number }} options.from
 *   Current window bounds.
 * @param {{ width: number, height: number }} options.size Target footprint.
 * @param {{ x: number, y: number, width: number, height: number } | null} [options.workArea]
 * @param {{ x: number, y: number } | null} [options.remembered]
 *   Corner saved for the target mode, if any.
 * @param {boolean} [options.restoredFromFullscreen]
 * @param {boolean} [options.bloomFromMini]
 * @returns {{ x: number, y: number } | null} Null when the input is unusable.
 */
function resolveModePlacement({
  from,
  size,
  workArea = null,
  remembered = null,
  restoredFromFullscreen = false,
  bloomFromMini = false
}) {
  const numbers = [
    from?.x,
    from?.y,
    from?.width,
    from?.height,
    size?.width,
    size?.height
  ];

  if (!numbers.every(Number.isFinite)) {
    return null;
  }

  const forceCentre = restoredFromFullscreen || bloomFromMini;
  const usableRemembered =
    Number.isFinite(remembered?.x) && Number.isFinite(remembered?.y);
  const anchor = forceCentre || !usableRemembered ? null : remembered;

  let x = anchor ? anchor.x : Math.round(from.x + from.width / 2 - size.width / 2);
  let y = anchor ? anchor.y : Math.round(from.y + from.height / 2 - size.height / 2);

  const clampable = [
    workArea?.x,
    workArea?.y,
    workArea?.width,
    workArea?.height
  ].every(Number.isFinite);

  if (clampable) {
    const maxX = Math.max(workArea.x, workArea.x + workArea.width - size.width);
    const maxY = Math.max(workArea.y, workArea.y + workArea.height - size.height);

    x = Math.min(Math.max(x, workArea.x), maxX);
    y = Math.min(Math.max(y, workArea.y), maxY);
  }

  return { x, y };
}

module.exports = { resolveModePlacement };
