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

  // Buttons
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyMd = document.getElementById('btn-copy-md');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnToggleView = document.getElementById('btn-toggle-view');
  const btnViewWord = document.getElementById('btn-view-word');

  // Initialize marked.js options
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

  function loadSavedData() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const savedTitle = localStorage.getItem(STORAGE_KEY_TITLE);
    if (savedTitle) docTitleInput.value = savedTitle;

    const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);
    if (savedContent) {
      editor.value = savedContent;
    } else {
      // Default initial template if empty
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

    // Update Metrics
    charCount.textContent = `${text.length.toLocaleString()} 자`;

    // Count Base64 / Image Tags
    const imgMatches = text.match(/!\[.*?\]\(data:image\/.*?;base64,.*?\)|!\[.*?\]\(.*?\)/g);
    const count = imgMatches ? imgMatches.length : 0;
    imageCount.innerHTML = `<i class="fa-solid fa-image"></i> 이미지 ${count}개`;

    autoSave();
  }

  editor.addEventListener('input', updatePreview);
  docTitleInput.addEventListener('input', autoSave);

  // --- 3. Clipboard & Drag-and-Drop Image Handling ---
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

    showToast('이미지 변환 중...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const imgMarkdown = `\n\n![캡처이미지_${timeStamp}](${base64Data})\n\n`;

      insertAtCursor(editor, imgMarkdown);
      showToast('이미지가 마크다운에 성공적으로 붙여넣어졌습니다!', 'success');
    };
    reader.readAsDataURL(file);
  }

  // Clipboard Paste Intercept (Ctrl + V)
  editor.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let hasImage = false;

    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        hasImage = true;
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
      for (let file of files) {
        processImageFile(file);
      }
    }
  });

  // Image File Picker Input
  imageFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let file of files) {
        processImageFile(file);
      }
    }
    imageFileInput.value = ''; // Reset input
  });

  // --- 4. Toolbar Actions ---
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

  // --- 5. Template Buttons ---
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

  // --- 6. Export & Copy Features ---
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

  btnClear.addEventListener('click', () => {
    if (confirm('모든 내용을 초기화하시겠습니까?')) {
      editor.value = '';
      docTitleInput.value = '개발 요청 및 기술 문서';
      updatePreview();
      showToast('에디터가 초기화되었습니다.', 'info');
    }
  });

  // View Toggle (Split Pane vs Editor Only)
  btnToggleView.addEventListener('click', () => {
    splitPane.classList.remove('word-mode');
    splitPane.classList.toggle('editor-only');
    btnToggleView.classList.add('active');
    btnViewWord.classList.remove('active');
  });

  // MS Word Document View Mode Toggle
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

  // Toast Notification System
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

  // Load Saved Data on Startup
  loadSavedData();
});
