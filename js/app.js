document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const docTitleInput = document.getElementById('document-title');
  const charCount = document.getElementById('char-count');
  const imageCount = document.getElementById('image-count');
  const saveTime = document.getElementById('save-time');
  const splitPane = document.getElementById('split-pane');
  const dropOverlay = document.getElementById('drop-overlay');
  const toastContainer = document.getElementById('toast-container');
  const imageFileInput = document.getElementById('image-file-input');
  const appBody = document.getElementById('app-body');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const documentListEl = document.getElementById('document-list');
  const docSearchInput = document.getElementById('doc-search');
  const docSortSelect = document.getElementById('doc-sort');
  const btnSelectMode = document.getElementById('btn-select-mode');
  const docFilterChips = document.getElementById('doc-filter-chips');
  const docSelectBar = document.getElementById('doc-select-bar');
  const docSelectAll = document.getElementById('doc-select-all');
  const docSelectCount = document.getElementById('doc-select-count');
  const btnBulkExportMd = document.getElementById('btn-bulk-export-md');
  const btnBulkDelete = document.getElementById('btn-bulk-delete');
  const mobileTabWrite = document.getElementById('mobile-tab-write');
  const mobileTabPreview = document.getElementById('mobile-tab-preview');
  const statusCharCount = document.getElementById('status-char-count');
  const statusLineCount = document.getElementById('status-line-count');
  const statusImageCount = document.getElementById('status-image-count');
  const exportMenu = document.getElementById('export-menu');
  const historyModal = document.getElementById('history-modal');
  const historyList = document.getElementById('history-list');

  // Buttons
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyMd = document.getElementById('btn-copy-md');
  const btnToggleView = document.getElementById('btn-toggle-view');
  const btnViewWord = document.getElementById('btn-view-word');
  const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
  const btnNewDoc = document.getElementById('btn-new-doc');
  const btnBackup = document.getElementById('btn-backup');
  const btnRestore = document.getElementById('btn-restore');
  const btnImportMd = document.getElementById('btn-import-md');
  const mdFileInput = document.getElementById('md-file-input');
  const backupFileInput = document.getElementById('backup-file-input');
  const btnExportToggle = document.getElementById('btn-export-toggle');
  const btnHistoryClose = document.getElementById('btn-history-close');
  const btnOpenFile = document.getElementById('btn-open-file');
  const btnSaveFile = document.getElementById('btn-save-file');
  const fileTagEl = document.getElementById('file-tag');
  const fileTagLabel = document.getElementById('file-tag-label');
  const fileTagName = document.getElementById('file-tag-name');
  const fileDirtyDot = document.getElementById('file-dirty-dot');
  const btnUnlinkFile = document.getElementById('btn-unlink-file');
  const fileUnsupportedNotice = document.getElementById('file-unsupported-notice');
  const btnDismissUnsupported = document.getElementById('btn-dismiss-unsupported');

  // Workspace Folder Sidebar & New File Modal Elements
  const btnOpenFolder = document.getElementById('btn-open-folder');
  const btnReopenFolder = document.getElementById('btn-reopen-folder');
  const reopenFolderLabel = document.getElementById('reopen-folder-label');
  const folderUnsupportedHint = document.getElementById('folder-unsupported-hint');
  const sidebarTabs = document.getElementById('sidebar-tabs');
  const sidebarLibraryLabel = document.getElementById('sidebar-library-label');
  const tabLibrary = document.getElementById('tab-library');
  const tabFolder = document.getElementById('tab-folder');
  const sidebarLibraryPane = document.getElementById('sidebar-library-pane');
  const sidebarFolderPane = document.getElementById('sidebar-folder-pane');
  const folderEmptyState = document.getElementById('folder-empty-state');
  const btnFolderEmptyOpen = document.getElementById('btn-folder-empty-open');
  const btnFolderEmptyReopen = document.getElementById('btn-folder-empty-reopen');
  const folderEmptyReopenLabel = document.getElementById('folder-empty-reopen-label');
  const folderActiveView = document.getElementById('folder-active-view');
  const folderRootBtn = document.getElementById('folder-root-btn');
  const folderRootName = document.getElementById('folder-root-name');
  const folderFileCount = document.getElementById('folder-file-count');
  const btnFolderNewFile = document.getElementById('btn-folder-new-file');
  const btnFolderRefresh = document.getElementById('btn-folder-refresh');
  const btnFolderClose = document.getElementById('btn-folder-close');
  const folderSearchInput = document.getElementById('folder-search');
  const folderLimitNotice = document.getElementById('folder-limit-notice');
  const folderTreeEl = document.getElementById('folder-tree');
  const btnExportFolder = document.getElementById('btn-export-folder');
  const newFileModal = document.getElementById('new-file-modal');
  const newFileForm = document.getElementById('new-file-form');
  const newFileLocation = document.getElementById('new-file-location');
  const newFileNameInput = document.getElementById('new-file-name-input');
  const newFileError = document.getElementById('new-file-error');
  const btnNewFileClose = document.getElementById('btn-new-file-close');
  const btnNewFileCancel = document.getElementById('btn-new-file-cancel');

  // Initialize marked.js options
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // --- 1. State ---
  const STORAGE_KEY_THEME = 'gijo_md_studio_theme';
  const STORAGE_KEY_SIDEBAR_COLLAPSED = 'gijo_md_studio_sidebar_collapsed';
  const STORAGE_KEY_SORT = 'gijo_md_studio_sort';
  const SIDEBAR_AUTO_COLLAPSE_WIDTH = 860; // matches the CSS breakpoint in style.css
  const MOBILE_BREAKPOINT = 720;
  const LEGACY_KEY_CONTENT = 'gijo_md_studio_content';
  const LEGACY_KEY_TITLE = 'gijo_md_studio_title';
  const SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1000; // at most one history snapshot per 5 min of active editing
  const MAX_IMAGE_DIMENSION = 1600; // longest edge, px (the bug-report template text mentions 1200px — 1600 is a more modern default for today's high-DPI screenshots; either is a one-line change)
  const JPEG_QUALITY = 0.85;

  const RECOVERY_KEY = 'gijo_md_studio_recovery';
  const UNSUPPORTED_NOTICE_KEY = 'gijo_md_studio_fs_unsupported_seen';

  function loadSortOrder() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SORT);
      if (saved === 'updated' || saved === 'title' || saved === 'created') return saved;
    } catch (_) { /* ignore */ }
    return 'updated';
  }

  let currentDocId = null;
  let currentFileMeta = null;
  let storageAvailable = true;
  let autoSaveTimer = null;
  let saveInFlight = null; // promise of the save currently being written, if any
  let annotateHintShown = false;
  let lastSaveShortcutAt = 0;
  let docSortOrder = loadSortOrder();
  let docFilter = 'all';
  let selectMode = false;
  const selectedDocIds = new Set();
  let lastVisibleDocIds = [];
  let renamingDocId = null;
  let mobileView = 'write';
  let wasMobileLayout = window.innerWidth <= MOBILE_BREAKPOINT;
  let resolveInitReady;
  const initReady = new Promise((resolve) => { resolveInitReady = resolve; });
  const lastSnapshotAt = {}; // docId -> timestamp
  const savedContentByDocId = new Map(); // docKey -> last content read from / written to disk
  const dirtyLinkedDocIds = new Set(); // docKeys with unsaved changes vs linked disk file

  // Workspace folder state
  let activeSidebarTab = 'library';
  let activeFolderHandle = null;
  let savedFolderHandle = null;
  let activeFolderEntries = [];
  let activeFolderTruncated = false;
  let selectedFolderDirPath = '';
  const collapsedFolderDirs = new Set();
  const folderStateByPath = new Map(); // entry.path -> { docId, isActive, isDirty }
  const docFolderDirPathById = new Map(); // docKey -> dirPath inside activeFolderHandle
  const previewBlobUrls = new Map(); // normalizedRelPath -> object URL for current document
  let previewImageGen = 0;

  // --- 2. Live Preview & Formatting ---
  function updatePreview() {
    const text = editor.value;

    // Render Markdown to HTML (sanitized — this is the single call site every
    // export path reads from, so nothing downstream needs to sanitize again)
    if (window.marked) {
      const rawHtml = marked.parse(text);
      preview.innerHTML = window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    } else {
      preview.innerText = text;
    }

    const charLen = text.length;
    const lineLen = charLen === 0 ? 0 : text.split('\n').length;
    charCount.textContent = `${charLen.toLocaleString()} 자`;

    const imgMatches = text.match(/!\[.*?\]\(data:image\/.*?;base64,.*?\)|!\[.*?\]\(.*?\)/g);
    const count = imgMatches ? imgMatches.length : 0;
    imageCount.innerHTML = `<i class="fa-solid fa-image"></i> 이미지 ${count}개`;

    if (statusCharCount) statusCharCount.textContent = `${charLen.toLocaleString()}자`;
    if (statusLineCount) statusLineCount.textContent = `${lineLen.toLocaleString()}줄`;
    if (statusImageCount) statusImageCount.textContent = `그림 ${count}개`;

    resolvePreviewRelativeImages();
  }

  editor.addEventListener('input', () => {
    updatePreview();
    markCurrentContentChanged();
    scheduleAutoSave();
  });
  docTitleInput.addEventListener('input', () => { scheduleAutoSave(); });

  // --- 3. Document Persistence (IndexedDB library, with a single-document
  // localStorage fallback if IndexedDB is unavailable in this environment) ---

  function stampSaveTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    saveTime.textContent = `저장됨 (${timeStr})`;
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrentDocument, 500);
  }

  async function maybeCreateSnapshot(docId, title, content) {
    const last = lastSnapshotAt[docId] || 0;
    if (Date.now() - last < SNAPSHOT_MIN_INTERVAL_MS) return;
    lastSnapshotAt[docId] = Date.now();
    await GijoStorage.createSnapshot(docId, title, content);
  }

  async function saveCurrentDocument() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    // Everything this save touches is captured before the first await — the
    // user can switch documents while the (potentially multi-MB) write is in
    // flight, and a live read of currentDocId after an await would then file
    // this doc's snapshot under the OTHER doc's history.
    const docId = currentDocId;
    const title = docTitleInput.value;
    const content = editor.value;
    const fileDirty = (currentFileMeta && currentFileMeta.fileHandle) ? !!currentFileMeta.fileDirty : undefined;

    if (!storageAvailable) {
      try {
        localStorage.setItem(LEGACY_KEY_CONTENT, content);
        localStorage.setItem(LEGACY_KEY_TITLE, title);
        stampSaveTime();
      } catch (err) {
        console.error('Save failed', err);
        showToast('저장 중 오류가 발생했습니다. 저장 공간이 부족할 수 있습니다.', 'warning');
      }
      return;
    }

    if (!docId) {
      if (!title.trim() && !content.trim()) return;
      saveInFlight = (async () => {
        try {
          const created = await GijoStorage.createDocument({
            title: title.trim() || '제목 없는 문서',
            content,
          });
          currentDocId = created.id;
          stampSaveTime();
          renderDocumentList();
        } catch (err) {
          console.error('Save failed', err);
          showToast('저장 중 오류가 발생했습니다.', 'warning');
        } finally {
          saveInFlight = null;
        }
      })();
      await saveInFlight;
      return;
    }
    saveInFlight = (async () => {
      try {
        await GijoStorage.updateDocumentContent(docId, { title, content, fileDirty });
        await maybeCreateSnapshot(docId, title, content);
        stampSaveTime();
        renderDocumentList();
      } catch (err) {
        console.error('Save failed', err);
        showToast('저장 중 오류가 발생했습니다.', 'warning');
      } finally {
        saveInFlight = null;
      }
    })();
    await saveInFlight;
  }

  // The one path that could actually lose user work: a pending debounced
  // save (or one already mid-write) when the user switches documents.
  // Called before every switch.
  async function flushCurrentDocument() {
    if (autoSaveTimer) await saveCurrentDocument();
    else if (saveInFlight) await saveInFlight;
  }

  // An async IndexedDB save started during unload never completes — the
  // renderer is torn down before the write transaction exists. The only
  // thing that reliably survives is a synchronous localStorage write, so
  // stash unsaved content in a recovery record and re-apply it on next
  // launch (applyRecoveryIfAny).
  window.addEventListener('pagehide', () => revokePreviewBlobUrls());

  window.addEventListener('beforeunload', (e) => {
    if (storageAvailable && (autoSaveTimer || saveInFlight)) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      try {
        localStorage.setItem(RECOVERY_KEY, JSON.stringify({
          docId: currentDocId,
          title: docTitleInput.value,
          content: editor.value,
          ts: Date.now(),
        }));
      } catch (_) { /* quota exhausted — nothing more we can do at teardown */ }
    }
    if (dirtyLinkedDocIds.size > 0) {
      e.preventDefault();
      e.returnValue = '';
      // 사용자가 「취소」를 고르면 이 화면을 계속 쓴다. 미리보기 그림 주소를 여기서 지우면
      // 남은 화면의 그림이 깨진다. 실제로 떠날 때(pagehide) 지운다.
      return;
    }
    revokePreviewBlobUrls();
  });

  // Shrink the unload-loss window during normal use: flush as soon as the
  // window is hidden (minimize, tab switch, screen lock).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && autoSaveTimer) saveCurrentDocument();
  });

  async function applyRecoveryIfAny() {
    let rec = null;
    try { rec = JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null'); } catch (_) { /* corrupt record */ }
    localStorage.removeItem(RECOVERY_KEY);
    if (!rec || !rec.docId || typeof rec.content !== 'string') return;
    const doc = await GijoStorage.getDocument(rec.docId);
    if (!doc || rec.ts <= doc.updatedAt) return;
    await GijoStorage.updateDocumentContent(rec.docId, { title: rec.title, content: rec.content });
    showToast('종료 직전 저장되지 못한 내용을 복구했습니다.', 'success');
  }

  async function switchToDocument(docId, { skipFlush = false, closeDrawer = false } = {}) {
    if (!skipFlush) await flushCurrentDocument();
    const doc = await GijoStorage.getDocument(docId);
    if (!doc) return;

    if (currentDocId !== doc.id) {
      revokePreviewBlobUrls();
    }
    currentDocId = doc.id;
    currentFileMeta = extractFileMeta(doc);
    if (currentFileMeta && currentFileMeta.fileDirty) {
      dirtyLinkedDocIds.add(doc.id);
    } else if (currentFileMeta) {
      dirtyLinkedDocIds.delete(doc.id);
    }
    if (activeFolderHandle && currentFileMeta && currentFileMeta.fileHandle && !docFolderDirPathById.has(doc.id)) {
      const resolvedDir = await resolveDocDirPathInActiveFolder(currentFileMeta.fileHandle);
      if (resolvedDir !== null) {
        docFolderDirPathById.set(doc.id, resolvedDir);
      }
    }
    docTitleInput.value = doc.title;
    editor.value = doc.content;
    updatePreview();
    updateFileTagUI();
    renderDocumentList();
    if (activeFolderHandle) syncFolderEntryStates();
    if (closeDrawer && isMobileLayout()) setSidebarCollapsed(true);
  }

  async function createNewDocument(initial = {}) {
    if (!storageAvailable) {
      // Single-document fallback has no library to create into — but the
      // template buttons route here too, and templates worked fine in the
      // single-document v1 model: load into the one editor instead.
      if (initial.content) {
        if (!confirm('현재 작성 중인 내용이 템플릿으로 대체됩니다. 진행하시겠습니까?')) return;
        docTitleInput.value = initial.title || '제목 없는 문서';
        editor.value = initial.content;
        updatePreview();
        scheduleAutoSave();
        showToast(`'${docTitleInput.value}' 템플릿 적용 완료`, 'success');
      } else {
        showToast('이 브라우저에서는 다중 문서 기능을 사용할 수 없습니다.', 'warning');
      }
      return;
    }
    await flushCurrentDocument();
    const doc = await GijoStorage.createDocument({
      title: initial.title || '제목 없는 문서',
      content: initial.content || '',
    });
    await switchToDocument(doc.id, { skipFlush: true, closeDrawer: true });
    showToast('새 문서가 생성되었습니다.', 'success');
  }

  async function handleDuplicateDocument(docId) {
    const copy = await GijoStorage.duplicateDocument(docId);
    renderDocumentList();
    showToast(`'${copy.title}' 문서로 복제되었습니다.`, 'success');
  }

  async function handleDeleteDocument(docId) {
    const docs = await GijoStorage.getAllDocuments();
    if (docs.length <= 1) {
      showToast('마지막 남은 문서는 삭제할 수 없습니다.', 'warning');
      return;
    }
    if (!confirm('이 문서를 삭제하시겠습니까? 히스토리도 함께 삭제됩니다.')) return;

    const wasCurrent = docId === currentDocId;
    if (wasCurrent) {
      // A pending autosave firing mid-delete would find the doc gone and
      // surface a spurious "저장 중 오류" toast — settle it first.
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      if (saveInFlight) await saveInFlight;
    }
    await GijoStorage.deleteDocument(docId);
    dirtyLinkedDocIds.delete(docId);
    savedContentByDocId.delete(docId);
    docFolderDirPathById.delete(docId);
    if (wasCurrent) {
      const remaining = await GijoStorage.getAllDocuments();
      await switchToDocument(remaining[0].id, { skipFlush: true });
    } else {
      renderDocumentList();
      if (activeFolderHandle) syncFolderEntryStates();
    }
    showToast('문서가 삭제되었습니다.', 'info');
  }

  function formatRelativeTime(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(ts).toLocaleDateString('ko-KR');
  }

  function makeIconButton(iconClass, title, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'document-item-action';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }

  // Embedded base64 blobs would otherwise match arbitrary queries and swamp
  // any snippet, so they are collapsed before searching or excerpting.
  function stripDataUrls(text) {
    return text.replace(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/gi, '[이미지]');
  }

  // Builds highlighted text as DOM nodes — never innerHTML, since both the
  // query and the document content are user-controlled.
  function renderHighlighted(el, text, query) {
    el.textContent = '';
    if (!query) { el.textContent = text; return; }
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(needle, from);
      if (idx === -1) { el.appendChild(document.createTextNode(text.slice(from))); return; }
      if (idx > from) el.appendChild(document.createTextNode(text.slice(from, idx)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(idx, idx + needle.length);
      el.appendChild(mark);
      from = idx + needle.length;
    }
  }

  function buildSnippet(plainContent, query) {
    const needle = query.toLowerCase();
    const lines = plainContent.split(/\r?\n/);
    for (const rawLine of lines) {
      if (rawLine.toLowerCase().indexOf(needle) === -1) continue;
      const line = rawLine.replace(/\s+/g, ' ').trim();
      const hitIdx = line.toLowerCase().indexOf(needle);
      if (hitIdx === -1) continue;
      const radius = 20;
      const start = Math.max(0, hitIdx - radius);
      const end = Math.min(line.length, hitIdx + query.length + radius);
      const excerpt = line.slice(start, end).trim();
      return (start > 0 ? '…' : '') + excerpt + (end < line.length ? '…' : '');
    }
    const idx = plainContent.toLowerCase().indexOf(needle);
    if (idx === -1) return '';
    const start = Math.max(0, idx - 20);
    const end = Math.min(plainContent.length, idx + query.length + 20);
    const raw = plainContent.slice(start, end).replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + raw + (end < plainContent.length ? '…' : '');
  }

  function sortDocuments(docs, sortOrder) {
    return docs.slice().sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      if (sortOrder === 'title') {
        const cmp = (a.title || '').localeCompare(b.title || '', 'ko');
        return cmp !== 0 ? cmp : (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      if (sortOrder === 'created') {
        const createdDiff = (b.createdAt || 0) - (a.createdAt || 0);
        return createdDiff !== 0 ? createdDiff : (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function matchesFilter(doc, filter) {
    if (filter === 'linked') return !!doc.fileHandle;
    if (filter === 'library') return !doc.fileHandle;
    if (filter === 'pinned') return !!doc.pinned;
    return true;
  }

  function getDocByteSize(doc) {
    if (typeof doc.sizeBytes === 'number' && !Number.isNaN(doc.sizeBytes)) return doc.sizeBytes;
    return new TextEncoder().encode(doc.content || '').length;
  }

  function formatSizeKb(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return '0KB';
    const kb = n / 1024;
    if (kb < 10) return `${kb.toFixed(1)}KB`;
    return `${Math.round(kb).toLocaleString()}KB`;
  }

  function getEmptyLibraryMessage(totalCount, query, filter) {
    if (totalCount === 0) {
      return {
        icon: 'fa-folder-open',
        text: '문서함이 비어 있습니다. 「새 문서」를 눌러 시작해 보세요.',
      };
    }
    if (query) {
      return {
        icon: 'fa-magnifying-glass',
        text: '검색 결과가 없습니다. 다른 검색어나 필터를 시도해 보세요.',
      };
    }
    if (filter === 'linked') {
      return {
        icon: 'fa-link',
        text: '파일과 연결된 문서가 없습니다.',
      };
    }
    if (filter === 'library') {
      return {
        icon: 'fa-book',
        text: '문서함에만 저장된 문서가 없습니다.',
      };
    }
    if (filter === 'pinned') {
      return {
        icon: 'fa-thumbtack',
        text: '고정한 문서가 없습니다. 문서의 📌 단추를 눌러 위에 고정할 수 있습니다.',
      };
    }
    return {
      icon: 'fa-folder-open',
      text: '표시할 문서가 없습니다.',
    };
  }

  async function handleTogglePin(docId) {
    const doc = await GijoStorage.getDocument(docId);
    if (!doc) return;
    const nextPinned = !doc.pinned;
    await GijoStorage.setDocumentPinned(docId, nextPinned);
    await renderDocumentList();
    showToast(nextPinned ? '문서를 맨 위에 고정했습니다.' : '문서 고정을 풀었습니다.', 'info');
  }

  function startInlineRename(doc, infoEl, titleRowEl) {
    if (selectMode) return;
    if (renamingDocId && renamingDocId !== doc.id) {
      renamingDocId = null;
    }
    renamingDocId = doc.id;

    const wrap = document.createElement('div');
    wrap.className = 'document-rename-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'document-rename-input';
    input.value = doc.title || '';
    input.setAttribute('aria-label', '문서 제목 바꾸기');
    if (doc.fileHandle) {
      input.title = '제목만 바뀌며 디스크의 파일 이름은 바뀌지 않습니다.';
    }

    wrap.appendChild(input);

    if (doc.fileHandle) {
      const hint = document.createElement('div');
      hint.className = 'document-rename-hint';
      hint.setAttribute('role', 'note');
      hint.textContent = '제목만 바뀌며 디스크의 파일 이름은 바뀌지 않습니다.';
      wrap.appendChild(hint);
    }

    titleRowEl.hidden = true;
    infoEl.insertBefore(wrap, titleRowEl);

    let finished = false;
    async function finish(commit) {
      if (finished) return;
      finished = true;
      renamingDocId = null;
      const nextTitle = input.value.trim();
      if (!commit || !nextTitle || nextTitle === (doc.title || '')) {
        await renderDocumentList();
        return;
      }
      try {
        if (doc.id === currentDocId) {
          docTitleInput.value = nextTitle;
          await saveCurrentDocument();
        } else {
          await GijoStorage.renameDocument(doc.id, nextTitle);
          await renderDocumentList();
        }
        showToast(
          doc.fileHandle
            ? '문서 제목만 바꿨습니다. 디스크의 파일 이름은 그대로입니다.'
            : '문서 제목을 바꿨습니다.',
          'success'
        );
      } catch (err) {
        console.error('Rename failed', err);
        showToast('제목 바꾸기 중 오류가 발생했습니다.', 'warning');
        await renderDocumentList();
      }
    }

    wrap.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => {
      finish(true);
    });

    input.focus();
    input.select();
  }

  function updateSelectBarUI() {
    if (!docSelectBar) return;
    docSelectBar.hidden = !selectMode;
    if (btnSelectMode) {
      btnSelectMode.classList.toggle('active', selectMode);
      btnSelectMode.setAttribute('aria-pressed', String(selectMode));
      btnSelectMode.innerHTML = selectMode
        ? '<i class="fa-solid fa-xmark"></i> 취소'
        : '<i class="fa-regular fa-square-check"></i> 고르기';
    }
    const count = selectedDocIds.size;
    if (docSelectCount) docSelectCount.textContent = `${count}개 선택`;
    if (btnBulkExportMd) btnBulkExportMd.disabled = count === 0;
    if (btnBulkDelete) btnBulkDelete.disabled = count === 0;
    if (docSelectAll) {
      const visibleCount = lastVisibleDocIds.length;
      const checkedVisible = lastVisibleDocIds.filter((id) => selectedDocIds.has(id)).length;
      docSelectAll.disabled = visibleCount === 0;
      docSelectAll.checked = visibleCount > 0 && checkedVisible === visibleCount;
      docSelectAll.indeterminate = checkedVisible > 0 && checkedVisible < visibleCount;
    }
  }

  function setSelectMode(enabled) {
    selectMode = !!enabled;
    selectedDocIds.clear();
    renamingDocId = null;
    updateSelectBarUI();
    renderDocumentList();
  }

  async function handleBulkExportMd() {
    if (!requireLibrary() || selectedDocIds.size === 0) return;
    await flushCurrentDocument();

    const all = sortDocuments(await GijoStorage.getAllDocuments(), docSortOrder);
    const targets = all.filter((doc) => selectedDocIds.has(doc.id));
    if (!targets.length) return;

    if (window.GijoFiles && GijoFiles.isFolderSupported()) {
      let dirHandle;
      try {
        dirHandle = await GijoFiles.openFolder();
      } catch (err) {
        console.error('Bulk export folder picker failed', err);
        showToast('폴더를 고르는 중 오류가 발생했습니다.', 'warning');
        return;
      }
      if (!dirHandle) return;

      const granted = await GijoFiles.ensurePermission(dirHandle, 'readwrite');
      if (!granted) {
        showToast('폴더 쓰기 권한이 허용되지 않아 내보내지 못했습니다.', 'warning');
        return;
      }

      const usedLowerNames = new Set();
      let written = 0;
      let failed = 0;
      for (const doc of targets) {
        try {
          const fileName = await pickUniqueExportFileName(dirHandle, usedLowerNames, doc.title);
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          await GijoFiles.writeHandle(fileHandle, doc.content || '', { lineEnding: 'LF', hadBom: false });
          written++;
        } catch (err) {
          console.error('Bulk export doc to folder failed', doc.title, err);
          failed++;
        }
      }

      if (activeFolderHandle && await GijoFiles.sameEntry(activeFolderHandle, dirHandle)) {
        await refreshActiveFolderSilently();
      }

      if (written > 0 && failed === 0) {
        showToast(`선택한 문서 ${written}개를 '${dirHandle.name}' 폴더로 내보냈습니다.`, 'success');
      } else if (written > 0) {
        showToast(`문서 ${written}개를 내보냈습니다 (${failed}개 실패).`, 'warning');
      } else {
        showToast('문서를 폴더로 내보내지 못했습니다.', 'warning');
      }
      setSelectMode(false);
      return;
    }

    const usedLowerNames = new Set();
    for (let i = 0; i < targets.length; i++) {
      const doc = targets[i];
      const base = sanitizeExportBaseName(doc.title);
      let idx = 1;
      let fileName = `${base}.md`;
      while (usedLowerNames.has(fileName.toLowerCase())) {
        idx++;
        fileName = `${base} (${idx}).md`;
      }
      usedLowerNames.add(fileName.toLowerCase());
      GijoExport.downloadBlob(
        new Blob([doc.content || ''], { type: 'text/markdown;charset=utf-8;' }),
        fileName
      );
      if (i + 1 < targets.length) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }
    showToast(`선택한 문서 ${targets.length}개를 .md 파일로 내려받았습니다.`, 'success');
    setSelectMode(false);
  }

  async function handleBulkDelete() {
    if (!requireLibrary() || selectedDocIds.size === 0) return;
    const ids = Array.from(selectedDocIds);
    if (!confirm(`${ids.length}개를 지울까요? 디스크의 파일은 지워지지 않습니다`)) return;

    const deletesCurrent = currentDocId !== null && selectedDocIds.has(currentDocId);
    if (deletesCurrent) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      if (saveInFlight) await saveInFlight;
    }

    for (const id of ids) {
      await GijoStorage.deleteDocument(id);
      dirtyLinkedDocIds.delete(id);
      savedContentByDocId.delete(id);
      docFolderDirPathById.delete(id);
    }

    selectMode = false;
    selectedDocIds.clear();
    updateSelectBarUI();

    if (deletesCurrent) {
      const remaining = sortDocuments(await GijoStorage.getAllDocuments(), docSortOrder);
      if (remaining.length > 0) {
        await switchToDocument(remaining[0].id, { skipFlush: true });
      } else {
        revokePreviewBlobUrls();
        currentDocId = null;
        currentFileMeta = null;
        docTitleInput.value = '';
        editor.value = '';
        updatePreview();
        updateFileTagUI();
        await renderDocumentList();
        if (activeFolderHandle) await syncFolderEntryStates();
      }
    } else {
      await renderDocumentList();
      if (activeFolderHandle) await syncFolderEntryStates();
    }

    showToast(`${ids.length}개 문서를 문서함에서 지웠습니다. 디스크의 파일은 지워지지 않았습니다.`, 'info');
  }

  async function renderDocumentList() {
    if (!storageAvailable) return;
    if (renamingDocId) return;

    const query = (docSearchInput.value || '').trim();
    const allRaw = await GijoStorage.getAllDocuments();
    const all = sortDocuments(allRaw, docSortOrder);

    const existingIds = new Set(all.map((d) => d.id));
    for (const id of Array.from(selectedDocIds)) {
      if (!existingIds.has(id)) selectedDocIds.delete(id);
    }

    const rows = [];
    for (const doc of all) {
      if (!matchesFilter(doc, docFilter)) continue;
      if (!query) { rows.push({ doc, snippet: '' }); continue; }
      const q = query.toLowerCase();
      const titleHit = (doc.title || '').toLowerCase().includes(q);
      const plain = stripDataUrls(doc.content || '');
      const bodyHit = plain.toLowerCase().includes(q);
      if (!titleHit && !bodyHit) continue;
      rows.push({ doc, snippet: bodyHit ? buildSnippet(plain, query) : '' });
    }

    lastVisibleDocIds = rows.map(({ doc }) => doc.id);
    updateSelectBarUI();

    documentListEl.innerHTML = '';
    if (!rows.length) {
      const emptyInfo = getEmptyLibraryMessage(all.length, query, docFilter);
      const empty = document.createElement('div');
      empty.className = 'document-list-empty';
      const icon = document.createElement('i');
      icon.className = `fa-solid ${emptyInfo.icon}`;
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.textContent = emptyInfo.text;
      empty.appendChild(icon);
      empty.appendChild(text);
      documentListEl.appendChild(empty);
      return;
    }

    rows.forEach(({ doc, snippet }) => {
      const item = document.createElement('div');
      item.className = 'document-item'
        + (doc.id === currentDocId ? ' active' : '')
        + (doc.pinned ? ' pinned' : '')
        + (selectMode ? ' selecting' : '');
      item.dataset.docId = doc.id;

      const mainRow = document.createElement('div');
      mainRow.className = 'document-item-main';

      if (selectMode) {
        const checkWrap = document.createElement('label');
        checkWrap.className = 'document-item-check-wrap';
        checkWrap.addEventListener('click', (e) => e.stopPropagation());
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'document-item-checkbox';
        cb.checked = selectedDocIds.has(doc.id);
        cb.setAttribute('aria-label', `${doc.title || '제목 없는 문서'} 선택`);
        cb.addEventListener('change', () => {
          if (cb.checked) selectedDocIds.add(doc.id);
          else selectedDocIds.delete(doc.id);
          updateSelectBarUI();
        });
        checkWrap.appendChild(cb);
        mainRow.appendChild(checkWrap);
      }

      const info = document.createElement('div');
      info.className = 'document-item-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'document-item-title-row';

      const titleEl = document.createElement('div');
      titleEl.className = 'document-item-title';
      titleEl.title = doc.fileHandle
        ? `${doc.title || '제목 없는 문서'} (두 번 눌러 이름 바꾸기 — 제목만 바뀌고 디스크 파일 이름은 유지)`
        : `${doc.title || '제목 없는 문서'} (두 번 눌러 이름 바꾸기)`;
      renderHighlighted(titleEl, doc.title || '제목 없는 문서', query);
      titleEl.addEventListener('dblclick', (e) => {
        if (selectMode) return;
        e.stopPropagation();
        startInlineRename(doc, info, titleRow);
      });
      titleRow.appendChild(titleEl);

      if (doc.fileHandle) {
        const linkBadge = document.createElement('span');
        linkBadge.className = 'document-item-link';
        linkBadge.title = `연결된 파일: ${doc.fileName || doc.fileHandle.name || ''}`;
        linkBadge.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
        titleRow.appendChild(linkBadge);
        if (doc.fileDirty || dirtyLinkedDocIds.has(doc.id)) {
          const dirtyBadge = document.createElement('span');
          dirtyBadge.className = 'document-item-dirty';
          dirtyBadge.title = '파일에 저장되지 않은 변경 있음';
          dirtyBadge.textContent = '●';
          titleRow.appendChild(dirtyBadge);
        }
      }

      const sizeStr = formatSizeKb(getDocByteSize(doc));
      const charLen = (doc.content || '').length;
      const imgCnt = typeof doc.imageCount === 'number' ? doc.imageCount : 0;
      const metaText = `${sizeStr} · 그림 ${imgCnt}개 · ${charLen.toLocaleString()}자 · ${formatRelativeTime(doc.updatedAt)}`;
      const metaEl = document.createElement('div');
      metaEl.className = 'document-item-meta';
      metaEl.textContent = metaText;
      metaEl.title = metaText;

      info.appendChild(titleRow);
      if (snippet) {
        const snippetEl = document.createElement('div');
        snippetEl.className = 'document-item-snippet';
        renderHighlighted(snippetEl, snippet, query);
        info.appendChild(snippetEl);
      }
      info.appendChild(metaEl);

      mainRow.appendChild(info);

      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'document-pin-btn' + (doc.pinned ? ' pinned' : '');
      pinBtn.title = doc.pinned ? '고정 풀기' : '맨 위에 고정';
      pinBtn.setAttribute('aria-label', doc.pinned ? '고정 풀기' : '맨 위에 고정');
      pinBtn.setAttribute('aria-pressed', String(!!doc.pinned));
      pinBtn.textContent = '📌';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTogglePin(doc.id);
      });
      mainRow.appendChild(pinBtn);

      const actions = document.createElement('div');
      actions.className = 'document-item-actions';
      const renameTitle = doc.fileHandle
        ? '이름 바꾸기 (제목만 바뀌며 디스크의 파일 이름은 바뀌지 않습니다)'
        : '이름 바꾸기';
      actions.appendChild(makeIconButton('fa-pen', renameTitle, () => startInlineRename(doc, info, titleRow)));
      if (doc.fileHandle) {
        actions.appendChild(makeIconButton('fa-link-slash', '파일 연결 끊기', () => handleUnlinkFile(doc.id)));
      }
      actions.appendChild(makeIconButton('fa-clock-rotate-left', '히스토리', () => openHistoryModal(doc.id)));
      actions.appendChild(makeIconButton('fa-copy', '복제', () => handleDuplicateDocument(doc.id)));
      actions.appendChild(makeIconButton('fa-trash', '삭제', () => handleDeleteDocument(doc.id)));

      item.appendChild(mainRow);
      item.appendChild(actions);
      item.addEventListener('click', (e) => {
        if (e.target.closest('.document-item-action') || e.target.closest('.document-pin-btn') || e.target.closest('.document-rename-wrap')) return;
        if (selectMode) {
          if (selectedDocIds.has(doc.id)) selectedDocIds.delete(doc.id);
          else selectedDocIds.add(doc.id);
          const cb = item.querySelector('.document-item-checkbox');
          if (cb) cb.checked = selectedDocIds.has(doc.id);
          updateSelectBarUI();
          return;
        }
        if (doc.id !== currentDocId) {
          switchToDocument(doc.id, { closeDrawer: true });
        } else if (isMobileLayout()) {
          setSidebarCollapsed(true);
        }
      });

      documentListEl.appendChild(item);
    });
  }

  // --- 4. Version History ---
  async function openHistoryModal(docId) {
    const entries = await GijoStorage.getHistory(docId);
    historyList.innerHTML = '';

    if (entries.length === 0) {
      historyList.innerHTML = '<div class="history-empty">아직 저장된 버전이 없습니다. 편집을 계속하면 자동으로 스냅샷이 쌓입니다.</div>';
    } else {
      entries.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const meta = document.createElement('div');
        meta.className = 'history-item-meta';
        meta.textContent = `${new Date(entry.savedAt).toLocaleString('ko-KR')} · ${entry.title}`;
        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'btn btn-secondary';
        restoreBtn.textContent = '복원';
        restoreBtn.addEventListener('click', () => handleRestoreSnapshot(entry.id));
        item.appendChild(meta);
        item.appendChild(restoreBtn);
        historyList.appendChild(item);
      });
    }
    historyModal.classList.add('open');
  }

  async function handleRestoreSnapshot(historyId) {
    if (!confirm('이 버전으로 복원하시겠습니까? 현재 내용은 덮어써집니다.')) return;
    const doc = await GijoStorage.restoreSnapshot(historyId);
    historyModal.classList.remove('open');
    if (doc.fileHandle) {
      const dirty = !savedContentByDocId.has(doc.id) || doc.content !== savedContentByDocId.get(doc.id);
      await GijoStorage.updateDocumentContent(doc.id, { title: doc.title, content: doc.content, fileDirty: dirty });
      if (dirty) dirtyLinkedDocIds.add(doc.id);
      else dirtyLinkedDocIds.delete(doc.id);
      if (doc.id === currentDocId && currentFileMeta) {
        currentFileMeta.fileDirty = dirty;
      }
    }
    if (doc.id === currentDocId) {
      docTitleInput.value = doc.title;
      editor.value = doc.content;
      updatePreview();
      updateFileTagUI();
    }
    renderDocumentList();
    if (activeFolderHandle) syncFolderEntryStates();
    showToast('이전 버전으로 복원되었습니다.', 'success');
  }

  btnHistoryClose.addEventListener('click', () => historyModal.classList.remove('open'));
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) historyModal.classList.remove('open');
  });

  // --- 5. Clipboard & Drag-and-Drop Image Handling (with compression) ---
  function insertAtCursor(textarea, textToInsert) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    textarea.value = before + textToInsert + after;
    textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    textarea.focus();
    updatePreview();
    markCurrentContentChanged();
    scheduleAutoSave();
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  // Full-canvas alpha scan (not just a corner sample) — cheap at these
  // dimensions (max 1600px) and gets transparency detection right, which
  // matters: flattening a transparent diagram/icon to a solid background
  // would be a visible regression, especially in dark theme.
  function canvasHasAlpha(ctx, w, h) {
    const { data } = ctx.getImageData(0, 0, w, h);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  }

  async function compressImage(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputType = canvasHasAlpha(ctx, targetW, targetH) ? 'image/png' : 'image/jpeg';
    const outputBlob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, JPEG_QUALITY));

    // Keep whichever is actually smaller rather than blindly trusting the re-encode.
    return (outputBlob && outputBlob.size < file.size) ? outputBlob : file;
  }

  async function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 붙여넣을 수 있습니다.', 'warning');
      return;
    }

    showToast('이미지 변환 중...', 'info');

    // Pin the insertion to the document that was open when the image came
    // in — compression takes long enough (seconds, for multi-file drops)
    // that the user can switch documents mid-batch, and inserting into the
    // now-visible textarea would put the image in the wrong document.
    const targetDocId = currentDocId;

    try {
      const finalBlob = await compressImage(file);
      const dataUrl = await blobToDataUrl(finalBlob);
      const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const imgMarkdown = `\n\n![캡처이미지_${timeStamp}](${dataUrl})\n\n`;

      if (storageAvailable && targetDocId && targetDocId !== currentDocId) {
        const doc = await GijoStorage.getDocument(targetDocId);
        if (doc) {
          const nextContent = doc.content + imgMarkdown;
          const fileDirty = doc.fileHandle ? true : undefined;
          await GijoStorage.updateDocumentContent(targetDocId, { title: doc.title, content: nextContent, fileDirty });
          if (doc.fileHandle) dirtyLinkedDocIds.add(targetDocId);
          renderDocumentList();
          showToast('문서가 전환되어 이미지를 원래 문서의 끝에 추가했습니다.', 'info');
        }
        return;
      }

      insertAtCursor(editor, imgMarkdown);

      const savedPct = file.size > 0 ? Math.round((1 - finalBlob.size / file.size) * 100) : 0;
      if (finalBlob !== file && savedPct > 0) {
        showToast(`이미지가 ${formatBytes(file.size)} → ${formatBytes(finalBlob.size)}로 압축되어 삽입되었습니다 (${savedPct}%↓)`, 'success');
      } else {
        showToast('이미지가 마크다운에 성공적으로 붙여넣어졌습니다!', 'success');
      }

      // Annotation is only discoverable by clicking the preview image, so
      // point it out once per session the first time an image goes in.
      if (!annotateHintShown && window.GijoAnnotate) {
        annotateHintShown = true;
        setTimeout(() => showToast('미리보기의 이미지를 클릭하면 화살표·모자이크 등 주석을 추가할 수 있습니다.', 'info'), 1500);
      }
    } catch (err) {
      console.error('Image processing failed', err);
      showToast('이미지 처리 중 오류가 발생했습니다.', 'warning');
    }
  }

  // --- 5b. Image Annotation (click an embedded image in the preview) ---

  // Replaces the n-th occurrence so that the same screenshot pasted twice
  // annotates the copy that was actually clicked.
  function replaceNthOccurrence(text, search, replacement, n) {
    let idx = -1;
    for (let i = 0; i <= n; i++) {
      idx = text.indexOf(search, idx + 1);
      if (idx === -1) return null;
    }
    return text.slice(0, idx) + replacement + text.slice(idx + search.length);
  }

  preview.addEventListener('click', async (e) => {
    const img = e.target.closest('img');
    if (!img || !window.GijoAnnotate) return;
    const src = img.getAttribute('src') || '';
    // Remote images would taint the canvas and make toDataURL throw.
    if (!src.startsWith('data:')) return;

    const sameSrc = Array.from(preview.querySelectorAll('img'))
      .filter((el) => el.getAttribute('src') === src);
    const occurrence = Math.max(0, sameSrc.indexOf(img));

    // Pin to the document that was open when the editor was launched — the
    // user can switch documents while annotating.
    const targetDocId = currentDocId;
    const edited = await GijoAnnotate.open(src);
    if (!edited) return;

    if (storageAvailable && targetDocId && targetDocId !== currentDocId) {
      const doc = await GijoStorage.getDocument(targetDocId);
      if (doc) {
        const updated = replaceNthOccurrence(doc.content, src, edited, occurrence);
        if (updated) {
          const fileDirty = doc.fileHandle ? true : undefined;
          await GijoStorage.updateDocumentContent(targetDocId, { title: doc.title, content: updated, fileDirty });
          if (doc.fileHandle) dirtyLinkedDocIds.add(targetDocId);
          renderDocumentList();
          showToast('문서가 전환되어 원래 문서의 이미지에 주석을 적용했습니다.', 'info');
          return;
        }
      }
      showToast('주석을 적용할 이미지를 찾지 못했습니다.', 'warning');
      return;
    }

    const updated = replaceNthOccurrence(editor.value, src, edited, occurrence);
    if (!updated) {
      showToast('주석을 적용할 이미지를 찾지 못했습니다.', 'warning');
      return;
    }
    editor.value = updated;
    updatePreview();
    markCurrentContentChanged();
    scheduleAutoSave();
    showToast('이미지에 주석이 적용되었습니다.', 'success');
  });

  // Processed sequentially (not fired off in parallel) — concurrent
  // FileReader/canvas callbacks each call insertAtCursor, which reads the
  // textarea's CURRENT selection at callback time; interleaved completions
  // from multiple in-flight files could otherwise clobber each other's
  // insertion point.
  async function processImageFiles(files) {
    for (const file of files) {
      await processImageFile(file);
    }
  }

  // Clipboard Paste Intercept (Ctrl + V)
  editor.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;

    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        processImageFile(file);
        e.preventDefault(); // Prevent pasting raw binary or default behavior
        break;
      }
    }
  });

  // Drag and Drop File Handling
  //
  // A drop that lands OUTSIDE the overlay must never reach the browser
  // default, which is "navigate this window to the dropped file" — in the
  // desktop build that replaces the whole app with the raw image until
  // restart. (The overlay's own drop handler stopPropagation()s, so this
  // only catches strays.)
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
  });

  // Only light up the overlay for actual file drags — activating it for
  // text drags would swallow native drag-to-move of selected editor text.
  function dragHasFiles(e) {
    return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      if (dragHasFiles(e)) dropOverlay.classList.add('active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropOverlay.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (eventName === 'drop' || e.target === dropOverlay) {
        dropOverlay.classList.remove('active');
      }
    }, false);
  });

  dropOverlay.addEventListener('drop', (e) => {
    const items = Array.from((e.dataTransfer && e.dataTransfer.items) || []);
    const rawFiles = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (!items.length && !rawFiles.length) return;

    // DataTransferItem.getAsFileSystemHandle() MUST be called synchronously
    // before any await; browsers clear dataTransfer.items once drop returns.
    const canLink = window.GijoFiles && GijoFiles.isSupported();
    const entries = items
      .filter((item) => item.kind === 'file')
      .map((item) => ({
        file: item.getAsFile(),
        handlePromise: (canLink && typeof item.getAsFileSystemHandle === 'function')
          ? item.getAsFileSystemHandle().catch(() => null)
          : null,
      }));

    (async () => {
      const mdHandles = [];
      const fallbackMdFiles = [];
      const restFiles = [];

      if (entries.length) {
        const resolved = await Promise.all(entries.map(async (entry) => ({
          file: entry.file,
          handle: entry.handlePromise ? await entry.handlePromise : null,
        })));
        for (const { file, handle } of resolved) {
          if (handle && handle.kind === 'file' && isMarkdownFileName(handle.name)) {
            mdHandles.push(handle);
          } else if (file && isMarkdownFile(file)) {
            fallbackMdFiles.push(file);
          } else if (file) {
            restFiles.push(file);
          }
        }
      } else {
        for (const f of rawFiles) {
          if (isMarkdownFile(f)) fallbackMdFiles.push(f);
          else restFiles.push(f);
        }
      }

      if (mdHandles.length) await openLinkedHandles(mdHandles);
      if (fallbackMdFiles.length) await importMarkdownFiles(fallbackMdFiles);
      if (restFiles.length) await processImageFiles(restFiles);
    })();
  });

  // Image File Picker Input
  imageFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFiles(Array.from(files));
    }
    imageFileInput.value = ''; // Reset input
  });

  // --- 6. Toolbar Actions ---
  document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      applyToolbarFormat(cmd);
    });
  });

  function applyToolbarFormat(cmd) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);

    let replacement = '';
    switch (cmd) {
      case 'h1': replacement = `# ${selected || '제목 1'}`; break;
      case 'h2': replacement = `## ${selected || '제목 2'}`; break;
      case 'h3': replacement = `### ${selected || '제목 3'}`; break;
      case 'bold': replacement = `**${selected || '굵은 텍스트'}**`; break;
      case 'italic': replacement = `*${selected || '기울인 텍스트'}*`; break;
      case 'strikethrough': replacement = `~~${selected || '취소선 텍스트'}~~`; break;
      case 'ul': replacement = `- ${selected || '목록 항목'}`; break;
      case 'ol': replacement = `1. ${selected || '번호 항목'}`; break;
      case 'task': replacement = `- [ ] ${selected || '할 일 항목'}`; break;
      case 'code': replacement = `\`\`\`javascript\n${selected || '// 코드를 입력하세요'}\n\`\`\``; break;
      case 'table':
        replacement = `\n| 항목 | 내용 | 비고 |\n| --- | --- | --- |\n| 예시 1 | 상세 내용 | 데이터 |\n| 예시 2 | 상세 내용 | 데이터 |\n`;
        break;
    }
    insertAtCursor(editor, replacement);
  }

  // Keyboard shortcuts the toolbar tooltips advertise. Ctrl+B/I work in
  // every build; browsers reserve Ctrl+1..3 for tab switching, so those
  // only take effect in the desktop (Electron) build.
  editor.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const cmd = { b: 'bold', i: 'italic', 1: 'h1', 2: 'h2', 3: 'h3' }[e.key.toLowerCase()];
    if (!cmd) return;
    e.preventDefault();
    applyToolbarFormat(cmd);
  });

  // --- 7. Template Buttons (create a new document, matching the library model) ---
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-template');
      const tpl = DOC_TEMPLATES[key];
      if (!tpl) return;
      createNewDocument({ title: tpl.title, content: tpl.content });
    });
  });

  // --- 8. Export ---
  async function handleExport(format) {
    const content = editor.value;
    const title = docTitleInput.value.trim() || 'markdown_doc';
    if (!content.trim()) {
      showToast('내보낼 내용이 없습니다.', 'warning');
      return;
    }
    try {
      let result;
      switch (format) {
        case 'md': result = GijoExport.exportMarkdown(content, title); break;
        case 'html': result = await GijoExport.exportHtml(title); break;
        case 'pdf': result = await GijoExport.exportPdf(title); break;
        case 'docx': result = await GijoExport.exportDocx(title); break;
        default: return;
      }
      if (result && result.ok === false) {
        showToast(result.reason === 'lib-missing'
          ? 'Word 내보내기 기능을 불러오지 못했습니다.'
          : '내보낼 내용이 없습니다.', 'warning');
        return;
      }
      if (result && result.viaPrint) {
        showToast('인쇄 대화상자에서 "PDF로 저장"을 선택하세요.', 'info');
      } else {
        showToast(`${format.toUpperCase()} 파일로 내보내기 완료!`, 'success');
      }
    } catch (err) {
      console.error(`Export (${format}) failed`, err);
      showToast('내보내기 중 오류가 발생했습니다.', 'warning');
    }
  }

  btnExportToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = exportMenu.classList.toggle('open');
    btnExportToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', () => {
    exportMenu.classList.remove('open');
    btnExportToggle.setAttribute('aria-expanded', 'false');
  });

  exportMenu.querySelectorAll('.dropdown-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.remove('open');
      btnExportToggle.setAttribute('aria-expanded', 'false');
      if (btn.dataset.action === 'save-as') {
        handleSaveAs();
      } else if (btn.dataset.export) {
        handleExport(btn.dataset.export);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      exportMenu.classList.remove('open');
      btnExportToggle.setAttribute('aria-expanded', 'false');
      historyModal.classList.remove('open');
      closeNewFileModal();
      if (window.innerWidth <= SIDEBAR_AUTO_COLLAPSE_WIDTH && !appBody.classList.contains('sidebar-collapsed')) {
        setSidebarCollapsed(true);
      }
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const key = e.key.toLowerCase();
    if (key === 'o') {
      e.preventDefault();
      handleOpenFile();
    } else if (key === 's') {
      e.preventDefault();
      triggerSaveShortcut();
    }
  });

  btnCopyMd.addEventListener('click', () => {
    const content = editor.value;
    if (!content.trim()) {
      showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      showToast('마크다운 내용이 클립보드에 복사되었습니다!', 'success');
    }).catch(err => {
      showToast('클립보드 복사 실패: ' + err, 'warning');
    });
  });

  btnClear.addEventListener('click', () => {
    if (confirm('현재 문서의 모든 내용을 초기화하시겠습니까?')) {
      editor.value = '';
      docTitleInput.value = '제목 없는 문서';
      updatePreview();
      markCurrentContentChanged();
      scheduleAutoSave();
      showToast('에디터가 초기화되었습니다.', 'info');
    }
  });

  // --- 9. Sidebar & Mobile Layout ---
  function isMobileLayout() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function setSidebarCollapsed(collapsed) {
    appBody.classList.toggle('sidebar-collapsed', collapsed);
    btnSidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  }

  function loadSidebarState() {
    if (isMobileLayout()) {
      setSidebarCollapsed(true);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED);
    const collapsed = saved !== null ? saved === '1' : window.innerWidth <= SIDEBAR_AUTO_COLLAPSE_WIDTH;
    setSidebarCollapsed(collapsed);
  }

  function setMobileView(view) {
    mobileView = view === 'preview' ? 'preview' : 'write';
    const isPreview = mobileView === 'preview';
    splitPane.classList.toggle('mobile-view-write', !isPreview);
    splitPane.classList.toggle('mobile-view-preview', isPreview);
    if (mobileTabWrite) {
      mobileTabWrite.classList.toggle('active', !isPreview);
      mobileTabWrite.setAttribute('aria-selected', String(!isPreview));
    }
    if (mobileTabPreview) {
      mobileTabPreview.classList.toggle('active', isPreview);
      mobileTabPreview.setAttribute('aria-selected', String(isPreview));
    }
  }

  btnSidebarToggle.addEventListener('click', () => {
    const collapsed = !appBody.classList.contains('sidebar-collapsed');
    setSidebarCollapsed(collapsed);
    if (!isMobileLayout()) {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, collapsed ? '1' : '0');
    }
  });

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      setSidebarCollapsed(true);
    });
  }

  if (mobileTabWrite) {
    mobileTabWrite.addEventListener('click', () => setMobileView('write'));
  }
  if (mobileTabPreview) {
    mobileTabPreview.addEventListener('click', () => setMobileView('preview'));
  }

  window.addEventListener('resize', () => {
    const nowMobile = isMobileLayout();
    if (nowMobile !== wasMobileLayout) {
      wasMobileLayout = nowMobile;
      loadSidebarState();
    }
  });

  btnNewDoc.addEventListener('click', () => createNewDocument());

  if (docSortSelect) {
    docSortSelect.value = docSortOrder;
    docSortSelect.addEventListener('change', () => {
      const next = docSortSelect.value;
      docSortOrder = (next === 'title' || next === 'created') ? next : 'updated';
      try { localStorage.setItem(STORAGE_KEY_SORT, docSortOrder); } catch (_) { /* ignore */ }
      renderDocumentList();
    });
  }

  if (docFilterChips) {
    docFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      const nextFilter = chip.dataset.filter || 'all';
      if (nextFilter === docFilter) return;
      docFilter = nextFilter;
      docFilterChips.querySelectorAll('.filter-chip').forEach((btn) => {
        const active = btn.dataset.filter === docFilter;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      renderDocumentList();
    });
  }

  if (btnSelectMode) {
    btnSelectMode.addEventListener('click', () => setSelectMode(!selectMode));
  }

  if (docSelectAll) {
    docSelectAll.addEventListener('change', () => {
      if (docSelectAll.checked) {
        lastVisibleDocIds.forEach((id) => selectedDocIds.add(id));
      } else {
        lastVisibleDocIds.forEach((id) => selectedDocIds.delete(id));
      }
      renderDocumentList();
    });
  }

  if (btnBulkExportMd) {
    btnBulkExportMd.addEventListener('click', () => handleBulkExportMd());
  }

  if (btnBulkDelete) {
    btnBulkDelete.addEventListener('click', () => handleBulkDelete());
  }

  // Debounced so typing doesn't re-scan every document's content per keystroke.
  let searchTimer = null;
  docSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDocumentList, 180);
  });
  docSearchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !docSearchInput.value) return;
    e.stopPropagation(); // don't also close dropdowns/modals
    docSearchInput.value = '';
    renderDocumentList();
  });

  // --- 9b. Backup / Restore / Markdown Import ---
  function requireLibrary() {
    if (storageAvailable) return true;
    showToast('이 브라우저에서는 문서함 기능을 사용할 수 없습니다.', 'warning');
    return false;
  }

  btnBackup.addEventListener('click', async () => {
    if (!requireLibrary()) return;
    try {
      await flushCurrentDocument();
      const payload = await GijoStorage.exportBackup();
      if (payload.documentCount === 0) {
        showToast('백업할 문서가 없습니다.', 'warning');
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      GijoExport.downloadBlob(
        new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8;' }),
        `gijo-md-studio-backup-${stamp}.json`
      );
      showToast(`문서 ${payload.documentCount}개를 백업했습니다.`, 'success');
    } catch (err) {
      console.error('Backup failed', err);
      showToast('백업 중 오류가 발생했습니다.', 'warning');
    }
  });

  btnRestore.addEventListener('click', () => {
    if (!requireLibrary()) return;
    backupFileInput.click();
  });

  backupFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    backupFileInput.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const count = Array.isArray(payload.documents) ? payload.documents.length : 0;
      if (!confirm(`백업 파일의 문서 ${count}개를 문서함에 추가합니다.\n기존 문서는 삭제되지 않으며, 이미 있는 문서는 건너뜁니다.\n\n계속하시겠습니까?`)) return;

      const { imported, skipped } = await GijoStorage.importBackup(payload);
      await renderDocumentList();
      showToast(`복원 완료: ${imported}개 추가${skipped ? `, ${skipped}개 건너뜀 (이미 존재)` : ''}`, 'success');
    } catch (err) {
      console.error('Restore failed', err);
      const msg = err && err.message === 'INVALID_BACKUP'
        ? 'GIJO MD Studio 백업 파일이 아닙니다.'
        : err && err.message === 'UNSUPPORTED_VERSION'
          ? '더 최신 버전에서 만든 백업 파일입니다. 앱을 업데이트해 주세요.'
          : '백업 파일을 읽을 수 없습니다.';
      showToast(msg, 'warning');
    }
  });

  btnImportMd.addEventListener('click', () => {
    if (!requireLibrary()) return;
    mdFileInput.click();
  });

  mdFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    mdFileInput.value = '';
    await importMarkdownFiles(files);
  });

  function isMarkdownFileName(name) {
    return /\.(md|markdown)$/i.test(name || '');
  }

  function isMarkdownFile(file) {
    return isMarkdownFileName(file && file.name) || (file && file.type === 'text/markdown');
  }

  async function importMarkdownFiles(files) {
    if (!files.length) return;
    if (!requireLibrary()) return;
    await flushCurrentDocument();

    let firstId = null;
    let imported = 0;
    let euckrNotified = false;
    for (const file of files) {
      try {
        let content;
        if (window.GijoFiles && typeof file.arrayBuffer === 'function') {
          const decoded = GijoFiles.decodeBytes(new Uint8Array(await file.arrayBuffer()));
          content = decoded.text;
          if (decoded.encoding === 'euc-kr' && !euckrNotified) {
            euckrNotified = true;
            showToast('EUC-KR 로 읽었습니다. 저장은 UTF-8 로 됩니다', 'info');
          }
        } else {
          content = await file.text();
        }
        const doc = await GijoStorage.createDocument({
          title: file.name.replace(/\.(md|markdown|txt)$/i, '') || '제목 없는 문서',
          content,
        });
        if (!firstId) firstId = doc.id;
        imported++;
      } catch (err) {
        console.error('Markdown import failed', file.name, err);
      }
    }

    if (!imported) {
      showToast('가져올 수 있는 파일이 없습니다.', 'warning');
      return;
    }
    // Open the first import so the result is immediately visible.
    if (firstId) await switchToDocument(firstId, { skipFlush: true });
    else await renderDocumentList();
    showToast(`${imported}개의 마크다운 파일을 가져왔습니다.`, 'success');
  }

  // --- 9c. Local File Open / Save / Save As / Unlink (File System Access API) ---
  function docKey(docId) {
    return storageAvailable ? docId : '__legacy__';
  }

  function extractFileMeta(doc) {
    if (!doc || !doc.fileHandle) return null;
    return {
      fileHandle: doc.fileHandle,
      fileName: doc.fileName || doc.fileHandle.name || '',
      lineEnding: doc.lineEnding || 'LF',
      hadBom: !!doc.hadBom,
      encoding: doc.encoding || 'utf-8',
      fileDirty: !!doc.fileDirty,
    };
  }

  function updateFileTagUI() {
    const supported = !!(window.GijoFiles && GijoFiles.isSupported());
    if (currentFileMeta && currentFileMeta.fileHandle) {
      fileUnsupportedNotice.hidden = true;
      fileTagEl.hidden = false;
      fileTagName.textContent = currentFileMeta.fileName;
      fileTagLabel.title = currentFileMeta.fileName + (currentFileMeta.fileDirty ? ' (저장되지 않은 변경 있음)' : ' (파일과 연결됨)');
      fileDirtyDot.hidden = !currentFileMeta.fileDirty;
      btnSaveFile.classList.toggle('has-dirty', !!currentFileMeta.fileDirty);
      btnSaveFile.title = '연결된 파일에 저장 (Ctrl+S)';
    } else {
      fileTagEl.hidden = true;
      fileDirtyDot.hidden = true;
      btnSaveFile.classList.remove('has-dirty');
      btnSaveFile.title = supported ? '파일에 저장 (Ctrl+S)' : 'Markdown (.md) 파일로 내려받기 (Ctrl+S)';
      const dismissed = !!localStorage.getItem(UNSUPPORTED_NOTICE_KEY);
      fileUnsupportedNotice.hidden = supported || dismissed;
    }
  }

  function markCurrentContentChanged() {
    if (!currentFileMeta || !currentFileMeta.fileHandle) return;
    const key = docKey(currentDocId);
    const dirty = !savedContentByDocId.has(key) || editor.value !== savedContentByDocId.get(key);
    if (dirty !== currentFileMeta.fileDirty) {
      currentFileMeta.fileDirty = dirty;
      if (dirty) dirtyLinkedDocIds.add(key);
      else dirtyLinkedDocIds.delete(key);
      updateFileTagUI();
      if (storageAvailable) renderDocumentList();
      if (activeFolderHandle) syncFolderEntryStates();
    }
  }

  function deriveTitleFromFileName(name) {
    return (name || '').replace(/\.(md|markdown|txt)$/i, '').trim() || '제목 없는 문서';
  }

  async function openLinkedHandles(handles, options = {}) {
    if (!window.GijoFiles) return;
    const fileHandles = Array.from(handles || []).filter((h) => h && h.kind === 'file');
    if (!fileHandles.length) return;
    const knownDirPath = typeof options.dirPath === 'string' ? options.dirPath : null;
    const silentExistingToast = !!options.silentExistingToast;

    await flushCurrentDocument();

    let targetDocId = null;
    let openedCount = 0;
    let openedSingleName = '';
    let existingSingleName = '';
    let euckrNotified = false;
    const existingDocs = storageAvailable ? await GijoStorage.getAllDocuments() : [];

    for (const handle of fileHandles) {
      try {
        let existing = null;
        if (storageAvailable) {
          for (const candidate of existingDocs) {
            if (candidate.fileHandle && await GijoFiles.sameEntry(candidate.fileHandle, handle)) {
              existing = candidate;
              break;
            }
          }
        }

        if (existing) {
          if (!targetDocId) targetDocId = existing.id;
          if (knownDirPath !== null) docFolderDirPathById.set(existing.id, knownDirPath);
          existingSingleName = existing.fileName || handle.name || '';
          const isDirty = !!(existing.fileDirty || dirtyLinkedDocIds.has(existing.id));
          if (!isDirty) {
            try {
              const read = await GijoFiles.readHandle(handle);
              if (read.encoding === 'euc-kr' && !euckrNotified) {
                euckrNotified = true;
                showToast('EUC-KR 로 읽었습니다. 저장은 UTF-8 로 됩니다', 'info');
              }
              await GijoStorage.updateDocumentContent(existing.id, {
                title: existing.title,
                content: read.text,
                fileDirty: false,
              });
              await GijoStorage.updateDocumentFileLink(existing.id, {
                fileHandle: handle,
                fileName: read.fileName,
                lineEnding: read.lineEnding,
                hadBom: read.hadBom,
                encoding: read.encoding,
                fileDirty: false,
              });
              savedContentByDocId.set(existing.id, read.text);
              dirtyLinkedDocIds.delete(existing.id);
            } catch (_) { /* keep existing library copy if re-read fails */ }
          }
          continue;
        }

        const read = await GijoFiles.readHandle(handle);
        if (read.encoding === 'euc-kr' && !euckrNotified) {
          euckrNotified = true;
          showToast('EUC-KR 로 읽었습니다. 저장은 UTF-8 로 됩니다', 'info');
        }

        const title = deriveTitleFromFileName(read.fileName);
        if (storageAvailable) {
          const doc = await GijoStorage.createDocument({
            title,
            content: read.text,
            fileHandle: handle,
            fileName: read.fileName,
            lineEnding: read.lineEnding,
            hadBom: read.hadBom,
            encoding: read.encoding,
            fileDirty: false,
          });
          existingDocs.unshift(doc);
          savedContentByDocId.set(doc.id, read.text);
          dirtyLinkedDocIds.delete(doc.id);
          if (knownDirPath !== null) docFolderDirPathById.set(doc.id, knownDirPath);
          if (!targetDocId) targetDocId = doc.id;
          openedCount++;
          openedSingleName = read.fileName;
        } else {
          revokePreviewBlobUrls();
          docTitleInput.value = title;
          editor.value = read.text;
          currentFileMeta = {
            fileHandle: handle,
            fileName: read.fileName,
            lineEnding: read.lineEnding,
            hadBom: read.hadBom,
            encoding: read.encoding,
            fileDirty: false,
          };
          savedContentByDocId.set('__legacy__', read.text);
          dirtyLinkedDocIds.delete('__legacy__');
          if (knownDirPath !== null) docFolderDirPathById.set('__legacy__', knownDirPath);
          updatePreview();
          updateFileTagUI();
          scheduleAutoSave();
          openedCount++;
          openedSingleName = read.fileName;
          break;
        }
      } catch (err) {
        console.error('Failed to open file handle', handle && handle.name, err);
        if (err && err.code === 'PERMISSION_DENIED') {
          showToast('파일 읽기 권한이 허용되지 않아 열지 못했습니다.', 'warning');
        } else {
          showToast(`파일을 열 수 없습니다: ${(handle && handle.name) || ''}`, 'warning');
        }
      }
    }

    if (storageAvailable) {
      if (targetDocId) await switchToDocument(targetDocId, { skipFlush: true });
      else await renderDocumentList();
    }

    if (openedCount > 1) {
      showToast(`${openedCount}개의 파일을 열었습니다.`, 'success');
    } else if (openedCount === 1) {
      showToast(`파일을 열었습니다: ${openedSingleName}`, 'success');
    } else if (existingSingleName && !silentExistingToast) {
      showToast(`이미 열려 있는 파일로 이동했습니다: ${existingSingleName}`, 'info');
    }
  }

  async function handleOpenFile() {
    if (!window.GijoFiles || !GijoFiles.isSupported()) {
      updateFileTagUI();
      if (!storageAvailable) {
        showToast('이 브라우저에서는 문서함 기능을 사용할 수 없습니다.', 'warning');
        return;
      }
      mdFileInput.click();
      return;
    }
    try {
      const handles = await GijoFiles.openFiles();
      if (handles.length) await openLinkedHandles(handles);
    } catch (err) {
      console.error('Open file failed', err);
      showToast('파일을 여는 중 오류가 발생했습니다.', 'warning');
    }
  }

  async function handleSaveFile() {
    if (!window.GijoFiles || !GijoFiles.isSupported()) {
      updateFileTagUI();
      await handleExport('md');
      return;
    }
    if (!currentFileMeta || !currentFileMeta.fileHandle) {
      await handleSaveAs();
      return;
    }

    const docId = currentDocId;
    const key = docKey(docId);
    const content = editor.value;
    const meta = { ...currentFileMeta };

    try {
      const res = await GijoFiles.writeHandle(meta.fileHandle, content, {
        hadBom: meta.hadBom,
        lineEnding: meta.lineEnding,
      });
      const updatedMeta = {
        ...meta,
        fileName: res.fileName || meta.fileName,
        encoding: 'utf-8',
        fileDirty: false,
      };
      savedContentByDocId.set(key, content);
      dirtyLinkedDocIds.delete(key);
      if (currentDocId === docId) {
        currentFileMeta = updatedMeta;
        updateFileTagUI();
      }
      if (storageAvailable && docId) {
        await GijoStorage.updateDocumentFileLink(docId, updatedMeta);
        if (currentDocId === docId) await saveCurrentDocument();
        else await renderDocumentList();
      }
      if (activeFolderHandle) {
        await updateSavedEntryTimestamp(meta.fileHandle);
        await syncFolderEntryStates();
      }
      showToast(`파일에 저장했습니다: ${updatedMeta.fileName}`, 'success');
    } catch (err) {
      if (err && err.code === 'PERMISSION_DENIED') {
        showToast('파일 쓰기 권한이 허용되지 않아 저장하지 못했습니다.', 'warning');
      } else {
        console.error('Save file failed', err);
        showToast('파일 저장 중 오류가 발생했습니다.', 'warning');
      }
    }
  }

  async function handleSaveAs() {
    if (!window.GijoFiles || !GijoFiles.isSupported()) {
      updateFileTagUI();
      await handleExport('md');
      return;
    }

    const docId = currentDocId;
    const key = docKey(docId);
    const title = docTitleInput.value;
    const content = editor.value;
    const hadBom = !!(currentFileMeta && currentFileMeta.hadBom);
    const lineEnding = (currentFileMeta && currentFileMeta.lineEnding) || 'LF';

    try {
      const res = await GijoFiles.saveAs(title, content, { hadBom, lineEnding });
      if (!res) return; // user cancelled picker
      const newMeta = {
        fileHandle: res.handle,
        fileName: res.fileName,
        lineEnding,
        hadBom,
        encoding: 'utf-8',
        fileDirty: false,
      };
      savedContentByDocId.set(key, content);
      dirtyLinkedDocIds.delete(key);
      if (currentDocId === docId) {
        currentFileMeta = newMeta;
        updateFileTagUI();
      }
      if (storageAvailable && docId) {
        await GijoStorage.updateDocumentFileLink(docId, newMeta);
        if (currentDocId === docId) await saveCurrentDocument();
        else await renderDocumentList();
      }
      if (activeFolderHandle) {
        const resolvedDir = await resolveDocDirPathInActiveFolder(res.handle);
        if (resolvedDir !== null) {
          docFolderDirPathById.set(key, resolvedDir);
          await refreshActiveFolderSilently();
          if (currentDocId === docId) updatePreview();
        } else {
          await syncFolderEntryStates();
        }
      }
      showToast(`파일에 저장했습니다: ${newMeta.fileName}`, 'success');
    } catch (err) {
      if (err && err.code === 'PERMISSION_DENIED') {
        showToast('파일 쓰기 권한이 허용되지 않아 저장하지 못했습니다.', 'warning');
      } else {
        console.error('Save As failed', err);
        showToast('다른 이름으로 저장 중 오류가 발생했습니다.', 'warning');
      }
    }
  }

  async function handleUnlinkFile(docId = currentDocId) {
    const key = docKey(docId);
    dirtyLinkedDocIds.delete(key);
    savedContentByDocId.delete(key);
    docFolderDirPathById.delete(key);
    if (storageAvailable && docId) {
      await GijoStorage.updateDocumentFileLink(docId, null);
    }
    if (docId === currentDocId) {
      currentFileMeta = null;
      revokePreviewBlobUrls();
      updatePreview();
      updateFileTagUI();
    }
    if (storageAvailable) {
      await renderDocumentList();
    }
    if (activeFolderHandle) {
      await syncFolderEntryStates();
    }
    showToast('파일 연결을 끊었습니다. 문서는 문서함에 남습니다.', 'info');
  }

  // Deduplicates Ctrl+S across Electron menu accelerator IPC and renderer keydown.
  function triggerSaveShortcut() {
    const now = Date.now();
    if (now - lastSaveShortcutAt < 250) return;
    lastSaveShortcutAt = now;
    handleSaveFile();
  }

  btnOpenFile.addEventListener('click', () => handleOpenFile());
  btnSaveFile.addEventListener('click', () => handleSaveFile());
  btnUnlinkFile.addEventListener('click', () => handleUnlinkFile(currentDocId));
  btnDismissUnsupported.addEventListener('click', () => {
    try { localStorage.setItem(UNSUPPORTED_NOTICE_KEY, '1'); } catch (_) { /* ignore */ }
    fileUnsupportedNotice.hidden = true;
  });

  // PWA File Handling API: open .md files double-clicked in the OS when installed.
  if ('launchQueue' in window && window.launchQueue && typeof window.launchQueue.setConsumer === 'function') {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams || !Array.isArray(launchParams.files) || !launchParams.files.length) return;
      await initReady;
      await openLinkedHandles(launchParams.files);
    });
  }

  // --- 9d. Workspace Folder, Relative Preview Images & Library-to-Folder Export ---
  function revokePreviewBlobUrls() {
    previewImageGen++;
    for (const url of previewBlobUrls.values()) {
      try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
    }
    previewBlobUrls.clear();
  }

  async function resolveDocDirPathInActiveFolder(fileHandle) {
    if (!activeFolderHandle || !fileHandle || !window.GijoFiles) return null;
    for (const entry of activeFolderEntries) {
      if (entry.name === fileHandle.name && await GijoFiles.sameEntry(entry.handle, fileHandle)) {
        return entry.dirPath;
      }
    }
    if (typeof activeFolderHandle.resolve === 'function') {
      try {
        const parts = await activeFolderHandle.resolve(fileHandle);
        if (Array.isArray(parts) && parts.length >= 1) {
          return parts.slice(0, -1).join('/');
        }
      } catch (_) { /* ignore */ }
    }
    return null;
  }

  function resolvePreviewRelativeImages() {
    if (!activeFolderHandle || !window.GijoFiles) return;
    if (!currentFileMeta || !currentFileMeta.fileHandle) return;
    const key = docKey(currentDocId);
    if (!docFolderDirPathById.has(key)) return;

    const baseDirPath = docFolderDirPathById.get(key) || '';
    const imgs = Array.from(preview.querySelectorAll('img'));
    if (!imgs.length) return;

    const gen = ++previewImageGen;
    const pending = [];

    for (const img of imgs) {
      const rawSrc = (img.getAttribute('src') || '').trim();
      if (!rawSrc || /^(https?:|data:|blob:|mailto:|javascript:|\/\/|#)/i.test(rawSrc)) continue;

      const normalized = GijoFiles.normalizeRelPath(baseDirPath, rawSrc);
      if (!normalized) continue;

      if (previewBlobUrls.has(normalized)) {
        img.src = previewBlobUrls.get(normalized);
        continue;
      }
      pending.push({ img, rawSrc, normalized });
    }

    if (!pending.length) return;

    const dirHandle = activeFolderHandle;
    (async () => {
      for (const { img, rawSrc, normalized } of pending) {
        if (gen !== previewImageGen || activeFolderHandle !== dirHandle) return;
        if (previewBlobUrls.has(normalized)) {
          img.src = previewBlobUrls.get(normalized);
          continue;
        }
        try {
          const handle = await GijoFiles.resolveRelative(dirHandle, baseDirPath, rawSrc);
          if (gen !== previewImageGen || activeFolderHandle !== dirHandle) return;
          if (!handle) continue;
          const file = await handle.getFile();
          if (gen !== previewImageGen || activeFolderHandle !== dirHandle) return;
          let url = previewBlobUrls.get(normalized);
          if (!url) {
            url = URL.createObjectURL(file);
            previewBlobUrls.set(normalized, url);
          }
          img.src = url;
        } catch (_) {
          // Missing or unreadable image — leave original img element untouched.
        }
      }
    })();
  }

  function setSidebarTab(tab) {
    const folderSupported = !!(window.GijoFiles && GijoFiles.isFolderSupported());
    activeSidebarTab = (tab === 'folder' && folderSupported) ? 'folder' : 'library';

    const isFolder = activeSidebarTab === 'folder';
    tabLibrary.classList.toggle('active', !isFolder);
    tabLibrary.setAttribute('aria-selected', String(!isFolder));
    tabFolder.classList.toggle('active', isFolder);
    tabFolder.setAttribute('aria-selected', String(isFolder));

    sidebarLibraryPane.hidden = isFolder;
    sidebarFolderPane.hidden = !isFolder;
  }

  function updateFolderFeatureUI() {
    const folderSupported = !!(window.GijoFiles && GijoFiles.isFolderSupported());

    btnOpenFolder.hidden = !folderSupported;
    btnExportFolder.hidden = !folderSupported;
    sidebarTabs.hidden = !folderSupported;
    sidebarLibraryLabel.hidden = folderSupported;
    folderUnsupportedHint.hidden = folderSupported;

    if (!folderSupported) {
      btnReopenFolder.hidden = true;
      btnFolderEmptyReopen.hidden = true;
      setSidebarTab('library');
      return;
    }

    const canReopen = !activeFolderHandle && !!savedFolderHandle;
    const reopenText = savedFolderHandle ? `지난 폴더 다시 열기: ${savedFolderHandle.name}` : '지난 폴더 다시 열기';
    btnReopenFolder.hidden = !canReopen;
    reopenFolderLabel.textContent = reopenText;
    btnReopenFolder.title = reopenText;

    btnFolderEmptyReopen.hidden = !canReopen;
    folderEmptyReopenLabel.textContent = reopenText;
    btnFolderEmptyReopen.title = reopenText;

    folderEmptyState.hidden = !!activeFolderHandle;
    folderActiveView.hidden = !activeFolderHandle;
    if (activeFolderHandle) {
      folderRootName.textContent = activeFolderHandle.name || '폴더';
      folderRootBtn.classList.toggle('selected', selectedFolderDirPath === '');
      folderLimitNotice.hidden = !activeFolderTruncated;
    }
  }

  function formatFileDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  async function updateSavedEntryTimestamp(fileHandle) {
    if (!activeFolderHandle || !fileHandle || !window.GijoFiles) return;
    for (const entry of activeFolderEntries) {
      if (entry.name === fileHandle.name && await GijoFiles.sameEntry(entry.handle, fileHandle)) {
        try {
          const file = await fileHandle.getFile();
          if (file && typeof file.lastModified === 'number') entry.lastModified = file.lastModified;
        } catch (_) { /* ignore */ }
        break;
      }
    }
  }

  async function syncFolderEntryStates() {
    folderStateByPath.clear();
    if (!activeFolderHandle || !window.GijoFiles) return;

    const linkedDocs = [];
    if (storageAvailable) {
      const docs = await GijoStorage.getAllDocuments();
      for (const doc of docs) {
        if (doc.fileHandle) {
          linkedDocs.push({
            id: doc.id,
            handle: doc.fileHandle,
            name: doc.fileHandle.name || doc.fileName || '',
            isDirty: !!(doc.fileDirty || dirtyLinkedDocIds.has(doc.id)),
          });
        }
      }
    } else if (currentFileMeta && currentFileMeta.fileHandle) {
      linkedDocs.push({
        id: '__legacy__',
        handle: currentFileMeta.fileHandle,
        name: currentFileMeta.fileHandle.name || currentFileMeta.fileName || '',
        isDirty: !!(currentFileMeta.fileDirty || dirtyLinkedDocIds.has('__legacy__')),
      });
    }

    const docsByName = new Map();
    for (const d of linkedDocs) {
      if (!docsByName.has(d.name)) docsByName.set(d.name, []);
      docsByName.get(d.name).push(d);
    }

    const activeKey = docKey(currentDocId);
    for (const entry of activeFolderEntries) {
      const candidates = docsByName.get(entry.name);
      if (!candidates) continue;
      for (const doc of candidates) {
        if (await GijoFiles.sameEntry(doc.handle, entry.handle)) {
          docFolderDirPathById.set(doc.id, entry.dirPath);
          folderStateByPath.set(entry.path, {
            docId: doc.id,
            isActive: doc.id === activeKey,
            isDirty: doc.isDirty,
          });
          break;
        }
      }
    }

    renderFolderTree();
  }

  function buildFolderTreeModel(entries, query) {
    const root = { name: '', dirPath: '', dirs: new Map(), files: [] };
    const needle = (query || '').trim().toLowerCase();

    for (const entry of entries) {
      if (needle && !entry.name.toLowerCase().includes(needle)) continue;
      let node = root;
      if (entry.dirPath) {
        const parts = entry.dirPath.split('/');
        let acc = '';
        for (const part of parts) {
          acc = acc ? `${acc}/${part}` : part;
          if (!node.dirs.has(part)) {
            node.dirs.set(part, { name: part, dirPath: acc, dirs: new Map(), files: [] });
          }
          node = node.dirs.get(part);
        }
      }
      node.files.push(entry);
    }
    return root;
  }

  function renderFolderTree() {
    if (!activeFolderHandle) {
      folderTreeEl.innerHTML = '';
      return;
    }

    const query = (folderSearchInput.value || '').trim();
    const root = buildFolderTreeModel(activeFolderEntries, query);
    const filteredCount = query
      ? activeFolderEntries.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).length
      : activeFolderEntries.length;

    folderFileCount.textContent = query
      ? `${filteredCount}/${activeFolderEntries.length}개`
      : `${activeFolderEntries.length}개${activeFolderTruncated ? '+' : ''}`;
    folderRootBtn.classList.toggle('selected', selectedFolderDirPath === '');
    folderLimitNotice.hidden = !activeFolderTruncated;

    folderTreeEl.innerHTML = '';
    if (filteredCount === 0) {
      const empty = document.createElement('div');
      empty.className = 'document-list-empty';
      empty.textContent = query ? '일치하는 파일이 없습니다.' : '이 폴더에 .md 파일이 없습니다.';
      folderTreeEl.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();

    function renderNode(node, depth) {
      const sortedDirs = Array.from(node.dirs.values())
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      const sortedFiles = node.files.slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

      for (const dir of sortedDirs) {
        const isCollapsed = !query && collapsedFolderDirs.has(dir.dirPath);
        const dirBtn = document.createElement('button');
        dirBtn.type = 'button';
        dirBtn.className = 'folder-dir-row' + (selectedFolderDirPath === dir.dirPath ? ' selected' : '');
        dirBtn.style.paddingLeft = `${8 + depth * 14}px`;
        dirBtn.setAttribute('aria-expanded', String(!isCollapsed));
        dirBtn.title = `${dir.dirPath} (클릭: 펼치기/접기 및 새 파일 위치 선택)`;

        const chev = document.createElement('i');
        chev.className = `fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} folder-dir-chevron`;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${isCollapsed ? 'fa-folder' : 'fa-folder-open'} folder-dir-icon`;
        const label = document.createElement('span');
        label.className = 'folder-dir-name';
        label.textContent = dir.name;

        dirBtn.appendChild(chev);
        dirBtn.appendChild(icon);
        dirBtn.appendChild(label);
        dirBtn.addEventListener('click', () => {
          selectedFolderDirPath = dir.dirPath;
          if (collapsedFolderDirs.has(dir.dirPath)) collapsedFolderDirs.delete(dir.dirPath);
          else collapsedFolderDirs.add(dir.dirPath);
          renderFolderTree();
        });
        frag.appendChild(dirBtn);

        if (!isCollapsed) {
          renderNode(dir, depth + 1);
        }
      }

      for (const entry of sortedFiles) {
        const state = folderStateByPath.get(entry.path);
        const fileBtn = document.createElement('button');
        fileBtn.type = 'button';
        fileBtn.className = 'folder-file-row' + (state && state.isActive ? ' active' : '');
        fileBtn.style.paddingLeft = `${10 + depth * 14}px`;
        fileBtn.dataset.path = entry.path;
        fileBtn.title = entry.path;

        const icon = document.createElement('i');
        icon.className = 'fa-regular fa-file-lines folder-file-icon';

        const info = document.createElement('div');
        info.className = 'folder-file-info';

        const titleRow = document.createElement('div');
        titleRow.className = 'folder-file-title-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'folder-file-name';
        renderHighlighted(nameEl, entry.name, query);
        titleRow.appendChild(nameEl);

        if (state && state.isDirty) {
          const dirtyDot = document.createElement('span');
          dirtyDot.className = 'folder-file-dirty';
          dirtyDot.title = '저장되지 않은 변경 있음';
          dirtyDot.textContent = '●';
          titleRow.appendChild(dirtyDot);
        }

        const metaEl = document.createElement('span');
        metaEl.className = 'folder-file-meta';
        metaEl.textContent = formatFileDate(entry.lastModified);

        info.appendChild(titleRow);
        if (metaEl.textContent) info.appendChild(metaEl);

        fileBtn.appendChild(icon);
        fileBtn.appendChild(info);
        fileBtn.addEventListener('click', () => handleOpenFolderFile(entry));
        frag.appendChild(fileBtn);
      }
    }

    renderNode(root, 0);
    folderTreeEl.appendChild(frag);
  }

  async function refreshActiveFolderSilently() {
    if (!activeFolderHandle || !window.GijoFiles) return;
    const entries = await GijoFiles.listMarkdown(activeFolderHandle, { maxDepth: 3, limit: 500 });
    activeFolderEntries = entries;
    activeFolderTruncated = !!entries.truncated;
    await syncFolderEntryStates();
    updateFolderFeatureUI();
  }

  async function openFolderWithHandle(dirHandle, { requestPerm = false } = {}) {
    if (!dirHandle || !window.GijoFiles) return;
    try {
      if (requestPerm) {
        const granted = await GijoFiles.ensurePermission(dirHandle, 'readwrite');
        if (!granted) {
          showToast('폴더 접근 권한이 허용되지 않아 열지 못했습니다.', 'warning');
          return;
        }
      }

      const entries = await GijoFiles.listMarkdown(dirHandle, { maxDepth: 3, limit: 500 });
      revokePreviewBlobUrls();
      docFolderDirPathById.clear();
      collapsedFolderDirs.clear();
      selectedFolderDirPath = '';
      folderSearchInput.value = '';

      activeFolderHandle = dirHandle;
      activeFolderEntries = entries;
      activeFolderTruncated = !!entries.truncated;
      savedFolderHandle = dirHandle;

      if (storageAvailable && typeof GijoStorage.saveFolderHandle === 'function') {
        try { await GijoStorage.saveFolderHandle(dirHandle); } catch (_) { /* ignore */ }
      }

      setSidebarTab('folder');
      updateFolderFeatureUI();
      await syncFolderEntryStates();

      if (currentFileMeta && currentFileMeta.fileHandle && !docFolderDirPathById.has(docKey(currentDocId))) {
        const resolvedDir = await resolveDocDirPathInActiveFolder(currentFileMeta.fileHandle);
        if (resolvedDir !== null) docFolderDirPathById.set(docKey(currentDocId), resolvedDir);
      }
      updatePreview();

      if (activeFolderTruncated) {
        showToast('파일이 500개를 넘어 처음 500개만 표시합니다.', 'warning');
      } else {
        showToast(`폴더를 열었습니다: ${dirHandle.name} (${entries.length}개 파일)`, 'success');
      }
    } catch (err) {
      console.error('Open folder failed', err);
      if (err && err.code === 'PERMISSION_DENIED') {
        showToast('폴더 접근 권한이 허용되지 않았습니다.', 'warning');
      } else if (err && err.name === 'NotFoundError') {
        savedFolderHandle = null;
        if (storageAvailable && typeof GijoStorage.clearSavedFolderHandle === 'function') {
          await GijoStorage.clearSavedFolderHandle();
        }
        updateFolderFeatureUI();
        showToast('지난 폴더를 찾을 수 없습니다. 폴더를 다시 골라 주세요.', 'warning');
      } else {
        showToast('폴더를 여는 중 오류가 발생했습니다.', 'warning');
      }
    }
  }

  async function handleOpenFolder() {
    if (!window.GijoFiles || !GijoFiles.isFolderSupported()) return;
    try {
      const dirHandle = await GijoFiles.openFolder();
      if (!dirHandle) return;
      await openFolderWithHandle(dirHandle);
    } catch (err) {
      console.error('Folder picker failed', err);
      showToast('폴더를 여는 중 오류가 발생했습니다.', 'warning');
    }
  }

  async function handleReopenFolder() {
    if (!savedFolderHandle || !window.GijoFiles || !GijoFiles.isFolderSupported()) return;
    await openFolderWithHandle(savedFolderHandle, { requestPerm: true });
  }

  async function handleRefreshFolder() {
    if (!activeFolderHandle || !window.GijoFiles) return;
    try {
      revokePreviewBlobUrls();
      await refreshActiveFolderSilently();
      updatePreview();
      if (activeFolderTruncated) {
        showToast('새로 고침 완료 — 파일이 500개를 넘어 처음 500개만 표시합니다.', 'warning');
      } else {
        showToast(`폴더 목록을 새로 고쳤습니다. (${activeFolderEntries.length}개 파일)`, 'info');
      }
    } catch (err) {
      console.error('Refresh folder failed', err);
      showToast('폴더를 새로 고치는 중 오류가 발생했습니다.', 'warning');
    }
  }

  function handleCloseFolder() {
    if (!activeFolderHandle) return;
    revokePreviewBlobUrls();
    activeFolderHandle = null;
    activeFolderEntries = [];
    activeFolderTruncated = false;
    selectedFolderDirPath = '';
    collapsedFolderDirs.clear();
    folderStateByPath.clear();
    docFolderDirPathById.clear();
    folderSearchInput.value = '';
    folderTreeEl.innerHTML = '';
    updateFolderFeatureUI();
    updatePreview();
    showToast('폴더를 닫았습니다.', 'info');
  }

  async function handleOpenFolderFile(entry) {
    if (!entry || !entry.handle) return;
    selectedFolderDirPath = entry.dirPath || '';
    await openLinkedHandles([entry.handle], {
      dirPath: entry.dirPath || '',
      silentExistingToast: true,
    });
    if (isMobileLayout()) setSidebarCollapsed(true);
  }

  function openNewFileModal() {
    if (!activeFolderHandle) {
      showToast('먼저 폴더를 열어 주세요.', 'warning');
      return;
    }
    const loc = selectedFolderDirPath
      ? `${activeFolderHandle.name}/${selectedFolderDirPath}`
      : `${activeFolderHandle.name} (루트)`;
    newFileLocation.textContent = `저장 위치: ${loc}`;
    newFileNameInput.value = '';
    newFileError.textContent = '';
    newFileError.hidden = true;
    newFileModal.classList.add('open');
    setTimeout(() => newFileNameInput.focus(), 0);
  }

  function closeNewFileModal() {
    newFileModal.classList.remove('open');
  }

  function showNewFileError(msg) {
    newFileError.textContent = msg;
    newFileError.hidden = false;
  }

  async function handleCreateFolderFile(e) {
    if (e) e.preventDefault();
    if (!activeFolderHandle || !window.GijoFiles) return;

    const rawName = newFileNameInput.value;
    const parsed = GijoFiles.normalizeNewFileName(rawName);
    if (!parsed.ok) {
      if (parsed.reason === 'EMPTY') {
        showNewFileError('파일 이름을 입력하세요.');
      } else if (parsed.reason === 'INVALID_CHARS') {
        showNewFileError('파일 이름에 \\ / : * ? " < > | 글자는 쓸 수 없습니다.');
      } else {
        showNewFileError('올바른 파일 이름을 입력하세요.');
      }
      newFileNameInput.focus();
      return;
    }

    try {
      const targetDir = await GijoFiles.getSubdirectoryHandle(activeFolderHandle, selectedFolderDirPath);
      if (!targetDir) {
        showNewFileError('선택한 폴더를 찾을 수 없습니다. 폴더를 새로 고쳐 주세요.');
        return;
      }

      const fileHandle = await GijoFiles.createFile(targetDir, rawName);
      closeNewFileModal();

      // Expand ancestor directories so the newly created file is visible in the tree.
      if (selectedFolderDirPath) {
        const parts = selectedFolderDirPath.split('/');
        let acc = '';
        for (const p of parts) {
          acc = acc ? `${acc}/${p}` : p;
          collapsedFolderDirs.delete(acc);
        }
      }

      await refreshActiveFolderSilently();
      await openLinkedHandles([fileHandle], {
        dirPath: selectedFolderDirPath,
        silentExistingToast: true,
      });
      showToast(`새 파일을 만들었습니다: ${fileHandle.name}`, 'success');
    } catch (err) {
      if (err && err.code === 'ALREADY_EXISTS') {
        showNewFileError('같은 이름의 파일이 있습니다.');
        showToast('같은 이름의 파일이 있습니다', 'warning');
      } else if (err && err.code === 'PERMISSION_DENIED') {
        showNewFileError('폴더 쓰기 권한이 허용되지 않았습니다.');
      } else {
        console.error('Create file failed', err);
        showNewFileError('파일을 만드는 중 오류가 발생했습니다.');
      }
    }
  }

  function sanitizeExportBaseName(title) {
    const cleaned = String(title || '')
      .trim()
      .replace(/\.(md|markdown)$/i, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/^\.+$/, '')
      .trim();
    return cleaned || '제목 없는 문서';
  }

  async function pickUniqueExportFileName(dirHandle, usedLowerNames, rawTitle) {
    const base = sanitizeExportBaseName(rawTitle);
    let idx = 1;
    for (;;) {
      const candidate = idx === 1 ? `${base}.md` : `${base} (${idx}).md`;
      const lower = candidate.toLowerCase();
      if (!usedLowerNames.has(lower)) {
        let existsOnDisk = false;
        try {
          await dirHandle.getFileHandle(candidate, { create: false });
          existsOnDisk = true;
        } catch (err) {
          if (!err || err.name !== 'NotFoundError') throw err;
        }
        if (!existsOnDisk) {
          usedLowerNames.add(lower);
          return candidate;
        }
      }
      idx++;
    }
  }

  async function handleExportLibraryToFolder() {
    if (!requireLibrary()) return;
    if (!window.GijoFiles || !GijoFiles.isFolderSupported()) return;

    await flushCurrentDocument();
    const docs = await GijoStorage.getAllDocuments();
    const unlinkedDocs = docs.filter((doc) => !doc.fileHandle);
    if (!unlinkedDocs.length) {
      showToast('내보낼 문서함 문서가 없습니다. (파일과 연결되지 않은 문서만 내보냅니다)', 'info');
      return;
    }

    let dirHandle;
    try {
      dirHandle = await GijoFiles.openFolder();
    } catch (err) {
      console.error('Export folder picker failed', err);
      showToast('폴더를 고르는 중 오류가 발생했습니다.', 'warning');
      return;
    }
    if (!dirHandle) return;

    const granted = await GijoFiles.ensurePermission(dirHandle, 'readwrite');
    if (!granted) {
      showToast('폴더 쓰기 권한이 허용되지 않아 내보내지 못했습니다.', 'warning');
      return;
    }

    const usedLowerNames = new Set();
    let written = 0;
    let failed = 0;
    for (const doc of unlinkedDocs) {
      try {
        const fileName = await pickUniqueExportFileName(dirHandle, usedLowerNames, doc.title);
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        await GijoFiles.writeHandle(fileHandle, doc.content || '', { lineEnding: 'LF', hadBom: false });
        written++;
      } catch (err) {
        console.error('Export doc to folder failed', doc.title, err);
        failed++;
      }
    }

    if (activeFolderHandle && await GijoFiles.sameEntry(activeFolderHandle, dirHandle)) {
      await refreshActiveFolderSilently();
    }

    if (written > 0 && failed === 0) {
      showToast(`문서 ${written}개를 '${dirHandle.name}' 폴더로 내보냈습니다.`, 'success');
    } else if (written > 0) {
      showToast(`문서 ${written}개를 내보냈습니다 (${failed}개 실패).`, 'warning');
    } else {
      showToast('문서를 폴더로 내보내지 못했습니다.', 'warning');
    }
  }

  tabLibrary.addEventListener('click', () => setSidebarTab('library'));
  tabFolder.addEventListener('click', () => setSidebarTab('folder'));
  btnOpenFolder.addEventListener('click', () => handleOpenFolder());
  btnFolderEmptyOpen.addEventListener('click', () => handleOpenFolder());
  btnReopenFolder.addEventListener('click', () => handleReopenFolder());
  btnFolderEmptyReopen.addEventListener('click', () => handleReopenFolder());
  btnFolderNewFile.addEventListener('click', () => openNewFileModal());
  btnFolderRefresh.addEventListener('click', () => handleRefreshFolder());
  btnFolderClose.addEventListener('click', () => handleCloseFolder());
  btnExportFolder.addEventListener('click', () => handleExportLibraryToFolder());
  folderRootBtn.addEventListener('click', () => {
    selectedFolderDirPath = '';
    renderFolderTree();
  });

  let folderSearchTimer = null;
  folderSearchInput.addEventListener('input', () => {
    clearTimeout(folderSearchTimer);
    folderSearchTimer = setTimeout(renderFolderTree, 120);
  });
  folderSearchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !folderSearchInput.value) return;
    e.stopPropagation();
    folderSearchInput.value = '';
    renderFolderTree();
  });

  newFileForm.addEventListener('submit', handleCreateFolderFile);
  btnNewFileClose.addEventListener('click', closeNewFileModal);
  btnNewFileCancel.addEventListener('click', closeNewFileModal);
  newFileModal.addEventListener('click', (e) => {
    if (e.target === newFileModal) closeNewFileModal();
  });
  newFileNameInput.addEventListener('input', () => {
    if (!newFileError.hidden) {
      newFileError.hidden = true;
      newFileError.textContent = '';
    }
  });

  // --- 10. View Toggles ---
  btnToggleView.addEventListener('click', () => {
    if (splitPane.classList.contains('word-mode')) {
      // Leaving word mode lands in the actual split view — editor-only is
      // untouched here or the button labeled "분할 뷰" would show editor-only.
      splitPane.classList.remove('word-mode', 'editor-only');
    } else {
      splitPane.classList.toggle('editor-only');
    }
    btnToggleView.classList.add('active');
    btnViewWord.classList.remove('active');
  });

  btnViewWord.addEventListener('click', () => {
    const isWordMode = splitPane.classList.contains('word-mode');
    if (isWordMode) {
      splitPane.classList.remove('word-mode');
      btnViewWord.classList.remove('active');
      btnToggleView.classList.add('active');
      showToast('나란히 보기(분할 뷰) 모드로 전환되었습니다.', 'info');
    } else {
      splitPane.classList.remove('editor-only');
      splitPane.classList.add('word-mode');
      btnViewWord.classList.add('active');
      btnToggleView.classList.remove('active');
      showToast('MS Word 스타일 문서 편집 모드로 전환되었습니다.', 'info');
    }
  });

  // --- 10b. Split-View Scroll Sync ---
  //
  // Proportional rather than line-mapped: a rendered image occupies one line
  // of markdown but a large block of preview, so matching scroll *fractions*
  // tracks far better than trying to pair source lines to rendered nodes.
  let syncingScroll = false;

  function syncScroll(from, to) {
    if (syncingScroll) return;
    const fromMax = from.scrollHeight - from.clientHeight;
    const toMax = to.scrollHeight - to.clientHeight;
    if (fromMax <= 0 || toMax <= 0) return;
    syncingScroll = true;
    to.scrollTop = (from.scrollTop / fromMax) * toMax;
    // Released next frame — assigning scrollTop fires the other pane's
    // scroll event, which would otherwise bounce straight back.
    requestAnimationFrame(() => { syncingScroll = false; });
  }

  function splitViewActive() {
    return !splitPane.classList.contains('editor-only') && !splitPane.classList.contains('word-mode');
  }

  editor.addEventListener('scroll', () => {
    if (splitViewActive()) syncScroll(editor, preview);
  });
  preview.addEventListener('scroll', () => {
    if (splitViewActive()) syncScroll(preview, editor);
  });

  // --- 11. Theme Toggle ---
  btnThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    btnThemeToggle.innerHTML = theme === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  // --- 12. Toast Notification System ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    // textContent, not innerHTML — messages interpolate user-controlled
    // strings (document titles), and this must not be an injection sink.
    const iconEl = document.createElement('i');
    iconEl.className = `fa-solid ${icon}`;
    const spanEl = document.createElement('span');
    spanEl.textContent = message;
    toast.appendChild(iconEl);
    toast.appendChild(spanEl);
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- 13. Electron Menu Command Bridge ---
  function setupMenuCommandListener() {
    if (!window.gijoDesktop || typeof window.gijoDesktop.onMenuCommand !== 'function') return;
    window.gijoDesktop.onMenuCommand((command) => {
      switch (command) {
        case 'new-doc': createNewDocument(); break;
        // main.js maps CmdOrCtrl+S to 'export-md'; leave the Electron menu intact
        // and route it through triggerSaveShortcut() so Ctrl+S runs once here.
        case 'export-md': triggerSaveShortcut(); break;
        case 'export-html': handleExport('html'); break;
        case 'export-pdf': handleExport('pdf'); break;
        case 'export-docx': handleExport('docx'); break;
        case 'word-mode': btnViewWord.click(); break;
        case 'toggle-view': btnToggleView.click(); break;
      }
    });
  }

  // --- 14. Legacy Single-Document Fallback (only if IndexedDB is unavailable) ---
  function loadLegacyFallback() {
    document.body.classList.add('storage-unavailable');
    const savedTitle = localStorage.getItem(LEGACY_KEY_TITLE);
    if (savedTitle) docTitleInput.value = savedTitle;

    const savedContent = localStorage.getItem(LEGACY_KEY_CONTENT);
    if (savedContent) {
      editor.value = savedContent;
    } else {
      docTitleInput.value = DOC_TEMPLATES.bug.title;
      editor.value = DOC_TEMPLATES.bug.content;
    }
    updatePreview();
  }

  // --- 15. Init ---
  async function initApp() {
    try {
      loadTheme();
      loadSidebarState();
      setMobileView('write');
      setupMenuCommandListener();

      await GijoStorage.runMigrationIfNeeded();
      storageAvailable = GijoStorage.isAvailable();

      if (storageAvailable) {
        await applyRecoveryIfAny();
        let docs = await GijoStorage.getAllDocuments();
        if (docs.length === 0) {
          docs = [await GijoStorage.createDocument({ title: DOC_TEMPLATES.bug.title, content: DOC_TEMPLATES.bug.content })];
        }
        docs.forEach((doc) => {
          if (doc.fileHandle && doc.fileDirty) dirtyLinkedDocIds.add(doc.id);
        });
        currentDocId = docs[0].id;
        currentFileMeta = extractFileMeta(docs[0]);
        docTitleInput.value = docs[0].title;
        editor.value = docs[0].content;
        if (window.GijoFiles && GijoFiles.isFolderSupported() && typeof GijoStorage.getSavedFolderHandle === 'function') {
          savedFolderHandle = await GijoStorage.getSavedFolderHandle();
        }
        updatePreview();
        updateFileTagUI();
        updateFolderFeatureUI();
        renderDocumentList();
      } else {
        loadLegacyFallback();
        updateFileTagUI();
        updateFolderFeatureUI();
        showToast('이 브라우저에서는 문서함 기능을 사용할 수 없어 단일 문서 모드로 동작합니다.', 'warning');
      }
    } finally {
      resolveInitReady();
    }
  }

  initApp();
});
