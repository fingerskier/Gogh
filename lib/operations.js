function executeOp(ctx, op) {
  switch (op.type) {
    case 'stroke': {
      if (!op.points || op.points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = op.color || '#000000';
      ctx.lineWidth = op.width || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) {
        ctx.lineTo(op.points[i].x, op.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'rect': {
      ctx.save();
      ctx.strokeStyle = op.color || '#000000';
      ctx.fillStyle = op.color || '#000000';
      ctx.lineWidth = op.lineWidth || 2;
      if (op.filled) {
        ctx.fillRect(op.x, op.y, op.width, op.height);
      } else {
        ctx.strokeRect(op.x, op.y, op.width, op.height);
      }
      ctx.restore();
      break;
    }

    case 'ellipse': {
      ctx.save();
      ctx.strokeStyle = op.color || '#000000';
      ctx.fillStyle = op.color || '#000000';
      ctx.lineWidth = op.lineWidth || 2;
      ctx.beginPath();
      ctx.ellipse(op.cx, op.cy, Math.abs(op.rx), Math.abs(op.ry), 0, 0, Math.PI * 2);
      if (op.filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'line': {
      ctx.save();
      ctx.strokeStyle = op.color || '#000000';
      ctx.lineWidth = op.width || 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'fill': {
      floodFill(ctx, Math.round(op.x), Math.round(op.y), op.color || '#000000');
      break;
    }

    case 'clear': {
      ctx.save();
      ctx.fillStyle = op.color || '#ffffff';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
      break;
    }

    case 'paste': {
      // For server-side (node-canvas), we need the canvas module's loadImage
      // This op is handled specially in canvas-state.js
      break;
    }

    case 'drawText': {
      ctx.save();
      ctx.fillStyle = op.color || '#000000';
      ctx.font = op.font || '16px sans-serif';
      ctx.fillText(op.text, op.x, op.y);
      ctx.restore();
      break;
    }

    default:
      console.warn(`Unknown operation type: ${op.type}`);
  }
}

function floodFill(ctx, startX, startY, fillColor) {
  const { width, height } = ctx.canvas;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const target = getPixel(data, startX, startY, width);
  const replacement = hexToRgba(fillColor);

  if (target[0] === replacement[0] && target[1] === replacement[1] &&
      target[2] === replacement[2] && target[3] === replacement[3]) {
    return;
  }

  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;

    const current = getPixel(data, x, y, width);
    if (!colorsMatch(current, target, 30)) continue;

    visited[idx] = 1;
    setPixel(data, x, y, width, replacement);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function getPixel(data, x, y, width) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function setPixel(data, x, y, width, color) {
  const i = (y * width + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = color[3];
}

function colorsMatch(a, b, tolerance) {
  return Math.abs(a[0] - b[0]) <= tolerance &&
         Math.abs(a[1] - b[1]) <= tolerance &&
         Math.abs(a[2] - b[2]) <= tolerance &&
         Math.abs(a[3] - b[3]) <= tolerance;
}

function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255];
}

module.exports = { executeOp };
