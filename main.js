const { app, BrowserWindow, Menu, shell } = require('electron');
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

  // Custom Minimal Menu Bar
  const template = [
    {
      label: '파일 (File)',
      submenu: [
        { label: '새 문서', accelerator: 'CmdOrCtrl+N', click: () => { mainWindow.webContents.executeJavaScript('document.getElementById("btn-clear").click();'); } },
        { label: 'MD 파일 다운로드', accelerator: 'CmdOrCtrl+S', click: () => { mainWindow.webContents.executeJavaScript('document.getElementById("btn-export-md").click();'); } },
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
        { label: '워드 문서 모드', click: () => { mainWindow.webContents.executeJavaScript('document.getElementById("btn-view-word").click();'); } },
        { label: '나란히 보기 (분할 뷰)', click: () => { mainWindow.webContents.executeJavaScript('document.getElementById("btn-toggle-view").click();'); } },
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
