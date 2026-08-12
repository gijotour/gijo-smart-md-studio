const { contextBridge } = require('electron');

// Minimal bridge so the renderer can feature-detect the desktop build without
// any Node integration. Extended in later phases (PDF export IPC, native menu
// command dispatch) — kept narrow on purpose since contextIsolation stays on.
contextBridge.exposeInMainWorld('gijoDesktop', {
  isElectron: true,
  platform: process.platform,
});
