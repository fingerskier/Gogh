const GoghWS = (() => {
  let socket;
  let onUpdate = null;
  let onInit = null;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${proto}//${location.host}/`);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init' && onInit) onInit(msg);
      if (msg.type === 'update' && onUpdate) onUpdate(msg);
      if (msg.type === 'error') console.error('Server error:', msg.message);
    };

    socket.onclose = () => {
      setTimeout(connect, 1000);
    };
  }

  function send(msg) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }

  function sendOp(op) {
    send({ type: 'operation', op });
  }

  function sendUndo() {
    send({ type: 'undo' });
  }

  function sendRedo() {
    send({ type: 'redo' });
  }

  function sendSelection(rect) {
    send({ type: 'selection', rect });
  }

  connect();

  return {
    sendOp,
    sendUndo,
    sendRedo,
    sendSelection,
    set onUpdate(fn) { onUpdate = fn; },
    set onInit(fn) { onInit = fn; },
  };
})();
