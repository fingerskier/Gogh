const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const { CanvasState } = require('./lib/canvas-state');

const PORT = process.env.PORT || 4644;
const canvasState = new CanvasState(800, 600);

const app = express();
app.use(express.json({ limit: '50mb' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: get current canvas as PNG
app.get('/api/snapshot', (req, res) => {
  const selectionOnly = req.query.selection === 'true';
  const buf = selectionOnly ? canvasState.getSelectionSnapshot() : canvasState.getSnapshot();
  res.set('Content-Type', 'image/png');
  res.send(buf);
});

// API: get canvas state info
app.get('/api/state', (req, res) => {
  res.json(canvasState.getInfo());
});

// API: open an image file from disk
app.post('/api/open', async (req, res) => {
  try {
    const filePath = req.body.path;
    if (!filePath) return res.status(400).json({ error: 'path is required' });
    const resolved = path.resolve(filePath);
    const buf = fs.readFileSync(resolved);
    await canvasState.loadFromBuffer(buf);
    canvasState.currentFile = resolved;
    res.json({ ok: true, file: resolved, width: canvasState.width, height: canvasState.height });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: save canvas to disk as PNG
app.post('/api/save', (req, res) => {
  try {
    let filePath = req.body.path || canvasState.currentFile;
    if (!filePath) return res.status(400).json({ error: 'No file path specified and no current file open' });
    filePath = path.resolve(filePath);
    const buf = canvasState.getSnapshot();
    fs.writeFileSync(filePath, buf);
    canvasState.currentFile = filePath;
    res.json({ ok: true, file: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket connections
wss.on('connection', (ws) => {
  // Send initial snapshot
  const snapshot = canvasState.getSnapshot().toString('base64');
  ws.send(JSON.stringify({
    type: 'init',
    snapshot,
    info: canvasState.getInfo(),
  }));

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'operation':
          await canvasState.applyOperation(msg.op);
          break;
        case 'undo':
          canvasState.undo();
          break;
        case 'redo':
          canvasState.redo();
          break;
        case 'selection':
          canvasState.setSelection(msg.rect);
          break;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });
});

// Broadcast updates to all connected clients
canvasState.onChange(() => {
  const snapshot = canvasState.getSnapshot().toString('base64');
  const msg = JSON.stringify({
    type: 'update',
    snapshot,
    info: canvasState.getInfo(),
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
});

server.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Gogh server running at ${url}`);

  // Open file from CLI argument
  const fileArg = process.argv[2];
  if (fileArg) {
    try {
      const resolved = path.resolve(fileArg);
      const buf = fs.readFileSync(resolved);
      await canvasState.loadFromBuffer(buf);
      canvasState.currentFile = resolved;
      console.log(`Opened ${resolved}`);
    } catch (err) {
      console.error(`Failed to open ${fileArg}: ${err.message}`);
    }
  }

  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}`
    : `xdg-open ${url}`;
  exec(cmd);
});
