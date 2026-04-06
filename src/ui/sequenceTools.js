// ui/sequenceTools.js — Repeat pattern tool for threading and treadling
// Uses a mini grid (same interaction as the main grids) to define the repeat unit.

import { GridCanvas } from './gridCanvas.js';

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.label - "Threading" or "Treadling"
 * @param {number} options.max - Number of shafts or treadles
 * @param {string} options.direction - "cols" (threading: shafts×N) or "rows" (treadling: N×treadles)
 * @param {function} options.onApply - (sequence: number[]) => void, 0-based indices
 * @param {Array<{name: string, fn: (max: number) => number[]}>} [options.presets]
 */
export class SequenceTools {
  constructor(container, options) {
    this.container = container;
    this.label = options.label;
    this.max = options.max;
    this.direction = options.direction;
    this.onApply = options.onApply;
    this.presets = options.presets ?? [];
    this.open = false;
    this.pattern = Array.from({ length: this.max }, (_, i) => i);
    this.miniGrid = null;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    const toggle = document.createElement('button');
    toggle.className = 'btn btn-sm sequence-toggle-btn';
    toggle.textContent = this.open ? 'Close Pattern' : 'Pattern\u2026';
    toggle.addEventListener('click', () => {
      this.open = !this.open;
      this.render();
    });
    this.container.appendChild(toggle);

    if (!this.open) return;

    const builder = document.createElement('div');
    builder.className = 'sequence-builder';

    // Presets row
    if (this.presets.length > 0) {
      const presetRow = document.createElement('div');
      presetRow.className = 'sequence-presets';
      const presetLabel = document.createElement('span');
      presetLabel.className = 'sequence-preset-label';
      presetLabel.textContent = 'Presets:';
      presetRow.appendChild(presetLabel);
      for (const preset of this.presets) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.textContent = preset.name;
        btn.addEventListener('click', () => {
          this.pattern = preset.fn(this.max);
          this._rebuildMiniGrid(builder);
        });
        presetRow.appendChild(btn);
      }
      builder.appendChild(presetRow);
    }

    // Mini grid + add/remove controls
    const gridRow = document.createElement('div');
    gridRow.className = 'sequence-grid-row';

    const gridWrap = document.createElement('div');
    gridWrap.className = 'sequence-grid-wrap';
    const canvas = document.createElement('canvas');
    gridWrap.appendChild(canvas);
    gridRow.appendChild(gridWrap);

    // +/- length buttons
    const lenControls = document.createElement('div');
    lenControls.className = 'sequence-len-controls';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm';
    addBtn.textContent = '+';
    addBtn.title = 'Add to repeat';
    addBtn.addEventListener('click', () => {
      const last = this.pattern[this.pattern.length - 1];
      this.pattern.push((last + 1) % this.max);
      this._rebuildMiniGrid(builder);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-sm';
    removeBtn.textContent = '\u2212';
    removeBtn.title = 'Remove from repeat';
    removeBtn.addEventListener('click', () => {
      if (this.pattern.length > 1) {
        this.pattern.pop();
        this._rebuildMiniGrid(builder);
      }
    });

    lenControls.appendChild(addBtn);
    lenControls.appendChild(removeBtn);
    gridRow.appendChild(lenControls);

    builder.appendChild(gridRow);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => {
      this.onApply([...this.pattern]);
    });
    builder.appendChild(applyBtn);

    this.container.appendChild(builder);

    // Create the mini GridCanvas
    this._createMiniGrid(canvas);
  }

  _createMiniGrid(canvas) {
    const len = this.pattern.length;
    const cellSize = 18;

    if (this.direction === 'cols') {
      // Threading: rows = shafts, cols = repeat length
      this.miniGrid = new GridCanvas(canvas, {
        rows: this.max,
        cols: len,
        cellSize,
        getCellFilled: (row, col) => {
          const shaft = this.max - 1 - row;
          return this.pattern[col] === shaft;
        },
        onCellClick: (row, col) => {
          const shaft = this.max - 1 - row;
          this.pattern[col] = shaft;
          this.miniGrid.render();
        },
      });
    } else {
      // Treadling: rows = repeat length, cols = treadles
      this.miniGrid = new GridCanvas(canvas, {
        rows: len,
        cols: this.max,
        cellSize,
        getCellFilled: (row, col) => {
          return this.pattern[row] === col;
        },
        onCellClick: (row, col) => {
          this.pattern[row] = col;
          this.miniGrid.render();
        },
      });
    }
  }

  _rebuildMiniGrid(builder) {
    // Remove old grid wrap, recreate
    const oldWrap = builder.querySelector('.sequence-grid-wrap');
    if (oldWrap) {
      const canvas = document.createElement('canvas');
      oldWrap.innerHTML = '';
      oldWrap.appendChild(canvas);
      this._createMiniGrid(canvas);
    }
  }

  updateMax(max) {
    this.max = max;
    for (let i = 0; i < this.pattern.length; i++) {
      if (this.pattern[i] >= max) this.pattern[i] = this.pattern[i] % max;
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
