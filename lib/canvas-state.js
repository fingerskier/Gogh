const { createCanvas, loadImage } = require('canvas');
const { History } = require('./history');
const { executeOp } = require('./operations');

class CanvasState {
  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    this.history = new History();
    this.selection = null;
    this.listeners = [];

    // Initialize with white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }

  saveSnapshot() {
    return this.ctx.getImageData(0, 0, this.width, this.height);
  }

  restoreSnapshot(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }

  async applyOperation(op) {
    this.history.push(this.saveSnapshot());

    if (op.type === 'paste') {
      await this.handlePaste(op);
    } else {
      executeOp(this.ctx, op);
    }

    this.notify();
  }

  async handlePaste(op) {
    const img = await loadImage(Buffer.from(op.imageBase64, 'base64'));
    this.ctx.drawImage(img, op.x || 0, op.y || 0);
  }

  undo() {
    const snapshot = this.history.undo(this.saveSnapshot());
    if (snapshot) {
      this.restoreSnapshot(snapshot);
      this.notify();
      return true;
    }
    return false;
  }

  redo() {
    const snapshot = this.history.redo(this.saveSnapshot());
    if (snapshot) {
      this.restoreSnapshot(snapshot);
      this.notify();
      return true;
    }
    return false;
  }

  setSelection(rect) {
    this.selection = rect;
    this.notify();
  }

  getSnapshot() {
    return this.canvas.toBuffer('image/png');
  }

  getSelectionSnapshot() {
    if (!this.selection) return this.getSnapshot();
    const { x, y, width, height } = this.selection;
    const w = Math.max(1, Math.min(width, this.width - x));
    const h = Math.max(1, Math.min(height, this.height - y));
    const region = createCanvas(w, h);
    const rctx = region.getContext('2d');
    rctx.drawImage(this.canvas, x, y, w, h, 0, 0, w, h);
    return region.toBuffer('image/png');
  }

  getInfo() {
    return {
      width: this.width,
      height: this.height,
      selection: this.selection,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
  }
}

module.exports = { CanvasState };
