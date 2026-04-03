const GoghIO = (() => {
  let fileHandle = null;

  const imageTypes = [{
    description: 'Image files',
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
  }];

  function getFileHandle() { return fileHandle; }

  function setFileHandle(handle) {
    fileHandle = handle;
    const name = handle ? handle.name : '';
    const el = document.getElementById('file-name');
    if (el) el.textContent = name;
    if (el) el.title = name;
    document.title = name ? `Gogh — ${name}` : 'Gogh';
  }

  async function open() {
    const [handle] = await window.showOpenFilePicker({ types: imageTypes, multiple: false });
    const file = await handle.getFile();
    setFileHandle(handle);
    return file;
  }

  async function save(canvas) {
    if (!fileHandle) return saveAs(canvas);
    const blob = await canvasToBlob(canvas);
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async function saveAs(canvas) {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileHandle ? fileHandle.name : 'gogh.png',
      types: imageTypes,
    });
    setFileHandle(handle);
    const blob = await canvasToBlob(canvas);
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  // Server-side open/save (for MCP/CLI currentFile sync)
  function setCurrentFileFromServer(name) {
    if (!fileHandle && name) {
      const el = document.getElementById('file-name');
      if (el) el.textContent = name.split(/[/\\]/).pop();
      if (el) el.title = name;
      document.title = `Gogh — ${name.split(/[/\\]/).pop()}`;
    }
  }

  async function saveToServer(filePath) {
    const resp = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath || undefined }),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error);
    return result;
  }

  return { open, save, saveAs, getFileHandle, setFileHandle, setCurrentFileFromServer, saveToServer };
})();
