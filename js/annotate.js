// Screenshot annotation editor. Global-script module (window.GijoAnnotate),
// matching the pattern used by templates.js / storage.js / export.js.
//
// Opened by clicking an image in the preview pane. Returns a Promise that
// resolves to a new data URL when the user saves, or null when they cancel.
//
// Drawing model: the base image plus an ordered list of operations, redrawn
// from scratch on every change. Undo is just popping an op — no ImageData
// snapshot stack, which at screenshot resolutions would cost ~8MB per step.
const GijoAnnotate = (() => {
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#0f172a', '#ffffff'];
  const MOSAIC_BLOCK = 12; // px, in image space
  const LINE_WIDTH = 4;
  const FONT_SIZE = 24;

  let modal, canvas, ctx, toolbarEl, colorsEl;
  let baseImage = null;
  let ops = [];
  let tool = 'arrow';
  let color = COLORS[0];
  let drag = null; // {startX, startY, curX, curY}
  let resolveFn = null;
  let outputMime = 'image/png';

  function buildDom() {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'modal-overlay annotate-overlay';
    modal.id = 'annotate-modal';
    modal.innerHTML = `
      <div class="modal-box annotate-box">
        <div class="modal-header">
          <span><i class="fa-solid fa-pen-ruler"></i> 이미지 주석</span>
          <button class="btn btn-icon" data-annotate-action="cancel" title="닫기" aria-label="닫기">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="annotate-toolbar">
          <div class="toolbar-group" id="annotate-tools">
            <button class="tb-btn" data-tool="arrow" title="화살표"><i class="fa-solid fa-arrow-up-right-from-square"></i> 화살표</button>
            <button class="tb-btn" data-tool="box" title="사각형"><i class="fa-regular fa-square"></i> 사각형</button>
            <button class="tb-btn" data-tool="text" title="텍스트"><i class="fa-solid fa-font"></i> 텍스트</button>
            <button class="tb-btn" data-tool="mosaic" title="모자이크 (민감정보 가리기)"><i class="fa-solid fa-eye-slash"></i> 모자이크</button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="annotate-colors" id="annotate-colors"></div>
          <div class="toolbar-divider"></div>
          <button class="tb-btn" data-annotate-action="undo" title="실행 취소"><i class="fa-solid fa-rotate-left"></i> 실행 취소</button>
          <div class="annotate-actions">
            <button class="btn btn-secondary" data-annotate-action="cancel">취소</button>
            <button class="btn btn-success" data-annotate-action="save"><i class="fa-solid fa-check"></i> 적용</button>
          </div>
        </div>
        <div class="annotate-canvas-wrap">
          <canvas id="annotate-canvas"></canvas>
        </div>
        <div class="annotate-hint">
          도구를 고른 뒤 이미지 위에서 드래그하세요. 텍스트 도구는 원하는 위치를 클릭하면 입력창이 열립니다.
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    canvas = modal.querySelector('#annotate-canvas');
    ctx = canvas.getContext('2d');
    toolbarEl = modal.querySelector('#annotate-tools');
    colorsEl = modal.querySelector('#annotate-colors');

    COLORS.forEach((c) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'annotate-color';
      swatch.style.backgroundColor = c;
      swatch.dataset.color = c;
      swatch.title = `색상 ${c}`;
      swatch.setAttribute('aria-label', `색상 ${c}`);
      colorsEl.appendChild(swatch);
    });

    toolbarEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tool]');
      if (!btn) return;
      tool = btn.dataset.tool;
      syncToolbar();
    });

    colorsEl.addEventListener('click', (e) => {
      const swatch = e.target.closest('.annotate-color');
      if (!swatch) return;
      color = swatch.dataset.color;
      syncToolbar();
    });

    modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-annotate-action]');
      if (action) {
        const name = action.dataset.annotateAction;
        if (name === 'undo') { ops.pop(); redraw(); }
        else if (name === 'save') finish(canvas.toDataURL(outputMime, 0.92));
        else if (name === 'cancel') finish(null);
        return;
      }
      if (e.target === modal) finish(null);
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function syncToolbar() {
    toolbarEl.querySelectorAll('[data-tool]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
    colorsEl.querySelectorAll('.annotate-color').forEach((s) => {
      s.classList.toggle('active', s.dataset.color === color);
    });
  }

  // Client coords → image-space coords (the canvas is displayed scaled down
  // to fit the modal, but every op is stored at the image's real resolution).
  function toImageCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onPointerDown(e) {
    const p = toImageCoords(e);
    if (tool === 'text') {
      const text = window.prompt('추가할 텍스트를 입력하세요:');
      if (text && text.trim()) {
        ops.push({ type: 'text', x: p.x, y: p.y, text: text.trim(), color });
        redraw();
      }
      return;
    }
    canvas.setPointerCapture?.(e.pointerId);
    drag = { startX: p.x, startY: p.y, curX: p.x, curY: p.y };
  }

  function onPointerMove(e) {
    if (!drag) return;
    const p = toImageCoords(e);
    drag.curX = p.x;
    drag.curY = p.y;
    redraw();
  }

  function onPointerUp() {
    if (!drag) return;
    const { startX, startY, curX, curY } = drag;
    drag = null;
    // Ignore stray clicks that produced no meaningful shape.
    if (Math.abs(curX - startX) < 4 && Math.abs(curY - startY) < 4) { redraw(); return; }
    ops.push({ type: tool, x1: startX, y1: startY, x2: curX, y2: curY, color });
    redraw();
  }

  function drawArrow(c, x1, y1, x2, y2, strokeColor) {
    const headLen = Math.max(14, LINE_WIDTH * 4);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = strokeColor;
    c.fillStyle = strokeColor;
    c.lineWidth = LINE_WIDTH;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    c.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fill();
  }

  function drawBox(c, x1, y1, x2, y2, strokeColor) {
    c.strokeStyle = strokeColor;
    c.lineWidth = LINE_WIDTH;
    c.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  // Pixelate by downscaling the region and blowing it back up. Samples from
  // the canvas as already drawn, so it always covers what is underneath it.
  function drawMosaic(c, x1, y1, x2, y2) {
    const x = Math.round(Math.min(x1, x2));
    const y = Math.round(Math.min(y1, y2));
    const w = Math.round(Math.abs(x2 - x1));
    const h = Math.round(Math.abs(y2 - y1));
    if (w < 2 || h < 2) return;

    const smallW = Math.max(1, Math.round(w / MOSAIC_BLOCK));
    const smallH = Math.max(1, Math.round(h / MOSAIC_BLOCK));
    const tmp = document.createElement('canvas');
    tmp.width = smallW;
    tmp.height = smallH;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(canvas, x, y, w, h, 0, 0, smallW, smallH);

    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(tmp, 0, 0, smallW, smallH, x, y, w, h);
    c.restore();
  }

  function drawText(c, x, y, text, fillColor) {
    c.font = `700 ${FONT_SIZE}px -apple-system, "Segoe UI", "Malgun Gothic", sans-serif`;
    c.textBaseline = 'top';
    // Outline first so the label stays readable over any background.
    c.lineWidth = 4;
    c.strokeStyle = fillColor === '#ffffff' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';
    c.strokeText(text, x, y);
    c.fillStyle = fillColor;
    c.fillText(text, x, y);
  }

  function applyOp(op) {
    if (op.type === 'arrow') drawArrow(ctx, op.x1, op.y1, op.x2, op.y2, op.color);
    else if (op.type === 'box') drawBox(ctx, op.x1, op.y1, op.x2, op.y2, op.color);
    else if (op.type === 'mosaic') drawMosaic(ctx, op.x1, op.y1, op.x2, op.y2);
    else if (op.type === 'text') drawText(ctx, op.x, op.y, op.text, op.color);
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    ops.forEach(applyOp);
    if (drag) {
      applyOp({ type: tool, x1: drag.startX, y1: drag.startY, x2: drag.curX, y2: drag.curY, color });
    }
  }

  function finish(dataUrl) {
    modal.classList.remove('open');
    canvas.width = canvas.height = 0; // release the backing store
    baseImage = null;
    ops = [];
    drag = null;
    const done = resolveFn;
    resolveFn = null;
    if (done) done(dataUrl);
  }

  function onKeydown(e) {
    if (!modal || !modal.classList.contains('open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); ops.pop(); redraw(); }
  }

  function open(dataUrl) {
    buildDom();
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        ops = [];
        drag = null;
        tool = 'arrow';
        color = COLORS[0];
        outputMime = /^data:(image\/[a-z+]+)/.exec(dataUrl)?.[1] || 'image/png';
        // JPEG has no alpha; re-encoding a transparent source as JPEG would
        // blacken it, so annotated output of anything else stays PNG.
        if (outputMime !== 'image/jpeg') outputMime = 'image/png';
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        syncToolbar();
        redraw();
        resolveFn = resolve;
        modal.classList.add('open');
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  document.addEventListener('keydown', onKeydown, true);

  return { open };
})();

window.GijoAnnotate = GijoAnnotate;
