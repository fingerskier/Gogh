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
  };

  GoghWS.onUpdate = (msg) => {
    GoghCanvas.loadSnapshot(msg.snapshot);
    updateHistoryButtons(msg.info);
  };

  function updateHistoryButtons(info) {
    document.getElementById('undo-btn').disabled = !info.canUndo;
    document.getElementById('redo-btn').disabled = !info.canRedo;
  }

  // Undo/Redo buttons
  document.getElementById('undo-btn').addEventListener('click', () => GoghWS.sendUndo());
  document.getElementById('redo-btn').addEventListener('click', () => GoghWS.sendRedo());

  // Import/Export
  document.getElementById('export-btn').addEventListener('click', () => {
    GoghIO.exportPng(GoghCanvas.mainCanvas);
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    GoghIO.importImage((img) => {
      // Draw image to a temp canvas to get base64
      const tmp = document.createElement('canvas');
      tmp.width = img.width;
      tmp.height = img.height;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(img, 0, 0);
      const dataUrl = tmp.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      GoghWS.sendOp({ type: 'paste', x: 0, y: 0, imageBase64: base64 });
    });
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
      } else if (e.key === 's') {
        e.preventDefault();
        GoghIO.exportPng(GoghCanvas.mainCanvas);
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
