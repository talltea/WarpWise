// ui/palette.js — Color palette: active color + swatches

export class PalettePanel {
  constructor(container, options) {
    this.container = container;
    this.colors = [...options.colors];
    this.onColorSelect = options.onColorSelect;
    this.onPaletteChange = options.onPaletteChange;
    this.selectedColor = this.colors[0] ?? '#000000';
    this.render();
  }

  render() {
    this.container.innerHTML = '';

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
    this.container.appendChild(activeSwatch);

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
    this.container.appendChild(row);
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
