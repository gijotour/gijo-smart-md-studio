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
  const DB_VERSION = 1;
  const STORE_DOCS = 'documents';
  const STORE_HISTORY = 'history';
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

  function openDb() {
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) {
      available = false;
      dbPromise = Promise.reject(new Error('IndexedDB is not available in this environment'));
      return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('by_docId', 'docId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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

  function makeDocument({ title, content }) {
    const now = Date.now();
    return {
      id: generateId(),
      title: title || '제목 없는 문서',
      content: content || '',
      createdAt: now,
      updatedAt: now,
      sizeBytes: byteLength(content || ''),
      imageCount: countImages(content || ''),
    };
  }

  async function createDocument({ title, content } = {}) {
    const doc = makeDocument({ title, content });
    await saveDocument(doc);
    return doc;
  }

  async function updateDocumentContent(id, { title, content }) {
    const doc = await getDocument(id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    doc.title = title;
    doc.content = content;
    doc.updatedAt = Date.now();
    doc.sizeBytes = byteLength(content || '');
    doc.imageCount = countImages(content || '');
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
    const documents = await getAllDocuments();
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

  return {
    isAvailable: () => available,
    runMigrationIfNeeded,
    getAllDocuments,
    getDocument,
    createDocument,
    updateDocumentContent,
    duplicateDocument,
    exportBackup,
    importBackup,
    deleteDocument,
    getHistory,
    createSnapshot,
    restoreSnapshot,
  };
})();

window.GijoStorage = GijoStorage;
