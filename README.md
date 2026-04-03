# Gogh
Agentic image editor

* Web UI for user
  * basic drawing tools
  * import/export
  * undo/redo
* MCP for agents
  * tools for editing the image
  * can "see" the user's selection
  * edits go into the undo/redo tree

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## MCP Setup

The MCP server connects to the running web server. Start the web server first, then configure your MCP client:

```json
{
  "mcpServers": {
    "gogh": {
      "command": "node",
      "args": ["/path/to/Gogh/mcp.js"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `get_canvas_info` | Get canvas dimensions, selection, undo/redo state |
| `get_canvas_snapshot` | Get PNG screenshot (full canvas or selection only) |
| `draw_rect` | Draw a rectangle |
| `draw_ellipse` | Draw an ellipse |
| `draw_line` | Draw a line |
| `draw_stroke` | Draw a freeform stroke |
| `fill_area` | Flood fill from a point |
| `draw_text` | Render text |
| `paste_image` | Paste a base64 PNG |
| `clear_canvas` | Clear the canvas |
| `undo` / `redo` | Navigate edit history |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| P | Pen tool |
| L | Line tool |
| R | Rectangle tool |
| E | Ellipse tool |
| F | Fill tool |
| S | Selection tool |
| X | Eraser |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+S | Export PNG |
