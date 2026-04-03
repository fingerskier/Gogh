const Tools = (() => {
  function getSettings() {
    return {
      color: document.getElementById('color-picker').value,
      width: parseInt(document.getElementById('stroke-width').value, 10),
      filled: document.getElementById('filled-checkbox').checked,
    };
  }

  const pen = {
    name: 'pen',
    points: [],
    onMouseDown(x, y, ctx) {
      this.points = [{ x, y }];
    },
    onMouseMove(x, y, ctx) {
      this.points.push({ x, y });
      const s = getSettings();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.stroke();
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return { type: 'stroke', points: this.points, color: s.color, width: s.width };
    },
  };

  const line = {
    name: 'line',
    startX: 0, startY: 0,
    onMouseDown(x, y) {
      this.startX = x;
      this.startY = y;
    },
    onMouseMove(x, y, ctx) {
      const s = getSettings();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return { type: 'line', x1: this.startX, y1: this.startY, x2: x, y2: y, color: s.color, width: s.width };
    },
  };

  const rect = {
    name: 'rect',
    startX: 0, startY: 0,
    onMouseDown(x, y) {
      this.startX = x;
      this.startY = y;
    },
    onMouseMove(x, y, ctx) {
      const s = getSettings();
      const w = x - this.startX;
      const h = y - this.startY;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      if (s.filled) {
        ctx.fillRect(this.startX, this.startY, w, h);
      } else {
        ctx.strokeRect(this.startX, this.startY, w, h);
      }
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return {
        type: 'rect',
        x: this.startX, y: this.startY,
        width: x - this.startX, height: y - this.startY,
        color: s.color, filled: s.filled, lineWidth: s.width,
      };
    },
  };

  const ellipse = {
    name: 'ellipse',
    startX: 0, startY: 0,
    onMouseDown(x, y) {
      this.startX = x;
      this.startY = y;
    },
    onMouseMove(x, y, ctx) {
      const s = getSettings();
      const cx = (this.startX + x) / 2;
      const cy = (this.startY + y) / 2;
      const rx = Math.abs(x - this.startX) / 2;
      const ry = Math.abs(y - this.startY) / 2;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (s.filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return {
        type: 'ellipse',
        cx: (this.startX + x) / 2, cy: (this.startY + y) / 2,
        rx: Math.abs(x - this.startX) / 2, ry: Math.abs(y - this.startY) / 2,
        color: s.color, filled: s.filled, lineWidth: s.width,
      };
    },
  };

  const fill = {
    name: 'fill',
    onMouseDown(x, y) {},
    onMouseMove() {},
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return { type: 'fill', x, y, color: s.color };
    },
  };

  const select = {
    name: 'select',
    startX: 0, startY: 0,
    onMouseDown(x, y) {
      this.startX = x;
      this.startY = y;
    },
    onMouseMove(x, y, ctx) {
      const w = x - this.startX;
      const h = y - this.startY;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = '#5a8dd8';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(this.startX, this.startY, w, h);
      ctx.setLineDash([]);
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const selRect = {
        x: Math.min(this.startX, x),
        y: Math.min(this.startY, y),
        width: Math.abs(x - this.startX),
        height: Math.abs(y - this.startY),
      };
      // Draw persistent selection indicator
      ctx.strokeStyle = '#5a8dd8';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(selRect.x, selRect.y, selRect.width, selRect.height);
      ctx.setLineDash([]);
      GoghWS.sendSelection(selRect);
      return null; // No drawing operation
    },
  };

  const eraser = {
    name: 'eraser',
    points: [],
    onMouseDown(x, y) {
      this.points = [{ x, y }];
    },
    onMouseMove(x, y, ctx) {
      this.points.push({ x, y });
      const s = getSettings();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.stroke();
    },
    onMouseUp(x, y, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const s = getSettings();
      return { type: 'stroke', points: this.points, color: '#ffffff', width: s.width };
    },
  };

  return { pen, line, rect, ellipse, fill, select, eraser };
})();
