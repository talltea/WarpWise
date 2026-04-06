// ui/palette.js — Color palette UI component

/**
 * Creates a palette panel that lets the user:
 * - Select a color from the draft's palette
 * - Add custom colors via a native color picker
 * - See which color is currently selected
 *
 * @param {HTMLElement} container - Element to render into
 * @param {object} options
 * @param {string[]} options.colors - Initial palette colors
 * @param {function} options.onColorSelect - (color) callback when a color is picked
 * @param {function} options.onPaletteChange - (newPalette) callback when palette is modified
 */
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

    const label = document.createElement('span');
    label.className = 'grid-label';
    label.textContent = 'Palette';
    this.container.appendChild(label);

    const swatchRow = document.createElement('div');
    swatchRow.className = 'palette-swatches';

    for (const color of this.colors) {
      const swatch = document.createElement('button');
      swatch.className = 'palette-swatch';
      if (color === this.selectedColor) swatch.classList.add('selected');
      swatch.style.backgroundColor = color;
      swatch.title = color;
      swatch.addEventListener('click', () => {
        this.selectedColor = color;
        this.onColorSelect?.(color);
        this.render();
      });
      swatchRow.appendChild(swatch);
    }

    // "Add color" button
    const addBtn = document.createElement('button');
    addBtn.className = 'palette-swatch palette-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add color';
    addBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = this.selectedColor;
      input.addEventListener('input', () => {
        const newColor = input.value;
        if (!this.colors.includes(newColor)) {
          this.colors.push(newColor);
          this.onPaletteChange?.(this.colors);
        }
        this.selectedColor = newColor;
        this.onColorSelect?.(newColor);
        this.render();
      });
      input.click();
    });
    swatchRow.appendChild(addBtn);

    this.container.appendChild(swatchRow);
  }

  setColors(colors) {
    this.colors = [...colors];
    if (!this.colors.includes(this.selectedColor)) {
      this.selectedColor = this.colors[0] ?? '#000000';
    }
    this.render();
  }
}
