// app.js — Entry point, state management, event wiring

import { createDraft } from './model/draft.js';
import { computeDrawdown } from './model/drawdown.js';
import { GridCanvas } from './ui/gridCanvas.js';
import { PalettePanel } from './ui/palette.js';
import { StorageService } from './services/storage.js';

const CELL_SIZE = 20;
const MAX_GRID_PX = 800;

// --- State ---
let draft = createDraft();
let drawdownPixels = computeDrawdown(draft);
let selectedColor = draft.palette[0];

function rebuildDrawdown() {
  drawdownPixels = computeDrawdown(draft);
}

function renderAll() {
  threadingGrid.render();
  tieupGrid.render();
  treadlingGrid.render();
  drawdownGrid.render();
  warpColorBar.render();
  weftColorBar.render();
  updateInfoBar();
}

function autoSave() {
  StorageService.saveDraft(draft);
}

// --- Load a draft into the UI, rebuilding all grids ---
function loadDraftIntoUI(d) {
  draft = d;
  rebuildDrawdown();
  selectedColor = draft.palette[0] ?? '#000000';

  threadingGrid.update({ rows: draft.loom.shafts, cols: draft.loom.warpCount });
  tieupGrid.update({ rows: draft.loom.shafts, cols: draft.loom.treadles });
  treadlingGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.treadles });
  drawdownGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.warpCount });
  warpColorBar.update({ cols: draft.loom.warpCount });
  weftColorBar.update({ rows: draft.loom.weftCount });

  palette.setColors(draft.palette);
  document.getElementById('draft-name').textContent = draft.name;
  refreshDraftList();
  renderAll();
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
    autoSave();
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
    autoSave();
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
    autoSave();
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
  onCellClick(row, col) {
    draft.warpColors[col] = selectedColor;
    rebuildDrawdown();
    warpColorBar.render();
    drawdownGrid.render();
    autoSave();
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
  onCellClick(row) {
    draft.weftColors[row] = selectedColor;
    rebuildDrawdown();
    weftColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
  onScroll({ scrollY }) {
    treadlingGrid.setScrollY(scrollY);
    drawdownGrid.setScrollY(scrollY);
  },
});

// --- Color palette ---
const palette = new PalettePanel(document.getElementById('palette-panel'), {
  colors: draft.palette,
  onColorSelect(color) {
    selectedColor = color;
  },
  onPaletteChange(newPalette) {
    draft.palette = [...newPalette];
    autoSave();
  },
});

// --- Draft management ---
const draftSelect = document.getElementById('draft-select');
const btnNew = document.getElementById('btn-new');
const btnSave = document.getElementById('btn-save');
const btnRename = document.getElementById('btn-rename');
const btnDelete = document.getElementById('btn-delete');

async function refreshDraftList() {
  const drafts = await StorageService.listDrafts();
  draftSelect.innerHTML = '';
  for (const d of drafts) {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    if (d.id === draft.id) opt.selected = true;
    draftSelect.appendChild(opt);
  }
}

draftSelect.addEventListener('change', async () => {
  const loaded = await StorageService.loadDraft(draftSelect.value);
  if (loaded) loadDraftIntoUI(loaded);
});

btnNew.addEventListener('click', () => {
  const d = createDraft();
  loadDraftIntoUI(d);
  autoSave();
});

btnSave.addEventListener('click', () => {
  autoSave();
  refreshDraftList();
});

btnRename.addEventListener('click', () => {
  const name = prompt('Draft name:', draft.name);
  if (name && name.trim()) {
    draft.name = name.trim();
    document.getElementById('draft-name').textContent = draft.name;
    autoSave();
    refreshDraftList();
  }
});

btnDelete.addEventListener('click', async () => {
  if (!confirm(`Delete "${draft.name}"?`)) return;
  await StorageService.deleteDraft(draft.id);
  const remaining = await StorageService.listDrafts();
  if (remaining.length > 0) {
    const loaded = await StorageService.loadDraft(remaining[0].id);
    loadDraftIntoUI(loaded);
  } else {
    loadDraftIntoUI(createDraft());
    autoSave();
  }
});

// --- Info bar ---
function updateInfoBar() {
  document.getElementById('info-bar').textContent =
    `${draft.loom.shafts} shafts · ${draft.loom.treadles} treadles · ${draft.loom.warpCount} ends · ${draft.loom.weftCount} picks`;
}

// --- Init: load last draft or save default ---
async function init() {
  const drafts = await StorageService.listDrafts();
  if (drafts.length > 0) {
    const loaded = await StorageService.loadDraft(drafts[0].id);
    if (loaded) {
      loadDraftIntoUI(loaded);
      return;
    }
  }
  // No saved drafts — save the default
  document.getElementById('draft-name').textContent = draft.name;
  autoSave();
  refreshDraftList();
}

init();
