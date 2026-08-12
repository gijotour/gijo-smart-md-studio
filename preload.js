const { contextBridge, ipcRenderer } = require('electron');

// Narrow bridge kept deliberately small — contextIsolation + sandbox stay on,
// so this is the renderer's only way to reach the main process.
contextBridge.exposeInMainWorld('gijoDesktop', {
  isElectron: true,
  platform: process.platform,
  exportPdf: () => ipcRenderer.invoke('export:print-to-pdf'),
  onMenuCommand: (callback) => {
    ipcRenderer.on('menu:command', (_event, command) => callback(command));
  },
});
