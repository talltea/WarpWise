// model/drawdown.js — Pure function: compute drawdown from draft

/**
 * Computes the drawdown color grid from threading, treadling, tie-up, and colors.
 * Returns a 2D array [weftRow][warpCol] of hex color strings.
 */
export function computeDrawdown(draft) {
  const { threading, treadling, tieup, warpColors, weftColors } = draft;
  const width = threading.length;
  const height = treadling.length;
  const pixels = new Array(height);

  for (let y = 0; y < height; y++) {
    pixels[y] = new Array(width);
    const treadle = treadling[y];
    for (let x = 0; x < width; x++) {
      const shaft = threading[x];
      const warpOnTop = tieup[shaft][treadle];
      pixels[y][x] = warpOnTop ? warpColors[x] : weftColors[y];
    }
  }
  return pixels;
}

/**
 * Computes a single drawdown cell — useful for incremental updates.
 */
export function computeCell(draft, warpIndex, weftIndex) {
  const shaft = draft.threading[warpIndex];
  const treadle = draft.treadling[weftIndex];
  const warpOnTop = draft.tieup[shaft][treadle];
  return warpOnTop ? draft.warpColors[warpIndex] : draft.weftColors[weftIndex];
}
