// app.js — Entry point, state management, event wiring

import { createDraft, resizeDraft } from './model/draft.js';
import { computeDrawdown } from './model/drawdown.js';
import { GridCanvas } from './ui/gridCanvas.js';
import { PalettePanel } from './ui/palette.js';
import { RepeatTools, THREADING_PRESETS, TREADLING_PRESETS } from './ui/repeatTools.js';
import { StorageService } from './services/storage.js';

const MAX_CELL_SIZE = 20;
const MIN_CELL_SIZE = 4;
const MAX_GRID_PX = 800;

function computeCellSize(warpCount, weftCount) {
  const fitW = Math.floor(MAX_GRID_PX / warpCount);
  const fitH = Math.floor(MAX_GRID_PX / weftCount);
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, fitW, fitH));
}

// --- State ---
let draft = createDraft();
let drawdownPixels = computeDrawdown(draft);
let selectedColor = draft.palette[0];
let cellSize = computeCellSize(draft.loom.warpCount, draft.loom.weftCount);

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

// --- Load a draft into the UI ---
function loadDraftIntoUI(d) {
  draft = d;
  rebuildDrawdown();
  selectedColor = draft.palette[0] ?? '#000000';
  cellSize = computeCellSize(draft.loom.warpCount, draft.loom.weftCount);

  threadingGrid.update({ rows: draft.loom.shafts, cols: draft.loom.warpCount, cellSize });
  tieupGrid.update({ rows: draft.loom.shafts, cols: draft.loom.treadles, cellSize });
  treadlingGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.treadles, cellSize });
  drawdownGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.warpCount, cellSize });
  warpColorBar.update({ cols: draft.loom.warpCount, cellSize });
  weftColorBar.update({ rows: draft.loom.weftCount, cellSize });

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
  cellSize,
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
  cellSize,
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
  cellSize,
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
  cellSize,
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
  cellSize,
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
  cellSize,
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
// Palette
// ============================================================

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

// ============================================================
// Repeat tools (consolidated sequence + color patterns)
// ============================================================

const warpRepeatTools = new RepeatTools(document.getElementById('warp-repeat-tools'), {
  label: 'Warp',
  type: 'threading',
  max: draft.loom.shafts,
  direction: 'cols',
  presets: THREADING_PRESETS,
  getActiveColor,
  onFillAllColor(color) {
    draft.warpColors.fill(color);
    rebuildDrawdown();
    warpColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
  onApply({ sequence, colors }) {
    for (let i = 0; i < draft.threading.length; i++) {
      draft.threading[i] = sequence[i % sequence.length];
    }
    for (let i = 0; i < draft.warpColors.length; i++) {
      draft.warpColors[i] = colors[i % colors.length];
    }
    rebuildDrawdown();
    threadingGrid.render();
    warpColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
});

const weftRepeatTools = new RepeatTools(document.getElementById('weft-repeat-tools'), {
  label: 'Weft',
  type: 'treadling',
  max: draft.loom.treadles,
  direction: 'rows',
  presets: TREADLING_PRESETS,
  getActiveColor,
  onFillAllColor(color) {
    draft.weftColors.fill(color);
    rebuildDrawdown();
    weftColorBar.render();
    drawdownGrid.render();
    autoSave();
  },
  onApply({ sequence, colors }) {
    for (let i = 0; i < draft.treadling.length; i++) {
      draft.treadling[i] = sequence[i % sequence.length];
    }
    for (let i = 0; i < draft.weftColors.length; i++) {
      draft.weftColors[i] = colors[i % colors.length];
    }
    rebuildDrawdown();
    treadlingGrid.render();
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
// Settings dialog
// ============================================================

const settingsDialog = document.getElementById('settings-dialog');
const btnSettings = document.getElementById('btn-settings');
const setShafts = document.getElementById('set-shafts');
const setTreadles = document.getElementById('set-treadles');
const setWarp = document.getElementById('set-warp');
const setWeft = document.getElementById('set-weft');
const setEpi = document.getElementById('set-epi');
const setPpi = document.getElementById('set-ppi');
const btnSettingsCancel = document.getElementById('settings-cancel');
const btnSettingsApply = document.getElementById('settings-apply');

function openSettings() {
  setShafts.value = draft.loom.shafts;
  setTreadles.value = draft.loom.treadles;
  setWarp.value = draft.loom.warpCount;
  setWeft.value = draft.loom.weftCount;
  setEpi.value = draft.loom.epi ?? '';
  setPpi.value = draft.loom.ppi ?? '';
  settingsDialog.showModal();
}

function closeSettings() {
  settingsDialog.close();
}

function applySettings() {
  const shafts = Math.max(2, Math.min(32, parseInt(setShafts.value) || 4));
  const treadles = Math.max(2, Math.min(32, parseInt(setTreadles.value) || 6));
  const warpCount = Math.max(1, Math.min(2000, parseInt(setWarp.value) || 60));
  const weftCount = Math.max(1, Math.min(2000, parseInt(setWeft.value) || 60));
  const epiVal = parseInt(setEpi.value);
  const epi = (epiVal > 0) ? epiVal : null;
  const ppiVal = parseInt(setPpi.value);
  const ppi = (ppiVal > 0) ? ppiVal : null;

  resizeDraft(draft, { shafts, treadles, warpCount, weftCount, epi, ppi });

  // Update repeat tools max values
  warpRepeatTools.updateMax(draft.loom.shafts);
  weftRepeatTools.updateMax(draft.loom.treadles);

  cellSize = computeCellSize(draft.loom.warpCount, draft.loom.weftCount);
  rebuildDrawdown();
  threadingGrid.update({ rows: draft.loom.shafts, cols: draft.loom.warpCount, cellSize });
  tieupGrid.update({ rows: draft.loom.shafts, cols: draft.loom.treadles, cellSize });
  treadlingGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.treadles, cellSize });
  drawdownGrid.update({ rows: draft.loom.weftCount, cols: draft.loom.warpCount, cellSize });
  warpColorBar.update({ cols: draft.loom.warpCount, cellSize });
  weftColorBar.update({ rows: draft.loom.weftCount, cellSize });

  renderAll();
  autoSave();
  closeSettings();
}

btnSettings.addEventListener('click', openSettings);
btnSettingsCancel.addEventListener('click', closeSettings);
btnSettingsApply.addEventListener('click', applySettings);

// Close on backdrop click
settingsDialog.addEventListener('click', (e) => {
  if (e.target === settingsDialog) closeSettings();
});

// ============================================================
// Info bar & init
// ============================================================

function updateInfoBar() {
  let info = `${draft.loom.shafts} shafts · ${draft.loom.treadles} treadles · ${draft.loom.warpCount} ends · ${draft.loom.weftCount} picks`;
  if (draft.loom.epi) info += ` · ${draft.loom.epi} epi`;
  if (draft.loom.ppi) info += ` · ${draft.loom.ppi} ppi`;
  document.getElementById('info-bar').textContent = info;
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
