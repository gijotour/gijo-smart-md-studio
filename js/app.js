document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const appContainer = document.getElementById('app');
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const docTitleInput = document.getElementById('document-title');
  const charCount = document.getElementById('char-count');
  const wordCount = document.getElementById('word-count');
  const readTime = document.getElementById('read-time');
  const imageCount = document.getElementById('image-count');
  const saveTime = document.getElementById('save-time');
  const splitPane = document.getElementById('split-pane');
  const dropOverlay = document.getElementById('drop-overlay');
  const toastContainer = document.getElementById('toast-container');
  const imageFileInput = document.getElementById('image-file-input');
  const selectImgMaxWidth = document.getElementById('select-img-maxwidth');

  // Header Buttons
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyMd = document.getElementById('btn-copy-md');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  
  // Toolbar Buttons
  const btnToggleView = document.getElementById('btn-toggle-view');
  const btnViewWord = document.getElementById('btn-view-word');
  const btnTableModal = document.getElementById('btn-table-modal');
  const btnInsertMermaid = document.getElementById('btn-insert-mermaid');
  const btnInsertDetails = document.getElementById('btn-insert-details');
  const btnToggleSearch = document.getElementById('btn-toggle-search');
  const btnToggleOutline = document.getElementById('btn-toggle-outline');

  // Compact Mode & Font Zoom Elements
  const btnCompactMode = document.getElementById('btn-compact-mode');
  const btnFontSmaller = document.getElementById('btn-font-smaller');
  const btnFontLarger = document.getElementById('btn-font-larger');

  // Search Panel Elements
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  const replaceInput = document.getElementById('replace-input');
  const searchCount = document.getElementById('search-count');
  const btnFindNext = document.getElementById('btn-find-next');
  const btnFindPrev = document.getElementById('btn-find-prev');
  const btnReplace = document.getElementById('btn-replace');
  const btnReplaceAll = document.getElementById('btn-replace-all');
  const btnCloseSearch = document.getElementById('btn-close-search');

  // Outline Elements
  const outlineDrawer = document.getElementById('outline-drawer');
  const outlineList = document.getElementById('outline-list');
  const btnCloseOutline = document.getElementById('btn-close-outline');

  // Table Modal Elements
  const modalTable = document.getElementById('modal-table');
  const tableRowsInput = document.getElementById('table-rows');
  const tableColsInput = document.getElementById('table-cols');
  const tableHeaderCheck = document.getElementById('table-header-check');
  const btnInsertTable = document.getElementById('btn-insert-table');
  const btnCancelTable = document.getElementById('btn-cancel-table');
  const btnCloseTableModal = document.getElementById('btn-close-table-modal');

  // Mermaid Initialization
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose'
    });
  }

  // Marked.js Setup
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // --- 1. State & Storage Management ---
  const STORAGE_KEY_CONTENT = 'gijo_md_studio_content';
  const STORAGE_KEY_TITLE = 'gijo_md_studio_title';
  const STORAGE_KEY_THEME = 'gijo_md_studio_theme';
  const STORAGE_KEY_COMPACT = 'gijo_md_studio_compact';
  const STORAGE_KEY_FONT_SIZE = 'gijo_md_studio_fontsize';

  let currentFontSize = parseFloat(localStorage.getItem(STORAGE_KEY_FONT_SIZE) || '13.5');

  function loadSavedData() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const isCompact = localStorage.getItem(STORAGE_KEY_COMPACT) === 'true';
    if (isCompact) {
      appContainer.classList.add('compact-mode');
      btnCompactMode.classList.add('active');
    }

    applyFontSize(currentFontSize);

    const savedTitle = localStorage.getItem(STORAGE_KEY_TITLE);
    if (savedTitle) docTitleInput.value = savedTitle;

    const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);
    if (savedContent) {
      editor.value = savedContent;
    } else {
      loadTemplate('bug');
    }
    updatePreview();
  }

  function autoSave() {
    localStorage.setItem(STORAGE_KEY_CONTENT, editor.value);
    localStorage.setItem(STORAGE_KEY_TITLE, docTitleInput.value);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    saveTime.textContent = `저장됨 (${timeStr})`;
  }

  // --- Font Size & Compact Mode Controls ---
  function applyFontSize(size) {
    currentFontSize = Math.max(12, Math.min(24, size));
    editor.style.fontSize = `${currentFontSize}px`;
    preview.style.fontSize = `${currentFontSize}px`;
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, currentFontSize);
  }

  btnFontSmaller.addEventListener('click', () => {
    applyFontSize(currentFontSize - 1);
    showToast(`글자 크기: ${currentFontSize}px`, 'info');
  });

  btnFontLarger.addEventListener('click', () => {
    applyFontSize(currentFontSize + 1);
    showToast(`글자 크기: ${currentFontSize}px`, 'info');
  });

  btnCompactMode.addEventListener('click', () => {
    const isCompact = appContainer.classList.toggle('compact-mode');
    btnCompactMode.classList.toggle('active', isCompact);
    localStorage.setItem(STORAGE_KEY_COMPACT, isCompact);
    showToast(isCompact ? '컴팩트 레이아웃 모드가 활성화되었습니다.' : '기본 레이아웃 모드로 전환되었습니다.', 'info');
  });

  // --- 2. Live Preview & Syntax Highlighting ---
  let mermaidRenderTimeout = null;

  function updatePreview() {
    const text = editor.value;
    
    // Render Markdown to HTML
    if (window.marked) {
      preview.innerHTML = marked.parse(text);
    } else {
      preview.innerText = text;
    }

    // Code Syntax Highlighting via Highlight.js
    if (window.hljs) {
      preview.querySelectorAll('pre code').forEach((block) => {
        if (!block.classList.contains('language-mermaid')) {
          hljs.highlightElement(block);
        }
      });
    }

    // Mermaid Diagram Rendering
    if (window.mermaid) {
      clearTimeout(mermaidRenderTimeout);
      mermaidRenderTimeout = setTimeout(() => {
        const mermaidBlocks = preview.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid');
        mermaidBlocks.forEach((codeBlock) => {
          const pre = codeBlock.parentElement;
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          mermaidDiv.textContent = codeBlock.textContent;
          pre.replaceWith(mermaidDiv);
        });

        const newMermaidElements = preview.querySelectorAll('.mermaid');
        if (newMermaidElements.length > 0) {
          mermaid.run({ nodes: newMermaidElements }).catch(err => {
            console.warn('Mermaid rendering error:', err);
          });
        }
      }, 300);
    }

    // Update Metrics
    charCount.textContent = `${text.length.toLocaleString()} 자`;
    
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wCount = words.length;
    wordCount.textContent = `${wCount.toLocaleString()} 단어`;
    
    const minutes = Math.ceil(wCount / 200);
    readTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${minutes < 1 ? '1분 미만' : minutes + '분 읽기'}`;

    // Count Base64 / Image Tags
    const imgMatches = text.match(/!\[.*?\]\(data:image\/.*?;base64,.*?\)|!\[.*?\]\(.*?\)/g);
    const count = imgMatches ? imgMatches.length : 0;
    imageCount.innerHTML = `<i class="fa-solid fa-image"></i> 이미지 ${count}개`;

    // Update Outline Drawer
    updateOutlineList();

    autoSave();
  }

  editor.addEventListener('input', updatePreview);
  docTitleInput.addEventListener('input', autoSave);

  // --- 3. Clipboard & Drag-and-Drop Image Handling (With Optimization) ---
  function insertAtCursor(textarea, textToInsert) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    textarea.value = before + textToInsert + after;
    textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    textarea.focus();
    updatePreview();
  }

  function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 붙여넣을 수 있습니다.', 'warning');
      return;
    }

    const maxWidth = parseInt(selectImgMaxWidth.value, 10);
    showToast('이미지 변환 및 최적화 중...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let finalDataUrl = e.target.result;

        if (maxWidth > 0 && img.width > maxWidth) {
          const canvas = document.createElement('canvas');
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          finalDataUrl = canvas.toDataURL('image/png', 0.85);
        }

        const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const imgMarkdown = `\n\n![캡처이미지_${timeStamp}](${finalDataUrl})\n\n`;

        insertAtCursor(editor, imgMarkdown);
        showToast('이미지가 성공적으로 변환 및 최적화 삽입되었습니다!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Clipboard Paste Intercept (Ctrl + V)
  editor.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        processImageFile(file);
        e.preventDefault();
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let file of files) {
        processImageFile(file);
      }
    }
  });

  imageFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let file of files) {
        processImageFile(file);
      }
    }
    imageFileInput.value = '';
  });

  // --- 4. Toolbar Formatting Actions ---
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
    }
    insertAtCursor(editor, replacement);
  }

  // Details Collapsible Fold Block Insert
  btnInsertDetails.addEventListener('click', () => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);

    const detailsTemplate = `\n<details>\n<summary>▶ ${selected || '상세 내용 접기/펼치기 (클릭)'}</summary>\n\n여기에 접어둘 숨김 내용을 입력하세요.\n\n</details>\n`;
    insertAtCursor(editor, detailsTemplate);
    showToast('접기/펼치기(Details) 블록이 삽입되었습니다!', 'info');
  });

  // Mermaid Diagram Insert
  btnInsertMermaid.addEventListener('click', () => {
    const sampleMermaid = `\n\`\`\`mermaid
graph TD
    A[사용자 요청] --> B{시스템 검증}
    B -- 성공 --> C[마크다운 문서 생성]
    B -- 실패 --> D[에러 메시지 출력]
    C --> E[Base64 이미지 자동 내장]
\`\`\`\n`;
    insertAtCursor(editor, sampleMermaid);
    showToast('Mermaid 다이어그램 예시가 삽입되었습니다!', 'info');
  });

  // --- 5. Table Generator Modal & Dismiss Handling ---
  btnTableModal.addEventListener('click', () => {
    modalTable.classList.remove('hidden');
  });

  function closeModalTable() {
    modalTable.classList.add('hidden');
  }

  [btnCancelTable, btnCloseTableModal].forEach(b => {
    b.addEventListener('click', closeModalTable);
  });

  // Backdrop click to close modal
  modalTable.addEventListener('click', (e) => {
    if (e.target === modalTable) {
      closeModalTable();
    }
  });

  btnInsertTable.addEventListener('click', () => {
    const rows = parseInt(tableRowsInput.value, 10) || 3;
    const cols = parseInt(tableColsInput.value, 10) || 3;
    const hasHeader = tableHeaderCheck.checked;

    let tableMd = '\n';
    
    if (hasHeader) {
      let headerRow = '|';
      let alignRow = '|';
      for (let c = 1; c <= cols; c++) {
        headerRow += ` 헤더 ${c} |`;
        alignRow += ' --- |';
      }
      tableMd += `${headerRow}\n${alignRow}\n`;
    }

    for (let r = 1; r <= rows; r++) {
      let rowStr = '|';
      for (let c = 1; c <= cols; c++) {
        rowStr += ` 데이터 ${r}-${c} |`;
      }
      tableMd += `${rowStr}\n`;
    }
    tableMd += '\n';

    insertAtCursor(editor, tableMd);
    closeModalTable();
    showToast(`${rows}x${cols} 표가 성공적으로 생성되었습니다!`, 'success');
  });

  // Esc Key Global Dismiss Handler
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalTable.classList.contains('hidden')) {
        closeModalTable();
      }
      if (!searchPanel.classList.contains('hidden')) {
        searchPanel.classList.add('hidden');
      }
      if (!outlineDrawer.classList.contains('hidden')) {
        outlineDrawer.classList.add('hidden');
      }
    }
  });

  // --- 6. Find & Replace System ---
  let searchMatches = [];
  let currentMatchIdx = -1;

  function toggleSearchPanel() {
    searchPanel.classList.toggle('hidden');
    if (!searchPanel.classList.contains('hidden')) {
      searchInput.focus();
      performSearch();
    }
  }

  btnToggleSearch.addEventListener('click', toggleSearchPanel);
  btnCloseSearch.addEventListener('click', () => searchPanel.classList.add('hidden'));

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      toggleSearchPanel();
    }
  });

  function performSearch() {
    const query = searchInput.value;
    if (!query) {
      searchCount.textContent = '0/0';
      searchMatches = [];
      currentMatchIdx = -1;
      return;
    }

    const text = editor.value;
    searchMatches = [];
    let idx = text.indexOf(query);
    while (idx !== -1) {
      searchMatches.push(idx);
      idx = text.indexOf(query, idx + query.length);
    }

    if (searchMatches.length > 0) {
      if (currentMatchIdx < 0 || currentMatchIdx >= searchMatches.length) {
        currentMatchIdx = 0;
      }
      searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
      highlightMatch(currentMatchIdx);
    } else {
      searchCount.textContent = '0/0';
      currentMatchIdx = -1;
    }
  }

  function highlightMatch(index) {
    if (index < 0 || index >= searchMatches.length) return;
    const pos = searchMatches[index];
    const len = searchInput.value.length;

    editor.focus();
    editor.setSelectionRange(pos, pos + len);
  }

  searchInput.addEventListener('input', performSearch);

  btnFindNext.addEventListener('click', () => {
    if (searchMatches.length === 0) return;
    currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
    searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
    highlightMatch(currentMatchIdx);
  });

  btnFindPrev.addEventListener('click', () => {
    if (searchMatches.length === 0) return;
    currentMatchIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
    highlightMatch(currentMatchIdx);
  });

  btnReplace.addEventListener('click', () => {
    if (currentMatchIdx < 0 || searchMatches.length === 0) return;
    const query = searchInput.value;
    const rep = replaceInput.value;
    const pos = searchMatches[currentMatchIdx];

    const text = editor.value;
    editor.value = text.substring(0, pos) + rep + text.substring(pos + query.length);
    performSearch();
    updatePreview();
  });

  btnReplaceAll.addEventListener('click', () => {
    const query = searchInput.value;
    if (!query) return;
    const rep = replaceInput.value;
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    editor.value = editor.value.replace(regex, rep);
    performSearch();
    updatePreview();
    showToast(`'${query}' 단어를 모두 바꾸었습니다!`, 'success');
  });

  // --- 7. Outline TOC Side Drawer ---
  btnToggleOutline.addEventListener('click', () => {
    outlineDrawer.classList.toggle('hidden');
  });

  btnCloseOutline.addEventListener('click', () => {
    outlineDrawer.classList.add('hidden');
  });

  function updateOutlineList() {
    const text = editor.value;
    const lines = text.split('\n');
    const headings = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        headings.push({ level, title });
      }
    });

    outlineList.innerHTML = '';

    if (headings.length === 0) {
      outlineList.innerHTML = '<li class="empty-outline">작성된 제목이 없습니다.</li>';
      return;
    }

    headings.forEach((h) => {
      const li = document.createElement('li');
      li.className = `outline-item h${h.level}`;
      li.innerHTML = `<i class="fa-solid fa-angle-right"></i> ${h.title}`;
      li.addEventListener('click', () => {
        const pos = editor.value.indexOf(h.title);
        if (pos !== -1) {
          editor.focus();
          editor.setSelectionRange(pos, pos + h.title.length);
        }
      });
      outlineList.appendChild(li);
    });
  }

  // --- 8. Export Features (.md, .html, PDF/Print) ---
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

  btnExportMd.addEventListener('click', () => {
    const content = editor.value;
    const title = docTitleInput.value.trim() || 'markdown_doc';
    const fileName = `${title.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.md`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`'${fileName}' 다운로드 완료!`, 'success');
  });

  btnExportHtml.addEventListener('click', () => {
    const title = docTitleInput.value.trim() || '문서';
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: 1em 0; }
    pre { background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'Fira Code', monospace; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #666; }
    details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin: 1em 0; }
    summary { font-weight: bold; cursor: pointer; color: #4f46e5; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <hr>
  ${preview.innerHTML}
</body>
</html>`;

    const fileName = `${title.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.html`;
    const blob = new Blob([htmlContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`'${fileName}' HTML 내보내기 완료!`, 'success');
  });

  btnExportPdf.addEventListener('click', () => {
    showToast('인쇄 창을 엽니다. "PDF로 저장"을 선택하세요.', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  });

  // Clear Editor
  btnClear.addEventListener('click', () => {
    if (confirm('모든 내용을 초기화하시겠습니까?')) {
      editor.value = '';
      docTitleInput.value = '개발 요청 및 기술 문서';
      updatePreview();
      showToast('에디터가 초기화되었습니다.', 'info');
    }
  });

  // Templates
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-template');
      if (confirm('현재 작성 중인 내용이 템플릿으로 대체됩니다. 진행하시겠습니까?')) {
        loadTemplate(key);
      }
    });
  });

  function loadTemplate(key) {
    if (DOC_TEMPLATES[key]) {
      docTitleInput.value = DOC_TEMPLATES[key].title;
      editor.value = DOC_TEMPLATES[key].content;
      updatePreview();
      showToast(`'${DOC_TEMPLATES[key].title}' 템플릿 적용 완료`, 'success');
    }
  }

  // Views Toggle
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

  // Theme Toggle
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

  // Toast System
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

  // Load Saved Data
  loadSavedData();
});
