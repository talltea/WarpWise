// ui/palette.js — Color palette: active color + swatches + saved/preset palettes

import { PaletteLibrary } from '../services/storage.js';

export const PRESET_PALETTES = [
  { name: 'Naturals', colors: ['#f5f0e1', '#e8dcc4', '#c9a87c', '#8b6f47', '#5d4e37', '#3a3226'] },
  { name: 'Earth',    colors: ['#deb887', '#d4a017', '#a0522d', '#c1440e', '#7d8237', '#3e2c1c'] },
  { name: 'Ocean',    colors: ['#0a2540', '#1d6fa5', '#2a9d8f', '#8ecae6', '#f4a261', '#f1faee'] },
  { name: 'Sunset',   colors: ['#5a189a', '#9d4edd', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'] },
  { name: 'Forest',   colors: ['#1a4314', '#386641', '#6a994e', '#a7c957', '#bc4749', '#f2e8cf'] },
  { name: 'Pastels',  colors: ['#fcd5ce', '#fec5bb', '#cdb4db', '#bde0fe', '#a2d2ff', '#fff1e6'] },
  { name: 'Mono',     colors: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'] },
  { name: 'Bold',     colors: ['#ff0000', '#ff8c00', '#ffd700', '#00a86b', '#0066cc', '#8a2be2'] },
];

export class PalettePanel {
  constructor(container, options) {
    this.container = container;
    this.colors = [...options.colors];
    this.onColorSelect = options.onColorSelect;
    this.onPaletteChange = options.onPaletteChange;
    this.selectedColor = this.colors[0] ?? '#000000';
    this.libraryOpen = false;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    const topRow = document.createElement('div');
    topRow.className = 'palette-top-row';

    // Active color
    const activeSwatch = document.createElement('button');
    activeSwatch.className = 'palette-active-swatch';
    activeSwatch.style.backgroundColor = this.selectedColor;
    activeSwatch.title = 'Click to change active color';
    activeSwatch.addEventListener('click', () => {
      this._openPicker(this.selectedColor, (c) => {
        this.selectedColor = c;
        this.onColorSelect?.(c);
        this.render();
      });
    });
    topRow.appendChild(activeSwatch);

    // Swatches
    const row = document.createElement('div');
    row.className = 'palette-swatches';
    for (let i = 0; i < this.colors.length; i++) {
      const color = this.colors[i];
      const sw = document.createElement('button');
      sw.className = 'palette-swatch';
      if (color === this.selectedColor) sw.classList.add('selected');
      sw.style.backgroundColor = color;
      sw.title = color;
      sw.addEventListener('click', () => {
        this.selectedColor = color;
        this.onColorSelect?.(color);
        this.render();
      });
      sw.addEventListener('dblclick', (e) => {
        e.preventDefault();
        this._openPicker(color, (c) => {
          this.colors[i] = c;
          this.selectedColor = c;
          this.onColorSelect?.(c);
          this.onPaletteChange?.(this.colors);
          this.render();
        });
      });
      row.appendChild(sw);
    }
    const addBtn = document.createElement('button');
    addBtn.className = 'palette-swatch palette-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add color';
    addBtn.addEventListener('click', () => {
      this._openPicker(this.selectedColor, (c) => {
        if (!this.colors.includes(c)) {
          this.colors.push(c);
          this.onPaletteChange?.(this.colors);
        }
        this.selectedColor = c;
        this.onColorSelect?.(c);
        this.render();
      });
    });
    row.appendChild(addBtn);
    topRow.appendChild(row);
    this.container.appendChild(topRow);

    // Palettes toggle
    const toggleRow = document.createElement('div');
    toggleRow.className = 'palette-toggle-row';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-sm';
    toggleBtn.textContent = this.libraryOpen ? 'Hide Palettes' : 'Palettes…';
    toggleBtn.addEventListener('click', () => {
      this.libraryOpen = !this.libraryOpen;
      this.render();
    });
    toggleRow.appendChild(toggleBtn);
    this.container.appendChild(toggleRow);

    if (this.libraryOpen) {
      this._renderLibrary();
    }
  }

  _renderLibrary() {
    const lib = document.createElement('div');
    lib.className = 'palette-library';

    // Save current palette
    const saveRow = document.createElement('div');
    saveRow.className = 'palette-library-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm';
    saveBtn.textContent = 'Save Current…';
    saveBtn.title = 'Save the current palette to your library';
    saveBtn.addEventListener('click', () => {
      const name = prompt('Palette name:');
      if (!name || !name.trim()) return;
      PaletteLibrary.save({
        name: name.trim(),
        colors: [...this.colors],
      });
      this.render();
    });
    saveRow.appendChild(saveBtn);
    lib.appendChild(saveRow);

    // Saved palettes
    const saved = PaletteLibrary.list();
    if (saved.length > 0) {
      const savedSection = document.createElement('div');
      savedSection.className = 'palette-library-section';
      const label = document.createElement('div');
      label.className = 'palette-library-label';
      label.textContent = 'Saved';
      savedSection.appendChild(label);
      for (const p of saved) {
        savedSection.appendChild(this._renderPaletteItem(p, true));
      }
      lib.appendChild(savedSection);
    }

    // Presets
    const presetSection = document.createElement('div');
    presetSection.className = 'palette-library-section';
    const presetLabel = document.createElement('div');
    presetLabel.className = 'palette-library-label';
    presetLabel.textContent = 'Presets';
    presetSection.appendChild(presetLabel);
    for (const p of PRESET_PALETTES) {
      presetSection.appendChild(this._renderPaletteItem(p, false));
    }
    lib.appendChild(presetSection);

    this.container.appendChild(lib);
  }

  _renderPaletteItem(palette, deletable) {
    const item = document.createElement('div');
    item.className = 'palette-library-item';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'palette-library-load';
    loadBtn.title = `Load "${palette.name}" — replaces current palette`;

    const name = document.createElement('span');
    name.className = 'palette-library-name';
    name.textContent = palette.name;
    loadBtn.appendChild(name);

    const swatches = document.createElement('span');
    swatches.className = 'palette-library-swatches';
    for (const c of palette.colors) {
      const sw = document.createElement('span');
      sw.className = 'palette-library-mini-swatch';
      sw.style.backgroundColor = c;
      swatches.appendChild(sw);
    }
    loadBtn.appendChild(swatches);

    loadBtn.addEventListener('click', () => {
      this._loadPalette(palette.colors);
    });
    item.appendChild(loadBtn);

    if (deletable) {
      const delBtn = document.createElement('button');
      delBtn.className = 'palette-library-delete';
      delBtn.textContent = '×';
      delBtn.title = `Delete "${palette.name}"`;
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete palette "${palette.name}"?`)) return;
        PaletteLibrary.delete(palette.id);
        this.render();
      });
      item.appendChild(delBtn);
    }

    return item;
  }

  _loadPalette(colors) {
    this.colors = [...colors];
    if (!this.colors.includes(this.selectedColor)) {
      this.selectedColor = this.colors[0] ?? '#000000';
      this.onColorSelect?.(this.selectedColor);
    }
    this.onPaletteChange?.(this.colors);
    this.render();
  }

  _openPicker(startColor, onPick) {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = startColor;
    input.addEventListener('input', () => onPick(input.value));
    input.click();
  }

  setColors(colors) {
    this.colors = [...colors];
    if (!this.colors.includes(this.selectedColor)) {
      this.selectedColor = this.colors[0] ?? '#000000';
    }
    this.render();
  }
}
