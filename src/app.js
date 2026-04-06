// app.js — Entry point, state management, event wiring

import { createDraft } from './model/draft.js';
import { computeDrawdown } from './model/drawdown.js';
import { GridCanvas } from './ui/gridCanvas.js';
import { PalettePanel } from './ui/palette.js';
import { ColorTools } from './ui/colorTools.js';
import { SequenceTools, THREADING_PRESETS, TREADLING_PRESETS } from './ui/sequenceTools.js';
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

function getActiveColor() {
  return selectedColor;
}

function getPalette() {
  return draft.palette;
}

// --- Load a draft into the UI ---
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
  draftNameInput.value = draft.name;
  refreshDraftList();
  renderAll();
}

// ============================================================
// Grids
// ============================================================

// --- Warp color bar (horizontal, above threading) ---
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

// ============================================================
// Sequence tools (threading & treadling patterns)
// ============================================================

const threadingTools = new SequenceTools(document.getElementById('threading-tools'), {
  label: 'Threading',
  max: draft.loom.shafts,
  direction: 'cols',
  presets: THREADING_PRESETS,
  onApply(sequence) {
    for (let i = 0; i < draft.threading.length; i++) {
      draft.threading[i] = sequence[i % sequence.length];
    }
    rebuildDrawdown();
    threadingGrid.render();
    drawdownGrid.render();
    autoSave();
  },
});

const treadlingTools = new SequenceTools(document.getElementById('treadling-tools'), {
  label: 'Treadling',
  max: draft.loom.treadles,
  direction: 'rows',
  presets: TREADLING_PRESETS,
  onApply(sequence) {
    for (let i = 0; i < draft.treadling.length; i++) {
      draft.treadling[i] = sequence[i % sequence.length];
    }
    rebuildDrawdown();
    treadlingGrid.render();
    drawdownGrid.render();
    autoSave();
  },
});

// ============================================================
// Color tools
// ============================================================

// --- Palette ---
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

// --- Warp color tools ---
const warpColorTools = new ColorTools(document.getElementById('warp-color-tools'), {
  label: 'Warp',
  getActiveColor,
  getPalette,
  onFillAll(color) {
    draft.warpColors.fill(color);
    rebuildDrawdown();
    warpColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
  onApplyPattern(sequence) {
    for (let i = 0; i < draft.warpColors.length; i++) {
      draft.warpColors[i] = sequence[i % sequence.length];
    }
    rebuildDrawdown();
    warpColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
});

// --- Weft color tools ---
const weftColorTools = new ColorTools(document.getElementById('weft-color-tools'), {
  label: 'Weft',
  getActiveColor,
  getPalette,
  onFillAll(color) {
    draft.weftColors.fill(color);
    rebuildDrawdown();
    weftColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
  onApplyPattern(sequence) {
    for (let i = 0; i < draft.weftColors.length; i++) {
      draft.weftColors[i] = sequence[i % sequence.length];
    }
    rebuildDrawdown();
    weftColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
});

// ============================================================
// Draft management
// ============================================================

const draftSelect = document.getElementById('draft-select');
const draftNameInput = document.getElementById('draft-name');
const btnNew = document.getElementById('btn-new');
const btnSave = document.getElementById('btn-save');
const btnDelete = document.getElementById('btn-delete');

// Inline rename
draftNameInput.addEventListener('change', () => {
  const name = draftNameInput.value.trim();
  if (name) {
    draft.name = name;
    autoSave();
    refreshDraftList();
  } else {
    draftNameInput.value = draft.name;
  }
});
draftNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') draftNameInput.blur();
});

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

// ============================================================
// Info bar & init
// ============================================================

function updateInfoBar() {
  document.getElementById('info-bar').textContent =
    `${draft.loom.shafts} shafts · ${draft.loom.treadles} treadles · ${draft.loom.warpCount} ends · ${draft.loom.weftCount} picks`;
}

async function init() {
  const drafts = await StorageService.listDrafts();
  if (drafts.length > 0) {
    const loaded = await StorageService.loadDraft(drafts[0].id);
    if (loaded) {
      loadDraftIntoUI(loaded);
      return;
    }
  }
  draftNameInput.value = draft.name;
  autoSave();
  refreshDraftList();
}

init();
