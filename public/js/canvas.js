const GoghCanvas = (() => {
  const mainCanvas = document.getElementById('main-canvas');
  const previewCanvas = document.getElementById('preview-canvas');
  const mainCtx = mainCanvas.getContext('2d');
  const previewCtx = previewCanvas.getContext('2d');

  function loadSnapshot(base64) {
    const img = new Image();
    img.onload = () => {
      mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      mainCtx.drawImage(img, 0, 0);
    };
    img.src = 'data:image/png;base64,' + base64;
  }

  function getCoords(e) {
    const rect = previewCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  return {
    mainCanvas,
    previewCanvas,
    mainCtx,
    previewCtx,
    loadSnapshot,
    getCoords,
  };
})();
