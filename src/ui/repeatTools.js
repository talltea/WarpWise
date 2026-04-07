// ui/repeatTools.js — Consolidated repeat pattern tool for threading/treadling + colors

import { GridCanvas } from './gridCanvas.js';
import { PatternLibrary } from '../services/storage.js';

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.label - "Warp" or "Weft"
 * @param {string} options.type - "threading" or "treadling" (for pattern library)
 * @param {number} options.max - Number of shafts or treadles
 * @param {string} options.direction - "cols" (warp: shafts×N) or "rows" (weft: N×treadles)
 * @param {function} options.getActiveColor - () => current selected color
 * @param {function} options.onFillAllColor - (color) => fill all threads with this color
 * @param {function} options.onApply - ({ sequence: number[], colors: string[] }) => void
 * @param {Array<{name: string, fn: (max: number) => number[]}>} [options.presets]
 */
export class RepeatTools {
  constructor(container, options) {
    this.container = container;
    this.label = options.label;
    this.type = options.type;
    this.max = options.max;
    this.direction = options.direction;
    this.getActiveColor = options.getActiveColor;
    this.onFillAllColor = options.onFillAllColor;
    this.onApply = options.onApply;
    this.presets = options.presets ?? [];
    this.open = false;
    this.sequence = Array.from({ length: this.max }, (_, i) => i);
    this.colors = [];
    this.miniGrid = null;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'repeat-tools-row';

    // Fill All button
    const fillBtn = document.createElement('button');
    fillBtn.className = 'btn btn-sm';
    fillBtn.textContent = 'Fill All';
    fillBtn.title = `Fill all ${this.label.toLowerCase()} threads with the active color`;
    fillBtn.addEventListener('click', () => {
      const color = this.getActiveColor();
      this.onFillAllColor(color);
      // Update color slots in the builder if open
      if (this.open) {
        this.colors.fill(color);
        const slotsRow = this.container.querySelector('.repeat-color-slots');
        if (slotsRow) this._populateColorSlots(slotsRow);
      }
    });
    row.appendChild(fillBtn);

    // Repeat Pattern toggle
    const repeatBtn = document.createElement('button');
    repeatBtn.className = 'btn btn-sm';
    repeatBtn.textContent = this.open ? 'Close Pattern' : 'Repeat Pattern\u2026';
    repeatBtn.addEventListener('click', () => {
      this.open = !this.open;
      if (this.open && this.colors.length === 0) {
        const c = this.getActiveColor();
        this.colors = Array.from({ length: this.sequence.length }, () => c);
      }
      this.render();
    });
    row.appendChild(repeatBtn);

    this.container.appendChild(row);

    if (this.open) {
      this._renderBuilder();
    }
  }

  _renderBuilder() {
    const builder = document.createElement('div');
    builder.className = 'repeat-builder';

    // Length + presets row
    const topRow = document.createElement('div');
    topRow.className = 'repeat-top-row';

    const lengthLabel = document.createElement('label');
    lengthLabel.className = 'repeat-length-label';
    lengthLabel.textContent = 'Length:';
    topRow.appendChild(lengthLabel);

    const lengthInput = document.createElement('input');
    lengthInput.type = 'number';
    lengthInput.className = 'repeat-length-input';
    lengthInput.min = 1;
    lengthInput.max = 64;
    lengthInput.value = this.sequence.length;
    lengthInput.addEventListener('change', () => {
      let len = parseInt(lengthInput.value, 10);
      if (isNaN(len) || len < 1) len = 1;
      if (len > 64) len = 64;
      lengthInput.value = len;
      this._resizeTo(len);
      this._rebuildAll(builder, lengthInput);
    });
    topRow.appendChild(lengthInput);

    if (this.presets.length > 0) {
      const sep = document.createElement('span');
      sep.className = 'repeat-presets-label';
      sep.textContent = 'Presets:';
      topRow.appendChild(sep);
      for (const preset of this.presets) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.textContent = preset.name;
        btn.addEventListener('click', () => {
          this.sequence = preset.fn(this.max);
          this._syncColorsToLength();
          lengthInput.value = this.sequence.length;
          this._rebuildAll(builder, lengthInput);
        });
        topRow.appendChild(btn);
      }
    }

    builder.appendChild(topRow);

    // Saved patterns
    const savedSection = document.createElement('div');
    savedSection.className = 'repeat-saved-section';
    this._renderSavedPatterns(savedSection, builder, lengthInput);
    builder.appendChild(savedSection);

    // Grid + delete buttons wrapper
    const isRows = this.direction === 'rows';
    const gridArea = document.createElement('div');
    gridArea.className = 'repeat-grid-area' + (isRows ? ' repeat-grid-area-rows' : ' repeat-grid-area-cols');

    const gridWrap = document.createElement('div');
    gridWrap.className = 'repeat-grid-wrap';
    const canvas = document.createElement('canvas');
    gridWrap.appendChild(canvas);
    gridArea.appendChild(gridWrap);

    // Color slots
    const slotsRow = document.createElement('div');
    slotsRow.className = 'repeat-color-slots' + (isRows ? ' repeat-color-slots-vertical' : '');
    this._populateColorSlots(slotsRow);

    const deleteSection = document.createElement('div');
    deleteSection.className = 'repeat-delete-section' + (isRows ? ' repeat-delete-rows' : ' repeat-delete-cols');
    this._populateDeleteButtons(deleteSection, builder, lengthInput);

    if (isRows) {
      // Weft: grid | x-buttons | colors — all in one horizontal row
      gridArea.appendChild(deleteSection);
      gridArea.appendChild(slotsRow);
    } else {
      // Warp: grid / x-buttons / colors — all stacked vertically, left-aligned
      gridArea.appendChild(deleteSection);
      gridArea.appendChild(slotsRow);
    }
    builder.appendChild(gridArea);

    // Action buttons
    const actionsRow = document.createElement('div');
    actionsRow.className = 'repeat-actions-row';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm';
    saveBtn.textContent = 'Save to Library';
    saveBtn.addEventListener('click', () => {
      const name = prompt('Pattern name:');
      if (!name || !name.trim()) return;
      PatternLibrary.save({
        name: name.trim(),
        type: this.type,
        sequence: [...this.sequence],
        colors: [...this.colors],
        max: this.max,
      });
      const saved = builder.querySelector('.repeat-saved-section');
      if (saved) this._renderSavedPatterns(saved, builder, lengthInput);
    });
    actionsRow.appendChild(saveBtn);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => {
      this.onApply({
        sequence: [...this.sequence],
        colors: [...this.colors],
      });
    });
    actionsRow.appendChild(applyBtn);

    builder.appendChild(actionsRow);

    this.container.appendChild(builder);

    // Create the mini GridCanvas
    this._createMiniGrid(canvas);
  }

  _populateDeleteButtons(container, builder, lengthInput) {
    container.innerHTML = '';
    if (this.sequence.length <= 1) return;
    for (let i = 0; i < this.sequence.length; i++) {
      const btn = document.createElement('button');
      btn.className = 'repeat-delete-btn';
      btn.textContent = '\u00d7';
      btn.title = `Remove position ${i + 1}`;
      btn.addEventListener('click', () => {
        if (this.sequence.length <= 1) return;
        this.sequence.splice(i, 1);
        this.colors.splice(i, 1);
        lengthInput.value = this.sequence.length;
        this._rebuildAll(builder, lengthInput);
      });
      container.appendChild(btn);
    }
  }

  _rebuildAll(builder, lengthInput) {
    this._rebuildMiniGrid(builder);
    this._rebuildColorSlots(builder);
    const deleteSection = builder.querySelector('.repeat-delete-section');
    if (deleteSection) this._populateDeleteButtons(deleteSection, builder, lengthInput);
    const colorSlots = builder.querySelector('.repeat-color-slots');
    if (colorSlots) this._populateColorSlots(colorSlots);
  }

  _populateColorSlots(slotsRow) {
    slotsRow.innerHTML = '';
    for (let i = 0; i < this.colors.length; i++) {
      const slot = document.createElement('button');
      slot.className = 'pattern-slot';
      slot.style.backgroundColor = this.colors[i];
      slot.title = `Slot ${i + 1} — click to set to active color`;
      slot.addEventListener('click', () => {
        this.colors[i] = this.getActiveColor();
        slot.style.backgroundColor = this.colors[i];
      });
      slotsRow.appendChild(slot);
    }
  }

  _resizeTo(len) {
    // Resize sequence
    while (this.sequence.length < len) {
      const last = this.sequence[this.sequence.length - 1];
      this.sequence.push((last + 1) % this.max);
    }
    if (this.sequence.length > len) {
      this.sequence.length = len;
    }
    this._syncColorsToLength();
  }

  _syncColorsToLength() {
    const c = this.getActiveColor();
    while (this.colors.length < this.sequence.length) {
      this.colors.push(c);
    }
    if (this.colors.length > this.sequence.length) {
      this.colors.length = this.sequence.length;
    }
  }

  _createMiniGrid(canvas) {
    const len = this.sequence.length;
    const cellSize = 18;

    if (this.direction === 'cols') {
      // Warp: rows = shafts, cols = repeat length
      this.miniGrid = new GridCanvas(canvas, {
        rows: this.max,
        cols: len,
        cellSize,
        getCellFilled: (row, col) => {
          const shaft = this.max - 1 - row;
          return this.sequence[col] === shaft;
        },
        onCellClick: (row, col) => {
          const shaft = this.max - 1 - row;
          this.sequence[col] = shaft;
          this.miniGrid.render();
        },
      });
    } else {
      // Weft: rows = repeat length, cols = treadles
      this.miniGrid = new GridCanvas(canvas, {
        rows: len,
        cols: this.max,
        cellSize,
        getCellFilled: (row, col) => {
          return this.sequence[row] === col;
        },
        onCellClick: (row, col) => {
          this.sequence[row] = col;
          this.miniGrid.render();
        },
      });
    }
  }

  _rebuildMiniGrid(builder) {
    const wrap = builder.querySelector('.repeat-grid-wrap');
    if (wrap) {
      const canvas = document.createElement('canvas');
      wrap.innerHTML = '';
      wrap.appendChild(canvas);
      this._createMiniGrid(canvas);
    }
  }

  _rebuildColorSlots(builder) {
    const slotsRow = builder.querySelector('.repeat-color-slots');
    if (slotsRow) {
      this._populateColorSlots(slotsRow);
    }
  }

  _renderSavedPatterns(container, builder, lengthInput) {
    container.innerHTML = '';
    const patterns = PatternLibrary.list(this.type);
    if (patterns.length === 0) return;

    const label = document.createElement('span');
    label.className = 'repeat-presets-label';
    label.textContent = 'Saved:';
    container.appendChild(label);

    const list = document.createElement('div');
    list.className = 'repeat-saved-list';

    for (const p of patterns) {
      const item = document.createElement('div');
      item.className = 'repeat-saved-item';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-sm';
      loadBtn.textContent = p.name;
      loadBtn.title = `Load "${p.name}" (${p.sequence.length} steps)`;
      loadBtn.addEventListener('click', () => {
        this.sequence = [...p.sequence];
        // Clamp to current max
        for (let i = 0; i < this.sequence.length; i++) {
          if (this.sequence[i] >= this.max) this.sequence[i] = this.sequence[i] % this.max;
        }
        this.colors = p.colors ? [...p.colors] : Array(this.sequence.length).fill(this.getActiveColor());
        this._syncColorsToLength();
        lengthInput.value = this.sequence.length;
        this._rebuildAll(builder, lengthInput);
      });
      item.appendChild(loadBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'repeat-saved-delete';
      delBtn.textContent = '\u00d7';
      delBtn.title = `Delete "${p.name}"`;
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete pattern "${p.name}"?`)) return;
        PatternLibrary.delete(p.id);
        this._renderSavedPatterns(container, builder, lengthInput);
      });
      item.appendChild(delBtn);

      list.appendChild(item);
    }
    container.appendChild(list);
  }

  updateMax(max) {
    this.max = max;
    for (let i = 0; i < this.sequence.length; i++) {
      if (this.sequence[i] >= max) this.sequence[i] = this.sequence[i] % max;
    }
    if (this.open) this.render();
  }
}

// --- Common presets ---

export const THREADING_PRESETS = [
  {
    name: 'Straight',
    fn: (max) => Array.from({ length: max }, (_, i) => i),
  },
  {
    name: 'Point',
    fn: (max) => {
      if (max <= 2) return Array.from({ length: max }, (_, i) => i);
      const up = Array.from({ length: max }, (_, i) => i);
      const down = Array.from({ length: max - 2 }, (_, i) => max - 2 - i);
      return [...up, ...down];
    },
  },
];

export const TREADLING_PRESETS = [
  {
    name: 'Straight',
    fn: (max) => Array.from({ length: max }, (_, i) => i),
  },
  {
    name: 'Point',
    fn: (max) => {
      if (max <= 2) return Array.from({ length: max }, (_, i) => i);
      const up = Array.from({ length: max }, (_, i) => i);
      const down = Array.from({ length: max - 2 }, (_, i) => max - 2 - i);
      return [...up, ...down];
    },
  },
];
