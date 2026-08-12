const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "GIJO Smart MD Studio",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Load index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // The renderer preventDefault()s stray drops itself; this is defense in
  // depth so a dropped file or dragged link can never navigate the window
  // away from the app.
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());

  // Menu items dispatch a named command to the renderer over IPC rather than
  // eval'ing a DOM click — needed now that "내보내기" is a dropdown with no
  // single element to click, and a cleaner pattern than string-eval anyway.
  // Guarded because on macOS the app (and this menu) outlives the window.
  const sendCommand = (cmd) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('menu:command', cmd);
  };

  const template = [
    {
      label: '파일 (File)',
      submenu: [
        { label: '새 문서', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('new-doc') },
        { type: 'separator' },
        {
          label: '내보내기 (Export)',
          submenu: [
            { label: 'Markdown (.md)', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('export-md') },
            { label: 'HTML (.html)', click: () => sendCommand('export-html') },
            { label: 'PDF (.pdf)', click: () => sendCommand('export-pdf') },
            { label: 'Word (.docx)', click: () => sendCommand('export-docx') },
          ]
        },
        { type: 'separator' },
        { label: '종료', role: 'quit' }
      ]
    },
    {
      label: '편집 (Edit)',
      submenu: [
        { label: '실행 취소', role: 'undo' },
        { label: '다시 실행', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', role: 'cut' },
        { label: '복사', role: 'copy' },
        { label: '붙여넣기', role: 'paste' },
        { label: '전체 선택', role: 'selectAll' }
      ]
    },
    {
      label: '보기 (View)',
      submenu: [
        { label: '워드 문서 모드', click: () => sendCommand('word-mode') },
        { label: '나란히 보기 (분할 뷰)', click: () => sendCommand('toggle-view') },
        { type: 'separator' },
        { label: '화면 확대', role: 'zoomIn' },
        { label: '화면 축소', role: 'zoomOut' },
        { label: '원래 크기', role: 'resetZoom' },
        { type: 'separator' },
        { label: '전체 화면', role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// PDF export: renders the current page as-if-printing (respects
// css/print.css's @media print rules) and returns the bytes for the
// renderer to hand off to the same blob-download path used by every other
// export format.
ipcMain.handle('export:print-to-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  // printBackground matters: without it the dark code-block background is
  // dropped while its light text color still applies — near-invisible
  // white-on-white code in the exported PDF.
  const buffer = await win.webContents.printToPDF({ printBackground: true });
  // printToPDF resolves a Node Buffer; hand back a plain Uint8Array instead
  // of the raw Buffer — cloning a Buffer across contextBridge/invoke's
  // structured-clone boundary has been an unreliable edge in some Electron
  // versions (silently never resolving on the renderer side rather than
  // throwing), while a plain typed array is unambiguous to clone.
  return new Uint8Array(buffer);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
