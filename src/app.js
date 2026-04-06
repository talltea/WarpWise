// app.js — Entry point, state management, event wiring

import { createDraft } from './model/draft.js';
import { computeDrawdown } from './model/drawdown.js';
import { GridCanvas } from './ui/gridCanvas.js';

const draft = createDraft();
let drawdownPixels = computeDrawdown(draft);

function rebuildDrawdown() {
  drawdownPixels = computeDrawdown(draft);
}

// --- Threading grid ---
// Rows = shafts (bottom shaft = index 0 shown at bottom, so row 0 = top = highest shaft)
// Cols = warp ends
const threadingGrid = new GridCanvas(document.getElementById('threading-canvas'), {
  rows: draft.loom.shafts,
  cols: draft.loom.warpCount,
  getCellFilled(row, col) {
    // Row 0 is the top of the canvas = highest shaft index
    const shaft = draft.loom.shafts - 1 - row;
    return draft.threading[col] === shaft;
  },
  onCellClick(row, col) {
    const shaft = draft.loom.shafts - 1 - row;
    draft.threading[col] = shaft;
    rebuildDrawdown();
    threadingGrid.render();
    drawdownGrid.render();
  },
});

// --- Tie-up grid ---
// Rows = shafts (same orientation as threading), Cols = treadles
const tieupGrid = new GridCanvas(document.getElementById('tieup-canvas'), {
  rows: draft.loom.shafts,
  cols: draft.loom.treadles,
  getCellFilled(row, col) {
    const shaft = draft.loom.shafts - 1 - row;
    return draft.tieup[shaft][col];
  },
  onCellClick(row, col) {
    const shaft = draft.loom.shafts - 1 - row;
    draft.tieup[shaft][col] = !draft.tieup[shaft][col];
    rebuildDrawdown();
    tieupGrid.render();
    drawdownGrid.render();
  },
});

// --- Treadling grid ---
// Rows = weft picks, Cols = treadles
const treadlingGrid = new GridCanvas(document.getElementById('treadling-canvas'), {
  rows: draft.loom.weftCount,
  cols: draft.loom.treadles,
  getCellFilled(row, col) {
    return draft.treadling[row] === col;
  },
  onCellClick(row, col) {
    draft.treadling[row] = col;
    rebuildDrawdown();
    treadlingGrid.render();
    drawdownGrid.render();
  },
});

// --- Drawdown grid (read-only, color) ---
const drawdownGrid = new GridCanvas(document.getElementById('drawdown-canvas'), {
  rows: draft.loom.weftCount,
  cols: draft.loom.warpCount,
  getCellColor(row, col) {
    return drawdownPixels[row][col];
  },
});

// --- Info bar ---
const infoBar = document.getElementById('info-bar');
infoBar.textContent = `${draft.loom.shafts} shafts · ${draft.loom.treadles} treadles · ${draft.loom.warpCount} ends · ${draft.loom.weftCount} picks`;
