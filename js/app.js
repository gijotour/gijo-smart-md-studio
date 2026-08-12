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
  const documentListEl = document.getElementById('document-list');
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
  const btnExportToggle = document.getElementById('btn-export-toggle');
  const btnHistoryClose = document.getElementById('btn-history-close');

  // Initialize marked.js options
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // --- 1. State ---
  const STORAGE_KEY_THEME = 'gijo_md_studio_theme';
  const LEGACY_KEY_CONTENT = 'gijo_md_studio_content';
  const LEGACY_KEY_TITLE = 'gijo_md_studio_title';
  const SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1000; // at most one history snapshot per 5 min of active editing
  const MAX_IMAGE_DIMENSION = 1600; // longest edge, px (the bug-report template text mentions 1200px — 1600 is a more modern default for today's high-DPI screenshots; either is a one-line change)
  const JPEG_QUALITY = 0.85;

  let currentDocId = null;
  let storageAvailable = true;
  let autoSaveTimer = null;
  const lastSnapshotAt = {}; // docId -> timestamp

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

    charCount.textContent = `${text.length.toLocaleString()} 자`;

    const imgMatches = text.match(/!\[.*?\]\(data:image\/.*?;base64,.*?\)|!\[.*?\]\(.*?\)/g);
    const count = imgMatches ? imgMatches.length : 0;
    imageCount.innerHTML = `<i class="fa-solid fa-image"></i> 이미지 ${count}개`;
  }

  editor.addEventListener('input', () => { updatePreview(); scheduleAutoSave(); });
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
    const title = docTitleInput.value;
    const content = editor.value;

    if (!storageAvailable) {
      localStorage.setItem(LEGACY_KEY_CONTENT, content);
      localStorage.setItem(LEGACY_KEY_TITLE, title);
      stampSaveTime();
      return;
    }

    if (!currentDocId) return;
    try {
      await GijoStorage.updateDocumentContent(currentDocId, { title, content });
      await maybeCreateSnapshot(currentDocId, title, content);
      stampSaveTime();
      renderDocumentList();
    } catch (err) {
      console.error('Save failed', err);
      showToast('저장 중 오류가 발생했습니다.', 'warning');
    }
  }

  // The one path that could actually lose user work: a pending debounced
  // save when the user switches documents (or closes the app) before it
  // fires. Called before every switch, and best-effort on beforeunload.
  async function flushCurrentDocument() {
    if (autoSaveTimer) await saveCurrentDocument();
  }

  window.addEventListener('beforeunload', () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      saveCurrentDocument(); // fire-and-forget — beforeunload can't await
    }
  });

  async function switchToDocument(docId, { skipFlush = false } = {}) {
    if (!skipFlush) await flushCurrentDocument();
    const doc = await GijoStorage.getDocument(docId);
    if (!doc) return;

    currentDocId = doc.id;
    docTitleInput.value = doc.title;
    editor.value = doc.content;
    updatePreview();
    renderDocumentList();
  }

  async function createNewDocument(initial = {}) {
    if (!storageAvailable) {
      showToast('이 브라우저에서는 다중 문서 기능을 사용할 수 없습니다.', 'warning');
      return;
    }
    await flushCurrentDocument();
    const doc = await GijoStorage.createDocument({
      title: initial.title || '제목 없는 문서',
      content: initial.content || '',
    });
    await switchToDocument(doc.id, { skipFlush: true });
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
    await GijoStorage.deleteDocument(docId);
    if (wasCurrent) {
      const remaining = await GijoStorage.getAllDocuments();
      await switchToDocument(remaining[0].id, { skipFlush: true });
    } else {
      renderDocumentList();
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

  async function renderDocumentList() {
    if (!storageAvailable) return;
    const docs = await GijoStorage.getAllDocuments();
    documentListEl.innerHTML = '';

    docs.forEach((doc) => {
      const item = document.createElement('div');
      item.className = 'document-item' + (doc.id === currentDocId ? ' active' : '');
      item.dataset.docId = doc.id;

      const info = document.createElement('div');
      info.className = 'document-item-info';
      const titleEl = document.createElement('div');
      titleEl.className = 'document-item-title';
      titleEl.textContent = doc.title || '제목 없는 문서';
      const metaEl = document.createElement('div');
      metaEl.className = 'document-item-meta';
      metaEl.textContent = `${formatRelativeTime(doc.updatedAt)} · 이미지 ${doc.imageCount}개`;
      info.appendChild(titleEl);
      info.appendChild(metaEl);

      const actions = document.createElement('div');
      actions.className = 'document-item-actions';
      actions.appendChild(makeIconButton('fa-clock-rotate-left', '히스토리', () => openHistoryModal(doc.id)));
      actions.appendChild(makeIconButton('fa-copy', '복제', () => handleDuplicateDocument(doc.id)));
      actions.appendChild(makeIconButton('fa-trash', '삭제', () => handleDeleteDocument(doc.id)));

      item.appendChild(info);
      item.appendChild(actions);
      item.addEventListener('click', (e) => {
        if (e.target.closest('.document-item-action')) return;
        if (doc.id !== currentDocId) switchToDocument(doc.id);
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
    if (doc.id === currentDocId) {
      docTitleInput.value = doc.title;
      editor.value = doc.content;
      updatePreview();
    }
    renderDocumentList();
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

    try {
      const finalBlob = await compressImage(file);
      const dataUrl = await blobToDataUrl(finalBlob);
      const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const imgMarkdown = `\n\n![캡처이미지_${timeStamp}](${dataUrl})\n\n`;

      insertAtCursor(editor, imgMarkdown);

      const savedPct = file.size > 0 ? Math.round((1 - finalBlob.size / file.size) * 100) : 0;
      if (finalBlob !== file && savedPct > 0) {
        showToast(`이미지가 ${formatBytes(file.size)} → ${formatBytes(finalBlob.size)}로 압축되어 삽입되었습니다 (${savedPct}%↓)`, 'success');
      } else {
        showToast('이미지가 마크다운에 성공적으로 붙여넣어졌습니다!', 'success');
      }
    } catch (err) {
      console.error('Image processing failed', err);
      showToast('이미지 처리 중 오류가 발생했습니다.', 'warning');
    }
  }

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
  ['dragenter', 'dragover'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropOverlay.classList.add('active');
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
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processImageFiles(Array.from(files));
    }
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
      handleExport(btn.dataset.export);
    });
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
      scheduleAutoSave();
      showToast('에디터가 초기화되었습니다.', 'info');
    }
  });

  // --- 9. Sidebar ---
  btnSidebarToggle.addEventListener('click', () => {
    appBody.classList.toggle('sidebar-collapsed');
  });

  btnNewDoc.addEventListener('click', () => createNewDocument());

  // --- 10. View Toggles ---
  btnToggleView.addEventListener('click', () => {
    splitPane.classList.remove('word-mode');
    splitPane.classList.toggle('editor-only');
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

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
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
        case 'export-md': handleExport('md'); break;
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
    loadTheme();
    setupMenuCommandListener();

    await GijoStorage.runMigrationIfNeeded();
    storageAvailable = GijoStorage.isAvailable();

    if (storageAvailable) {
      let docs = await GijoStorage.getAllDocuments();
      if (docs.length === 0) {
        docs = [await GijoStorage.createDocument({ title: DOC_TEMPLATES.bug.title, content: DOC_TEMPLATES.bug.content })];
      }
      currentDocId = docs[0].id;
      docTitleInput.value = docs[0].title;
      editor.value = docs[0].content;
      updatePreview();
      renderDocumentList();
    } else {
      loadLegacyFallback();
      showToast('이 브라우저에서는 문서함 기능을 사용할 수 없어 단일 문서 모드로 동작합니다.', 'warning');
    }
  }

  initApp();
});
