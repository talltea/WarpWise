// ui/colorTools.js — Color tools: Fill All + Repeat Pattern builder

/**
 * Creates inline color tools (Fill All + Repeat Pattern) for a color bar.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.label - "Warp" or "Weft"
 * @param {function} options.getActiveColor - () => current selected color
 * @param {function} options.getPalette - () => current palette colors
 * @param {function} options.onFillAll - (color) => fill all threads with this color
 * @param {function} options.onApplyPattern - (colorSequence) => apply repeating pattern
 */
export class ColorTools {
  constructor(container, options) {
    this.container = container;
    this.label = options.label;
    this.getActiveColor = options.getActiveColor;
    this.getPalette = options.getPalette;
    this.onFillAll = options.onFillAll;
    this.onApplyPattern = options.onApplyPattern;
    this.patternOpen = false;
    this.pattern = [];
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'color-tools-row';

    // Fill All button
    const fillBtn = document.createElement('button');
    fillBtn.className = 'btn btn-sm';
    fillBtn.textContent = 'Fill All';
    fillBtn.title = `Fill all ${this.label.toLowerCase()} threads with the active color`;
    fillBtn.addEventListener('click', () => {
      this.onFillAll(this.getActiveColor());
    });
    row.appendChild(fillBtn);

    // Repeat Pattern toggle
    const repeatBtn = document.createElement('button');
    repeatBtn.className = 'btn btn-sm';
    repeatBtn.textContent = this.patternOpen ? 'Close Pattern' : 'Repeat Pattern...';
    repeatBtn.addEventListener('click', () => {
      this.patternOpen = !this.patternOpen;
      if (this.patternOpen && this.pattern.length === 0) {
        // Seed with 2 slots of active color
        const c = this.getActiveColor();
        this.pattern = [c, c];
      }
      this.render();
    });
    row.appendChild(repeatBtn);

    this.container.appendChild(row);

    if (this.patternOpen) {
      this._renderPatternBuilder();
    }
  }

  _renderPatternBuilder() {
    const builder = document.createElement('div');
    builder.className = 'pattern-builder';

    const hint = document.createElement('div');
    hint.className = 'pattern-hint';
    hint.textContent = 'Click a slot to set it to the active color. The pattern repeats across all threads.';
    builder.appendChild(hint);

    const slotsRow = document.createElement('div');
    slotsRow.className = 'pattern-slots';

    for (let i = 0; i < this.pattern.length; i++) {
      const slot = document.createElement('button');
      slot.className = 'pattern-slot';
      slot.style.backgroundColor = this.pattern[i];
      slot.title = `Slot ${i + 1}: ${this.pattern[i]} — click to set to active color`;
      slot.addEventListener('click', () => {
        this.pattern[i] = this.getActiveColor();
        this.render();
      });
      slotsRow.appendChild(slot);
    }

    // +/- slot buttons
    const addSlot = document.createElement('button');
    addSlot.className = 'btn btn-sm pattern-slot-btn';
    addSlot.textContent = '+';
    addSlot.title = 'Add slot';
    addSlot.addEventListener('click', () => {
      this.pattern.push(this.getActiveColor());
      this.render();
    });

    const removeSlot = document.createElement('button');
    removeSlot.className = 'btn btn-sm pattern-slot-btn';
    removeSlot.textContent = '\u2212'; // minus sign
    removeSlot.title = 'Remove last slot';
    removeSlot.disabled = this.pattern.length <= 1;
    removeSlot.addEventListener('click', () => {
      if (this.pattern.length > 1) {
        this.pattern.pop();
        this.render();
      }
    });

    slotsRow.appendChild(removeSlot);
    slotsRow.appendChild(addSlot);
    builder.appendChild(slotsRow);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-primary';
    applyBtn.textContent = `Apply to all ${this.label.toLowerCase()} threads`;
    applyBtn.addEventListener('click', () => {
      this.onApplyPattern([...this.pattern]);
    });
    builder.appendChild(applyBtn);

    this.container.appendChild(builder);
  }
}
