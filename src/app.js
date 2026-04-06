// app.js — Entry point, state management, event wiring

import { createDraft } from './model/draft.js';
import { computeDrawdown } from './model/drawdown.js';
import { GridCanvas } from './ui/gridCanvas.js';

const CELL_SIZE = 20;
const MAX_GRID_PX = 800; // max viewport size for large grids

const draft = createDraft();
let drawdownPixels = computeDrawdown(draft);

function rebuildDrawdown() {
  drawdownPixels = computeDrawdown(draft);
}

// --- Threading grid ---
const threadingGrid = new GridCanvas(document.getElementById('threading-canvas'), {
  rows: draft.loom.shafts,
  cols: draft.loom.warpCount,
  cellSize: CELL_SIZE,
  maxViewportWidth: MAX_GRID_PX,
  getCellFilled(row, col) {
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
  onScroll({ scrollX }) {
    drawdownGrid.setScrollX(scrollX);
    warpColorBar.setScrollX(scrollX);
  },
});

// --- Tie-up grid ---
const tieupGrid = new GridCanvas(document.getElementById('tieup-canvas'), {
  rows: draft.loom.shafts,
  cols: draft.loom.treadles,
  cellSize: CELL_SIZE,
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
const treadlingGrid = new GridCanvas(document.getElementById('treadling-canvas'), {
  rows: draft.loom.weftCount,
  cols: draft.loom.treadles,
  cellSize: CELL_SIZE,
  maxViewportHeight: MAX_GRID_PX,
  getCellFilled(row, col) {
    return draft.treadling[row] === col;
  },
  onCellClick(row, col) {
    draft.treadling[row] = col;
    rebuildDrawdown();
    treadlingGrid.render();
    drawdownGrid.render();
  },
  onScroll({ scrollY }) {
    drawdownGrid.setScrollY(scrollY);
    weftColorBar.setScrollY(scrollY);
  },
});

// --- Drawdown grid (read-only, color) ---
const drawdownGrid = new GridCanvas(document.getElementById('drawdown-canvas'), {
  rows: draft.loom.weftCount,
  cols: draft.loom.warpCount,
  cellSize: CELL_SIZE,
  maxViewportWidth: MAX_GRID_PX,
  maxViewportHeight: MAX_GRID_PX,
  getCellColor(row, col) {
    return drawdownPixels[row][col];
  },
  onScroll({ scrollX, scrollY }) {
    threadingGrid.setScrollX(scrollX);
    warpColorBar.setScrollX(scrollX);
    treadlingGrid.setScrollY(scrollY);
    weftColorBar.setScrollY(scrollY);
  },
});

// --- Warp color bar (horizontal, below drawdown) ---
const warpColorBar = new GridCanvas(document.getElementById('warp-color-canvas'), {
  rows: 1,
  cols: draft.loom.warpCount,
  cellSize: CELL_SIZE,
  maxViewportWidth: MAX_GRID_PX,
  getCellColor(row, col) {
    return draft.warpColors[col];
  },
  onScroll({ scrollX }) {
    threadingGrid.setScrollX(scrollX);
    drawdownGrid.setScrollX(scrollX);
  },
});

// --- Weft color bar (vertical, left of drawdown) ---
const weftColorBar = new GridCanvas(document.getElementById('weft-color-canvas'), {
  rows: draft.loom.weftCount,
  cols: 1,
  cellSize: CELL_SIZE,
  maxViewportHeight: MAX_GRID_PX,
  getCellColor(row) {
    return draft.weftColors[row];
  },
  onScroll({ scrollY }) {
    treadlingGrid.setScrollY(scrollY);
    drawdownGrid.setScrollY(scrollY);
  },
});

// --- Info bar ---
const infoBar = document.getElementById('info-bar');
infoBar.textContent = `${draft.loom.shafts} shafts · ${draft.loom.treadles} treadles · ${draft.loom.warpCount} ends · ${draft.loom.weftCount} picks`;
