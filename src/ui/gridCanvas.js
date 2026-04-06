// ui/gridCanvas.js — Reusable canvas grid component with scroll, click, hover

export class GridCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} options
   * @param {number} options.rows
   * @param {number} options.cols
   * @param {number} [options.cellSize=20]
   * @param {number|null} [options.maxViewportWidth] - Max visible width in px (null = show all cols)
   * @param {number|null} [options.maxViewportHeight] - Max visible height in px (null = show all rows)
   * @param {function} [options.onCellClick] - (row, col) callback
   * @param {function} [options.getCellColor] - (row, col) => color string or null
   * @param {function} [options.getCellFilled] - (row, col) => boolean
   * @param {function} [options.onScroll] - ({ scrollX, scrollY }) callback for sync
   * @param {string} [options.filledColor='#000000']
   * @param {string} [options.emptyColor='#ffffff']
   * @param {string} [options.gridLineColor='#cccccc']
   */
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rows = options.rows;
    this.cols = options.cols;
    this.cellSize = options.cellSize ?? 20;
    this.maxViewportWidth = options.maxViewportWidth ?? null;
    this.maxViewportHeight = options.maxViewportHeight ?? null;
    this.onCellClick = options.onCellClick ?? null;
    this.getCellColor = options.getCellColor ?? null;
    this.getCellFilled = options.getCellFilled ?? null;
    this.onScroll = options.onScroll ?? null;
    this.filledColor = options.filledColor ?? '#000000';
    this.emptyColor = options.emptyColor ?? '#ffffff';
    this.gridLineColor = options.gridLineColor ?? '#cccccc';

    this.scrollX = 0;
    this.scrollY = 0;
    this.hoverRow = -1;
    this.hoverCol = -1;

    this._resizeCanvas();
    this._bindEvents();
    this.render();
  }

  get fullWidth() { return this.cols * this.cellSize; }
  get fullHeight() { return this.rows * this.cellSize; }
  get viewportWidth() {
    return this.maxViewportWidth != null
      ? Math.min(this.maxViewportWidth, this.fullWidth)
      : this.fullWidth;
  }
  get viewportHeight() {
    return this.maxViewportHeight != null
      ? Math.min(this.maxViewportHeight, this.fullHeight)
      : this.fullHeight;
  }
  get maxScrollX() { return Math.max(0, this.fullWidth - this.viewportWidth); }
  get maxScrollY() { return Math.max(0, this.fullHeight - this.viewportHeight); }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _bindEvents() {
    this.canvas.addEventListener('click', (e) => {
      const { row, col } = this._eventToCell(e);
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        this.onCellClick?.(row, col);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { row, col } = this._eventToCell(e);
      if (row !== this.hoverRow || col !== this.hoverCol) {
        this.hoverRow = row;
        this.hoverCol = col;
        this.render();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverRow = -1;
      this.hoverCol = -1;
      this.render();
    });

    this.canvas.addEventListener('wheel', (e) => {
      if (this.maxScrollX === 0 && this.maxScrollY === 0) return;
      e.preventDefault();
      this.scrollX = Math.max(0, Math.min(this.maxScrollX, this.scrollX + e.deltaX));
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + e.deltaY));
      this.onScroll?.({ scrollX: this.scrollX, scrollY: this.scrollY });
      this.render();
    }, { passive: false });
  }

  _eventToCell(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + this.scrollX;
    const y = e.clientY - rect.top + this.scrollY;
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize),
    };
  }

  setScrollX(x) {
    this.scrollX = Math.max(0, Math.min(this.maxScrollX, x));
    this.render();
  }

  setScrollY(y) {
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, y));
    this.render();
  }

  setScroll(x, y) {
    this.scrollX = Math.max(0, Math.min(this.maxScrollX, x));
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, y));
    this.render();
  }

  update(options) {
    if (options.rows !== undefined) this.rows = options.rows;
    if (options.cols !== undefined) this.cols = options.cols;
    if (options.cellSize !== undefined) this.cellSize = options.cellSize;
    if (options.getCellColor !== undefined) this.getCellColor = options.getCellColor;
    if (options.getCellFilled !== undefined) this.getCellFilled = options.getCellFilled;
    this._resizeCanvas();
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const { rows, cols, cellSize, scrollX, scrollY } = this;
    const vw = this.viewportWidth;
    const vh = this.viewportHeight;

    // Determine visible cell range
    const startCol = Math.floor(scrollX / cellSize);
    const endCol = Math.min(cols - 1, Math.floor((scrollX + vw) / cellSize));
    const startRow = Math.floor(scrollY / cellSize);
    const endRow = Math.min(rows - 1, Math.floor((scrollY + vh) / cellSize));

    // Clear
    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(0, 0, vw, vh);

    // Draw cells (only visible ones)
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const x = c * cellSize - scrollX;
        const y = r * cellSize - scrollY;

        let color = null;
        if (this.getCellColor) {
          color = this.getCellColor(r, c);
        } else if (this.getCellFilled) {
          color = this.getCellFilled(r, c) ? this.filledColor : null;
        }

        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Draw grid lines (only visible ones)
    ctx.strokeStyle = this.gridLineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let r = startRow; r <= endRow + 1; r++) {
      const y = r * cellSize - scrollY + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y);
    }
    for (let c = startCol; c <= endCol + 1; c++) {
      const x = c * cellSize - scrollX + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
    }
    ctx.stroke();

    // Draw hover highlight
    if (this.hoverRow >= startRow && this.hoverRow <= endRow &&
        this.hoverCol >= startCol && this.hoverCol <= endCol) {
      const x = this.hoverCol * cellSize - scrollX;
      const y = this.hoverRow * cellSize - scrollY;
      ctx.fillStyle = 'rgba(0, 120, 255, 0.15)';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = 'rgba(0, 120, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
  }
}
