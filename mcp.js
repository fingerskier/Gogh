const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const WebSocket = require('ws');

const GOGH_URL = process.env.GOGH_URL || 'http://localhost:3000';
const WS_URL = GOGH_URL.replace(/^http/, 'ws') + '/';

let ws;
let connected = false;
let pendingUpdate = null;

function connectWs() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      connected = true;
      resolve();
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if ((msg.type === 'update' || msg.type === 'init') && pendingUpdate) {
        pendingUpdate(msg);
        pendingUpdate = null;
      }
    });
    ws.on('close', () => { connected = false; });
    ws.on('error', (err) => {
      if (!connected) reject(err);
    });
  });
}

function sendAndWait(msg) {
  return new Promise((resolve, reject) => {
    pendingUpdate = resolve;
    ws.send(JSON.stringify(msg));
    setTimeout(() => {
      if (pendingUpdate) {
        pendingUpdate = null;
        reject(new Error('Timeout waiting for server response'));
      }
    }, 10000);
  });
}

async function fetchSnapshot(selectionOnly = false) {
  const url = `${GOGH_URL}/api/snapshot${selectionOnly ? '?selection=true' : ''}`;
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

async function fetchState() {
  const resp = await fetch(`${GOGH_URL}/api/state`);
  return resp.json();
}

async function main() {
  // Connect to the Gogh web server
  try {
    await connectWs();
  } catch (err) {
    console.error(`Failed to connect to Gogh server at ${GOGH_URL}. Make sure the server is running (npm start).`);
    process.exit(1);
  }

  const server = new McpServer({
    name: 'gogh',
    version: '0.1.0',
  });

  server.tool('get_canvas_info', 'Get canvas dimensions, selection, and undo/redo state', {}, async () => {
    const state = await fetchState();
    return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
  });

  server.tool('get_canvas_snapshot', 'Get a PNG screenshot of the canvas (or just the selected region)',
    { selection_only: z.boolean().optional().describe('If true, return only the selected region') },
    async ({ selection_only }) => {
      const base64 = await fetchSnapshot(selection_only || false);
      return { content: [{ type: 'image', data: base64, mimeType: 'image/png' }] };
    }
  );

  server.tool('draw_rect', 'Draw a rectangle on the canvas', {
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    width: z.number().describe('Width'),
    height: z.number().describe('Height'),
    color: z.string().optional().describe('Hex color (default: #000000)'),
    filled: z.boolean().optional().describe('Fill the rectangle (default: false)'),
    lineWidth: z.number().optional().describe('Stroke width (default: 2)'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'rect', ...params } });
    return { content: [{ type: 'text', text: `Drew rectangle at (${params.x}, ${params.y}) ${params.width}x${params.height}` }] };
  });

  server.tool('draw_ellipse', 'Draw an ellipse on the canvas', {
    cx: z.number().describe('Center X'),
    cy: z.number().describe('Center Y'),
    rx: z.number().describe('Radius X'),
    ry: z.number().describe('Radius Y'),
    color: z.string().optional().describe('Hex color'),
    filled: z.boolean().optional().describe('Fill the ellipse'),
    lineWidth: z.number().optional().describe('Stroke width'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'ellipse', ...params } });
    return { content: [{ type: 'text', text: `Drew ellipse at (${params.cx}, ${params.cy})` }] };
  });

  server.tool('draw_line', 'Draw a line on the canvas', {
    x1: z.number().describe('Start X'),
    y1: z.number().describe('Start Y'),
    x2: z.number().describe('End X'),
    y2: z.number().describe('End Y'),
    color: z.string().optional().describe('Hex color'),
    width: z.number().optional().describe('Line width'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'line', ...params } });
    return { content: [{ type: 'text', text: `Drew line from (${params.x1}, ${params.y1}) to (${params.x2}, ${params.y2})` }] };
  });

  server.tool('draw_stroke', 'Draw a freeform stroke on the canvas', {
    points: z.array(z.object({ x: z.number(), y: z.number() })).describe('Array of {x, y} points'),
    color: z.string().optional().describe('Hex color'),
    width: z.number().optional().describe('Stroke width'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'stroke', ...params } });
    return { content: [{ type: 'text', text: `Drew stroke with ${params.points.length} points` }] };
  });

  server.tool('fill_area', 'Flood fill an area with a color', {
    x: z.number().describe('X coordinate to start fill'),
    y: z.number().describe('Y coordinate to start fill'),
    color: z.string().optional().describe('Hex color'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'fill', ...params } });
    return { content: [{ type: 'text', text: `Filled area at (${params.x}, ${params.y})` }] };
  });

  server.tool('draw_text', 'Draw text on the canvas', {
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    text: z.string().describe('Text to draw'),
    font: z.string().optional().describe('CSS font string (e.g. "24px sans-serif")'),
    color: z.string().optional().describe('Hex color'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'drawText', ...params } });
    return { content: [{ type: 'text', text: `Drew text "${params.text}" at (${params.x}, ${params.y})` }] };
  });

  server.tool('paste_image', 'Paste a base64-encoded PNG image onto the canvas', {
    x: z.number().optional().describe('X coordinate (default: 0)'),
    y: z.number().optional().describe('Y coordinate (default: 0)'),
    image_base64: z.string().describe('Base64-encoded PNG image data'),
  }, async (params) => {
    await sendAndWait({
      type: 'operation',
      op: { type: 'paste', x: params.x || 0, y: params.y || 0, imageBase64: params.image_base64 },
    });
    return { content: [{ type: 'text', text: `Pasted image at (${params.x || 0}, ${params.y || 0})` }] };
  });

  server.tool('clear_canvas', 'Clear the entire canvas', {
    color: z.string().optional().describe('Background color (default: #ffffff)'),
  }, async (params) => {
    await sendAndWait({ type: 'operation', op: { type: 'clear', color: params.color } });
    return { content: [{ type: 'text', text: 'Canvas cleared' }] };
  });

  server.tool('undo', 'Undo the last operation', {}, async () => {
    await sendAndWait({ type: 'undo' });
    return { content: [{ type: 'text', text: 'Undone' }] };
  });

  server.tool('redo', 'Redo the last undone operation', {}, async () => {
    await sendAndWait({ type: 'redo' });
    return { content: [{ type: 'text', text: 'Redone' }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
