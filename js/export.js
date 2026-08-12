// All four export formats. Global-script module (window.GijoExport),
// mirroring templates.js/storage.js. Every format reads the ALREADY-SANITIZED
// #preview.innerHTML (see updatePreview() in app.js) rather than re-running
// marked.parse() independently — structurally impossible for an export path
// to forget sanitization.
const GijoExport = (() => {
  let printCssCache = null;

  function sanitizeFilename(title) {
    return (title || 'markdown_doc').trim().replace(/[^a-zA-Z0-9가-힣_-]/g, '_') || 'markdown_doc';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getPreviewHtml() {
    const previewEl = document.getElementById('preview');
    return previewEl ? previewEl.innerHTML : '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  async function loadPrintCss() {
    if (printCssCache !== null) return printCssCache;
    try {
      const res = await fetch('css/print.css');
      printCssCache = res.ok ? await res.text() : '';
    } catch (err) {
      console.warn('Could not inline css/print.css into HTML export:', err);
      printCssCache = '';
    }
    return printCssCache;
  }

  function exportMarkdown(content, title) {
    if (!content.trim()) return { ok: false, reason: 'empty' };
    const filename = `${sanitizeFilename(title)}.md`;
    downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8;' }), filename);
    return { ok: true, filename };
  }

  async function exportHtml(title) {
    const bodyHtml = getPreviewHtml();
    if (!bodyHtml.trim()) return { ok: false, reason: 'empty' };
    const css = await loadPrintCss();
    const doc = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<div class="markdown-body">${bodyHtml}</div>
</body>
</html>
`;
    const filename = `${sanitizeFilename(title)}.html`;
    downloadBlob(new Blob([doc], { type: 'text/html;charset=utf-8;' }), filename);
    return { ok: true, filename };
  }

  async function exportPdf(title) {
    if (!getPreviewHtml().trim()) return { ok: false, reason: 'empty' };

    if (window.gijoDesktop && window.gijoDesktop.isElectron) {
      const bytes = await window.gijoDesktop.exportPdf();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `${sanitizeFilename(title)}.pdf`);
      return { ok: true };
    }

    // Web build: css/print.css is already linked with media="print" in
    // index.html, so the browser's native print dialog (→ "Save as PDF")
    // picks it up automatically. Deferred a beat so the caller's guidance
    // toast ("PDF로 저장을 선택하세요") renders BEFORE the blocking dialog
    // opens — synchronous window.print() would show it only afterwards.
    setTimeout(() => window.print(), 150);
    return { ok: true, viaPrint: true };
  }

  async function exportDocx(title) {
    const bodyHtml = getPreviewHtml();
    if (!bodyHtml.trim()) return { ok: false, reason: 'empty' };
    if (typeof window.HTMLToDOCX !== 'function') {
      return { ok: false, reason: 'lib-missing' };
    }
    const wrapped = `<!DOCTYPE html><html><body>${bodyHtml}</body></html>`;
    const result = await window.HTMLToDOCX(wrapped, null, {
      title: title || 'Markdown Document',
      creator: 'GIJO Smart MD Studio',
    });
    const blob = result instanceof Blob
      ? result
      : new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
    return { ok: true };
  }

  // downloadBlob is shared with app.js's backup export — the same
  // blob + <a download> mechanism every format here already uses.
  return { exportMarkdown, exportHtml, exportPdf, exportDocx, downloadBlob };
})();

window.GijoExport = GijoExport;
