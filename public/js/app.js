(() => {
  let currentTool = Tools.pen;
  let drawing = false;

  // Tool selection
  const toolBtns = document.querySelectorAll('.tool-btn');
  toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      toolBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = Tools[btn.dataset.tool];
      // Clear selection preview when switching away from select tool
      if (btn.dataset.tool !== 'select') {
        GoghCanvas.previewCtx.clearRect(0, 0, GoghCanvas.previewCanvas.width, GoghCanvas.previewCanvas.height);
      }
    });
  });

  // Stroke width label
  const strokeWidth = document.getElementById('stroke-width');
  const strokeLabel = document.getElementById('stroke-width-label');
  strokeWidth.addEventListener('input', () => {
    strokeLabel.textContent = strokeWidth.value;
  });

  // Make preview canvas interactive
  GoghCanvas.previewCanvas.style.pointerEvents = 'auto';

  GoghCanvas.previewCanvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const { x, y } = GoghCanvas.getCoords(e);
    currentTool.onMouseDown(x, y, GoghCanvas.previewCtx);
  });

  GoghCanvas.previewCanvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const { x, y } = GoghCanvas.getCoords(e);
    currentTool.onMouseMove(x, y, GoghCanvas.previewCtx);
  });

  window.addEventListener('mouseup', (e) => {
    if (!drawing) return;
    drawing = false;
    const rect = GoghCanvas.previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const op = currentTool.onMouseUp(x, y, GoghCanvas.previewCtx);
    if (op) {
      GoghWS.sendOp(op);
    }
  });

  // WebSocket handlers
  GoghWS.onInit = (msg) => {
    GoghCanvas.loadSnapshot(msg.snapshot);
    updateHistoryButtons(msg.info);
    if (msg.info.currentFile) GoghIO.setCurrentFileFromServer(msg.info.currentFile);
  };

  GoghWS.onUpdate = (msg) => {
    GoghCanvas.loadSnapshot(msg.snapshot);
    updateHistoryButtons(msg.info);
    if (msg.info.currentFile) GoghIO.setCurrentFileFromServer(msg.info.currentFile);
  };

  function updateHistoryButtons(info) {
    document.getElementById('undo-btn').disabled = !info.canUndo;
    document.getElementById('redo-btn').disabled = !info.canRedo;
  }

  // Undo/Redo buttons
  document.getElementById('undo-btn').addEventListener('click', () => GoghWS.sendUndo());
  document.getElementById('redo-btn').addEventListener('click', () => GoghWS.sendRedo());

  // Open / Save via File System Access API
  document.getElementById('open-btn').addEventListener('click', async () => {
    try {
      const file = await GoghIO.open();
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      GoghWS.sendOp({ type: 'paste', x: 0, y: 0, imageBase64: base64 });
    } catch (err) {
      if (err.name !== 'AbortError') alert('Open failed: ' + err.message);
    }
  });

  document.getElementById('save-btn').addEventListener('click', async () => {
    try {
      await GoghIO.save(GoghCanvas.mainCanvas);
    } catch (err) {
      if (err.name !== 'AbortError') alert('Save failed: ' + err.message);
    }
  });

  document.getElementById('save-as-btn').addEventListener('click', async () => {
    try {
      await GoghIO.saveAs(GoghCanvas.mainCanvas);
    } catch (err) {
      if (err.name !== 'AbortError') alert('Save failed: ' + err.message);
    }
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    GoghWS.sendOp({ type: 'clear', color: '#ffffff' });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        GoghWS.sendUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        GoghWS.sendRedo();
      } else if (e.key === 's' && e.shiftKey) {
        e.preventDefault();
        document.getElementById('save-as-btn').click();
      } else if (e.key === 's') {
        e.preventDefault();
        document.getElementById('save-btn').click();
      } else if (e.key === 'o') {
        e.preventDefault();
        document.getElementById('open-btn').click();
      }
      return;
    }

    // Tool shortcuts
    const shortcuts = { p: 'pen', l: 'line', r: 'rect', e: 'ellipse', f: 'fill', s: 'select', x: 'eraser' };
    if (shortcuts[e.key]) {
      const btn = document.querySelector(`[data-tool="${shortcuts[e.key]}"]`);
      if (btn) btn.click();
    }
  });
})();
