const GoghIO = (() => {
  function exportPng(canvas) {
    const link = document.createElement('a');
    link.download = 'gogh-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function importImage(callback) {
    const input = document.getElementById('file-input');
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => callback(img);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      input.value = '';
    };
    input.click();
  }

  return { exportPng, importImage };
})();
