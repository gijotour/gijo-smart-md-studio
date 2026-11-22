const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 앱 설정은 사용자 데이터 폴더의 settings.json 한 파일에 둔다.
// 파일이 없거나 깨져 있으면 기본값(업데이트 확인 켬)으로 돈다.
function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

function writeSettings(next) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    // 임시 파일에 다 쓴 뒤 이름을 바꾼다. 쓰는 도중에 앱이 죽어도 반쯤 쓰인 파일이 남지 않는다.
    // (반쯤 쓰인 파일은 읽을 때 기본값으로 돌아가, 꺼 둔 업데이트 확인이 다시 켜진다.)
    const tmp = settingsPath() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, settingsPath());
    return true;
  } catch (err) {
    console.error('Could not save settings:', err);
    return false;
  }
}

function updateCheckEnabled() {
  return readSettings().checkForUpdates !== false;
}

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

  // 파일에 연결된 문서에 저장하지 않은 변경이 있으면 렌더러가 beforeunload 를 막는다.
  // Electron 은 그때 아무것도 묻지 않고 닫기를 조용히 취소한다. 그러면 창이 안 닫히고
  // 「지금 재시작」으로 업데이트를 적용할 수도 없다. 그래서 여기서 직접 묻는다.
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['닫기', '취소'],
      defaultId: 1,
      cancelId: 1,
      title: '저장하지 않은 변경',
      message: '연결된 파일에 저장하지 않은 변경이 있습니다.',
      detail: '그래도 닫으면 그 변경은 파일에 반영되지 않습니다.',
    });
    // 여기서 preventDefault 는 「닫기를 막지 말라」는 뜻이다.
    if (choice === 0) event.preventDefault();
  });

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
    },
    {
      label: '도움말 (Help)',
      submenu: [
        {
          // 업데이트 확인은 이 앱이 스스로 바깥과 통신하는 유일한 곳이라 끌 수 있게 둔다.
          // 이미 시작한 확인은 되돌리지 않고, 다음 실행부터 적용된다.
          label: '시작할 때 업데이트 확인',
          type: 'checkbox',
          checked: updateCheckEnabled(),
          click: (item) => {
            const saved = writeSettings({ ...readSettings(), checkForUpdates: item.checked });
            // 저장에 실패했으면 표시를 실제 설정으로 되돌려 거짓으로 보이지 않게 한다.
            if (!saved) item.checked = updateCheckEnabled();
          }
        }
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

// Auto-update against GitHub Releases. Only meaningful in an installed
// build — in dev there is no update metadata to compare against, and
// electron-updater throws rather than no-oping, so it is not even loaded.
function setupAutoUpdater() {
  if (!app.isPackaged) return;
  if (!updateCheckEnabled()) return;

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    console.error('electron-updater unavailable:', err);
    return;
  }

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId: 1,
      title: '업데이트 준비 완료',
      message: `새 버전 ${info.version} 이(가) 준비되었습니다.`,
      detail: '지금 재시작하면 업데이트가 적용됩니다. 연결된 파일에 저장하지 않은 변경이 있으면 닫기 전에 한 번 더 묻습니다.',
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  // Update failures must never interrupt normal use — no release yet,
  // offline, or a blocked network all surface here.
  autoUpdater.on('error', (err) => console.error('Auto-update check failed:', err));

  // AndNotify 를 쓰지 않는다. 그쪽은 내려받기가 끝나면 영어 알림을 따로 띄워,
  // 위의 재시작 창과 겹친다. 내려받기는 checkForUpdates 만으로도 이어진다.
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Auto-update check failed:', err);
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
