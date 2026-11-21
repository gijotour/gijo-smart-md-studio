// IndexedDB-backed document library + version history. Global-script module
// (window.GijoStorage), matching the pattern already used by templates.js —
// no bundler, no ES modules.
//
// localStorage (used by v1.0) tops out around 5-10MB per origin, which a
// handful of screenshot-heavy documents blows through immediately. IndexedDB
// has no such practical ceiling. The legacy localStorage keys are read once
// for migration and then left alone (never deleted) as a safety net.
const GijoStorage = (() => {
  const DB_NAME = 'gijo-md-studio';
  const DB_VERSION = 2;
  const STORE_DOCS = 'documents';
  const STORE_HISTORY = 'history';
  const STORE_SETTINGS = 'settings';
  const FOLDER_SETTING_KEY = 'lastFolder';
  const HISTORY_LIMIT = 20;

  const LEGACY_KEY_CONTENT = 'gijo_md_studio_content';
  const LEGACY_KEY_TITLE = 'gijo_md_studio_title';
  const MIGRATION_FLAG = 'gijo_md_studio_migrated_v2';

  let dbPromise = null;
  let available = true;

  // Manual ID generation — deliberately not crypto.randomUUID(), which
  // throws outside secure contexts (HTTPS or localhost). This app's own
  // README documents LAN-style deployment via `python -m http.server`,
  // exactly the scenario where that API would be unavailable.
  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function runTx(storeNames, mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const result = fn(tx);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    }));
  }

  // 화면 위쪽에 띄우는 한 줄 알림. 저장소가 열리기 전에도 떠야 해서 여기서 직접 만든다.
  function showStorageNotice(message) {
    let bar = document.getElementById('storage-notice');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'storage-notice';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:5000;padding:12px 16px;' +
        'background:#b45309;color:#fff;font-size:14px;font-weight:600;line-height:1.5;text-align:center;';
      (document.body || document.documentElement).appendChild(bar);
    }
    bar.textContent = message;
  }

  function hideStorageNotice() {
    const bar = document.getElementById('storage-notice');
    if (bar) bar.remove();
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) {
      available = false;
      dbPromise = Promise.reject(new Error('IndexedDB is not available in this environment'));
      return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      const BLOCKED_MESSAGE = '다른 탭이나 창에 MD 스튜디오가 예전 판으로 열려 있어 문서함을 열지 못하고 있습니다. 그 탭을 닫거나 새로 고치면 바로 열립니다. 문서는 그대로 있습니다.';
      // 다른 탭의 요청 뒤에 줄을 서 있을 때는 blocked 신호가 오지 않는다. 그래서 4초가 지나도 안 열리면 같은 안내를 띄운다.
      const slowTimer = setTimeout(() => showStorageNotice(BLOCKED_MESSAGE), 4000);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('by_docId', 'docId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
      // 저장소 판(version)을 올리려면 예전 판으로 열려 있는 다른 탭이 닫혀야 한다.
      // 그 탭이 열려 있으면 여기서 기다리게 되므로, 멈춘 것처럼 보이지 않게 까닭을 알린다.
      req.onblocked = () => {
        showStorageNotice(BLOCKED_MESSAGE);
      };
      req.onsuccess = () => {
        const db = req.result;
        clearTimeout(slowTimer);
        hideStorageNotice();
        // 나중에 다른 탭이 더 새 판으로 열리면 이 탭이 길을 비켜 준다(그 탭이 멈추지 않게).
        db.onversionchange = () => {
          db.close();
          showStorageNotice('MD 스튜디오가 다른 탭에서 새 판으로 열렸습니다. 이 탭을 새로 고쳐 주세요. 문서는 그대로 있습니다.');
        };
        resolve(db);
      };
      req.onerror = () => { clearTimeout(slowTimer); reject(req.error); };
    });
    dbPromise.catch(() => { available = false; });
    return dbPromise;
  }

  function countImages(content) {
    const matches = content.match(/!\[.*?\]\(data:image\/.*?;base64,.*?\)|!\[.*?\]\(.*?\)/g);
    return matches ? matches.length : 0;
  }

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  async function getAllDocuments() {
    const db = await openDb();
    const tx = db.transaction(STORE_DOCS, 'readonly');
    const docs = await promisifyRequest(tx.objectStore(STORE_DOCS).getAll());
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function getDocument(id) {
    const db = await openDb();
    const tx = db.transaction(STORE_DOCS, 'readonly');
    return promisifyRequest(tx.objectStore(STORE_DOCS).get(id));
  }

  async function saveDocument(doc) {
    await runTx(STORE_DOCS, 'readwrite', (tx) => {
      tx.objectStore(STORE_DOCS).put(doc);
    });
    return doc;
  }

  function makeDocument({ title, content, pinned, fileHandle, fileName, lineEnding, hadBom, encoding, fileDirty } = {}) {
    const now = Date.now();
    const doc = {
      id: generateId(),
      title: title || '제목 없는 문서',
      content: content || '',
      pinned: !!pinned,
      createdAt: now,
      updatedAt: now,
      sizeBytes: byteLength(content || ''),
      imageCount: countImages(content || ''),
    };
    if (fileHandle) {
      doc.fileHandle = fileHandle;
      doc.fileName = fileName || fileHandle.name || '';
      doc.lineEnding = lineEnding || 'LF';
      doc.hadBom = !!hadBom;
      doc.encoding = encoding || 'utf-8';
      doc.fileDirty = !!fileDirty;
    }
    return doc;
  }

  async function createDocument(options = {}) {
    const doc = makeDocument(options);
    await saveDocument(doc);
    return doc;
  }

  async function updateDocumentContent(id, { title, content, fileDirty }) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    doc.title = title;
    doc.content = content;
    doc.updatedAt = Date.now();
    doc.sizeBytes = byteLength(content || '');
    doc.imageCount = countImages(content || '');
    if (typeof fileDirty === 'boolean' && doc.fileHandle) {
      doc.fileDirty = fileDirty;
    }
    await saveDocument(doc);
    return doc;
  }

  async function renameDocument(id, title) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    doc.title = title;
    doc.updatedAt = Date.now();
    await saveDocument(doc);
    return doc;
  }

  async function setDocumentPinned(id, pinned) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    doc.pinned = !!pinned;
    await saveDocument(doc);
    return doc;
  }

  async function updateDocumentFileLink(id, linkMeta) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    if (!linkMeta || !linkMeta.fileHandle) {
      delete doc.fileHandle;
      delete doc.fileName;
      delete doc.lineEnding;
      delete doc.hadBom;
      delete doc.encoding;
      delete doc.fileDirty;
    } else {
      doc.fileHandle = linkMeta.fileHandle;
      doc.fileName = linkMeta.fileName || linkMeta.fileHandle.name || '';
      doc.lineEnding = linkMeta.lineEnding || 'LF';
      doc.hadBom = !!linkMeta.hadBom;
      doc.encoding = linkMeta.encoding || 'utf-8';
      doc.fileDirty = !!linkMeta.fileDirty;
    }
    await saveDocument(doc);
    return doc;
  }

  async function duplicateDocument(id) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    return createDocument({ title: `${doc.title} (복사본)`, content: doc.content });
  }

  // --- Backup / restore ---
  //
  // Documents only, deliberately: version-history snapshots hold full copies
  // of image-heavy content (up to HISTORY_LIMIT per document), which would
  // multiply a backup's size several-fold for data that is by definition
  // recoverable working state rather than the documents themselves.
  const BACKUP_FORMAT = 'gijo-md-studio-backup';
  const BACKUP_VERSION = 1;

  async function exportBackup() {
    // Strip fileHandle and file-link metadata — handles are not JSON-serializable,
    // and restored documents always come back as unlinked library documents.
    const documents = (await getAllDocuments()).map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      pinned: !!doc.pinned,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      sizeBytes: doc.sizeBytes,
      imageCount: doc.imageCount,
    }));
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      documentCount: documents.length,
      documents,
    };
  }

  // Additive by design — a restore must never destroy documents the user
  // created since the backup was taken. Documents whose id already exists
  // are skipped rather than overwritten (their content may well be newer).
  async function importBackup(payload) {
    if (!payload || payload.format !== BACKUP_FORMAT || !Array.isArray(payload.documents)) {
      throw new Error('INVALID_BACKUP');
    }
    if (payload.version > BACKUP_VERSION) throw new Error('UNSUPPORTED_VERSION');

    const existing = new Set((await getAllDocuments()).map((d) => d.id));
    let imported = 0;
    let skipped = 0;

    for (const raw of payload.documents) {
      if (!raw || typeof raw.content !== 'string') { skipped++; continue; }
      if (raw.id && existing.has(raw.id)) { skipped++; continue; }
      const now = Date.now();
      await saveDocument({
        id: raw.id || generateId(),
        title: typeof raw.title === 'string' && raw.title ? raw.title : '제목 없는 문서',
        content: raw.content,
        pinned: !!raw.pinned,
        createdAt: Number(raw.createdAt) || now,
        updatedAt: Number(raw.updatedAt) || now,
        sizeBytes: byteLength(raw.content),
        imageCount: countImages(raw.content),
      });
      imported++;
    }
    return { imported, skipped };
  }

  async function getHistory(docId) {
    const db = await openDb();
    const tx = db.transaction(STORE_HISTORY, 'readonly');
    const index = tx.objectStore(STORE_HISTORY).index('by_docId');
    const entries = await promisifyRequest(index.getAll(IDBKeyRange.only(docId)));
    return entries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async function pruneHistory(docId) {
    const stale = (await getHistory(docId)).slice(HISTORY_LIMIT);
    if (!stale.length) return;
    await runTx(STORE_HISTORY, 'readwrite', (tx) => {
      const store = tx.objectStore(STORE_HISTORY);
      stale.forEach((entry) => store.delete(entry.id));
    });
  }

  async function createSnapshot(docId, title, content) {
    await runTx(STORE_HISTORY, 'readwrite', (tx) => {
      tx.objectStore(STORE_HISTORY).add({ docId, title, content, savedAt: Date.now() });
    });
    await pruneHistory(docId);
  }

  async function restoreSnapshot(historyId) {
    const db = await openDb();
    const tx = db.transaction(STORE_HISTORY, 'readonly');
    const entry = await promisifyRequest(tx.objectStore(STORE_HISTORY).get(historyId));
    if (!entry) throw new Error(`History entry not found: ${historyId}`);
    return updateDocumentContent(entry.docId, { title: entry.title, content: entry.content });
  }

  async function deleteDocument(id) {
    const historyEntries = await getHistory(id);
    await runTx([STORE_DOCS, STORE_HISTORY], 'readwrite', (tx) => {
      tx.objectStore(STORE_DOCS).delete(id);
      const historyStore = tx.objectStore(STORE_HISTORY);
      historyEntries.forEach((entry) => historyStore.delete(entry.id));
    });
  }

  // One-time import of the v1.0 single-document localStorage content into
  // the first library record. Legacy keys are left in place afterward.
  // If IndexedDB turns out to be unavailable, this is also where we find
  // out — `available` flips to false and initApp() in app.js is expected
  // to check isAvailable() and degrade the UI accordingly.
  async function runMigrationIfNeeded() {
    if (localStorage.getItem(MIGRATION_FLAG)) {
      await openDb().catch(() => {});
      return;
    }
    try {
      const legacyContent = localStorage.getItem(LEGACY_KEY_CONTENT);
      const existingDocs = await getAllDocuments();
      if (legacyContent && legacyContent.trim() && existingDocs.length === 0) {
        const legacyTitle = localStorage.getItem(LEGACY_KEY_TITLE) || '개발 요청 및 기술 문서';
        await createDocument({ title: legacyTitle, content: legacyContent });
      }
      localStorage.setItem(MIGRATION_FLAG, '1');
    } catch (err) {
      // openDb() already flipped `available` to false; nothing further to do.
      console.warn('GijoStorage migration skipped — IndexedDB unavailable:', err);
    }
  }

  async function saveFolderHandle(handle) {
    if (!handle) return;
    await runTx(STORE_SETTINGS, 'readwrite', (tx) => {
      tx.objectStore(STORE_SETTINGS).put({
        key: FOLDER_SETTING_KEY,
        handle,
        name: handle.name || '',
        savedAt: Date.now(),
      });
    });
  }

  async function getSavedFolderHandle() {
    try {
      const db = await openDb();
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) return null;
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const record = await promisifyRequest(tx.objectStore(STORE_SETTINGS).get(FOLDER_SETTING_KEY));
      return (record && record.handle) ? record.handle : null;
    } catch (_) {
      return null;
    }
  }

  async function clearSavedFolderHandle() {
    try {
      await runTx(STORE_SETTINGS, 'readwrite', (tx) => {
        tx.objectStore(STORE_SETTINGS).delete(FOLDER_SETTING_KEY);
      });
    } catch (_) { /* ignore */ }
  }

  return {
    isAvailable: () => available,
    runMigrationIfNeeded,
    getAllDocuments,
    getDocument,
    createDocument,
    updateDocumentContent,
    renameDocument,
    setDocumentPinned,
    updateDocumentFileLink,
    duplicateDocument,
    exportBackup,
    importBackup,
    deleteDocument,
    getHistory,
    createSnapshot,
    restoreSnapshot,
    saveFolderHandle,
    getSavedFolderHandle,
    clearSavedFolderHandle,
  };
})();

window.GijoStorage = GijoStorage;
