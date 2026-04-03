const MAX_UNDO = 50;

class History {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  push(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentSnapshot) {
    if (this.undoStack.length === 0) return null;
    const prev = this.undoStack.pop();
    this.redoStack.push(currentSnapshot);
    return prev;
  }

  redo(currentSnapshot) {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop();
    this.undoStack.push(currentSnapshot);
    return next;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }
}

module.exports = { History };
