// ui/gridCanvas.js — Reusable canvas grid component with click interaction

export class GridCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} options
   * @param {number} options.rows - Number of rows
   * @param {number} options.cols - Number of columns
   * @param {number} [options.cellSize=20] - Pixel size of each cell
   * @param {function} [options.onCellClick] - (row, col) callback
   * @param {function} [options.getCellColor] - (row, col) => color string or null
   * @param {boolean} [options.getCellFilled] - (row, col) => boolean (for monochrome grids)
   * @param {string} [options.filledColor='#000000'] - Color for filled cells in monochrome mode
   * @param {string} [options.emptyColor='#ffffff'] - Color for empty cells
   * @param {string} [options.gridLineColor='#cccccc'] - Grid line color
   * @param {string} [options.label] - Optional label shown above the grid
   */
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rows = options.rows;
    this.cols = options.cols;
    this.cellSize = options.cellSize ?? 20;
    this.onCellClick = options.onCellClick ?? null;
    this.getCellColor = options.getCellColor ?? null;
    this.getCellFilled = options.getCellFilled ?? null;
    this.filledColor = options.filledColor ?? '#000000';
    this.emptyColor = options.emptyColor ?? '#ffffff';
    this.gridLineColor = options.gridLineColor ?? '#cccccc';
    this.label = options.label ?? null;

    this.hoverRow = -1;
    this.hoverCol = -1;

    this._resizeCanvas();
    this._bindEvents();
    this.render();
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.cols * this.cellSize + 1;
    const height = this.rows * this.cellSize + 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
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
  }

  _eventToCell(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize),
    };
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
    const { rows, cols, cellSize } = this;

    // Clear
    ctx.fillStyle = this.emptyColor;
    ctx.fillRect(0, 0, cols * cellSize + 1, rows * cellSize + 1);

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

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

    // Draw grid lines
    ctx.strokeStyle = this.gridLineColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = r * cellSize + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(cols * cellSize, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * cellSize + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cellSize);
    }
    ctx.stroke();

    // Draw hover highlight
    if (this.hoverRow >= 0 && this.hoverRow < rows &&
        this.hoverCol >= 0 && this.hoverCol < cols) {
      const x = this.hoverCol * cellSize;
      const y = this.hoverRow * cellSize;
      ctx.fillStyle = 'rgba(0, 120, 255, 0.15)';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = 'rgba(0, 120, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
  }
}
