const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { CanvasState } = require('./lib/canvas-state');

const PORT = process.env.PORT || 3000;
const canvasState = new CanvasState(800, 600);

const app = express();
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

server.listen(PORT, () => {
  console.log(`Gogh server running at http://localhost:${PORT}`);
});
