// Local file open/save via the File System Access API. Global-script module
// (window.GijoFiles), matching storage.js/export.js — no bundler, no ES modules,
// zero external network requests.
const GijoFiles = (() => {
  const FILE_TYPES = [
    {
      description: 'Markdown / 텍스트 파일',
      accept: {
        'text/markdown': ['.md', '.markdown'],
        'text/plain': ['.txt'],
      },
    },
  ];

  // Single feature-detection entry point for the whole app.
  function isSupported() {
    return typeof window !== 'undefined'
      && typeof window.showOpenFilePicker === 'function'
      && typeof window.showSaveFilePicker === 'function';
  }

  function isFolderSupported() {
    return typeof window !== 'undefined'
      && typeof window.showDirectoryPicker === 'function';
  }

  function toUint8Array(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    return new Uint8Array(0);
  }

  // Pure function: decodes raw file bytes into LF-normalized text while
  // remembering BOM, line ending style, and whether EUC-KR fallback was used.
  function decodeBytes(uint8) {
    const bytes = toUint8Array(uint8);
    const hadBom = bytes.length >= 3
      && bytes[0] === 0xEF
      && bytes[1] === 0xBB
      && bytes[2] === 0xBF;
    const payload = hadBom ? bytes.subarray(3) : bytes;

    let encoding = 'utf-8';
    let rawText;
    if (!hadBom) {
      const utf8Text = new TextDecoder('utf-8').decode(payload);
      if (utf8Text.indexOf('\uFFFD') !== -1) {
        try {
          rawText = new TextDecoder('euc-kr').decode(payload);
          encoding = 'euc-kr';
        } catch (_) {
          rawText = utf8Text;
        }
      } else {
        rawText = utf8Text;
      }
    } else {
      rawText = new TextDecoder('utf-8').decode(payload);
    }

    const crlfMatches = rawText.match(/\r\n/g);
    const crlfCount = crlfMatches ? crlfMatches.length : 0;
    const withoutCrlf = crlfCount ? rawText.replace(/\r\n/g, '') : rawText;
    const lfMatches = withoutCrlf.match(/\n/g);
    const lfOnlyCount = lfMatches ? lfMatches.length : 0;
    const lineEnding = (crlfCount > 0 && crlfCount >= lfOnlyCount) ? 'CRLF' : 'LF';

    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return { text, hadBom, encoding, lineEnding };
  }

  // Pure function: encodes LF-normalized editor text back to UTF-8 bytes,
  // restoring the original CRLF/LF line ending and UTF-8 BOM if present.
  function encodeText(text, meta) {
    const opts = meta || {};
    const hadBom = !!opts.hadBom;
    const lineEnding = (opts.lineEnding === 'CRLF' || opts.lineEnding === '\r\n') ? 'CRLF' : 'LF';
    const normalized = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const output = lineEnding === 'CRLF' ? normalized.replace(/\n/g, '\r\n') : normalized;
    const body = new TextEncoder().encode(output);
    if (!hadBom) return body;

    const withBom = new Uint8Array(3 + body.length);
    withBom[0] = 0xEF;
    withBom[1] = 0xBB;
    withBom[2] = 0xBF;
    withBom.set(body, 3);
    return withBom;
  }

  function buildSuggestedName(title) {
    const cleaned = String(title || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/^\.+$/, '');
    const base = cleaned || '제목 없는 문서';
    return /\.(md|markdown|txt)$/i.test(base) ? base : `${base}.md`;
  }

  async function ensurePermission(handle, mode = 'readwrite') {
    if (!handle) return false;
    const opts = { mode };
    if (typeof handle.queryPermission === 'function') {
      const state = await handle.queryPermission(opts);
      if (state === 'granted') return true;
    }
    if (typeof handle.requestPermission === 'function') {
      const state = await handle.requestPermission(opts);
      return state === 'granted';
    }
    return true;
  }

  async function sameEntry(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (typeof a.isSameEntry === 'function') {
      try {
        return await a.isSameEntry(b);
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  async function openFiles() {
    if (!isSupported()) {
      const err = new Error('UNSUPPORTED');
      err.code = 'UNSUPPORTED';
      throw err;
    }
    try {
      return await window.showOpenFilePicker({
        types: FILE_TYPES,
        multiple: true,
        excludeAcceptAllOption: false,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') return [];
      throw err;
    }
  }

  async function readHandle(handle) {
    const granted = await ensurePermission(handle, 'read');
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    const file = await handle.getFile();
    const buf = await file.arrayBuffer();
    const decoded = decodeBytes(new Uint8Array(buf));
    return {
      text: decoded.text,
      lineEnding: decoded.lineEnding,
      hadBom: decoded.hadBom,
      encoding: decoded.encoding,
      fileName: handle.name || file.name || '',
    };
  }

  async function writeHandle(handle, text, meta) {
    const granted = await ensurePermission(handle, 'readwrite');
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    const bytes = encodeText(text, meta);
    const writable = await handle.createWritable();
    try {
      await writable.write(bytes);
      await writable.close();
    } catch (err) {
      try { await writable.abort(); } catch (_) { /* ignore abort failure */ }
      throw err;
    }
    return {
      ok: true,
      fileName: handle.name || '',
      bytesWritten: bytes.length,
    };
  }

  async function saveAs(title, text, meta) {
    if (!isSupported()) {
      const err = new Error('UNSUPPORTED');
      err.code = 'UNSUPPORTED';
      throw err;
    }
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: buildSuggestedName(title),
        types: FILE_TYPES,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') return null;
      throw err;
    }
    await writeHandle(handle, text, meta);
    return {
      handle,
      fileName: handle.name || buildSuggestedName(title),
    };
  }

  function decodePathSegment(segment) {
    try {
      return decodeURIComponent(segment);
    } catch (_) {
      return segment;
    }
  }

  // Pure function: normalizes a relative path against baseDirPath inside an
  // opened workspace folder. Returns null for external URLs, absolute paths,
  // directory-only references, or paths that escape above the folder root via "..".
  function normalizeRelPath(baseDirPath, relPath) {
    if (typeof relPath !== 'string') return null;
    const raw = relPath.trim();
    if (!raw) return null;

    const cleaned = raw.split('#')[0].split('?')[0].trim();
    if (!cleaned) return null;

    // External URL schemes (http:, https:, data:, blob:, file:, etc.) or drive letters (C:)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned)) return null;
    // Protocol-relative (//) or root-absolute (/ or \)
    if (/^[/\\]/.test(cleaned)) return null;
    // Trailing slash or dot directory reference (not a file path)
    if (/[/\\]$/.test(cleaned) || cleaned === '.' || cleaned === '..' || /(?:^|[/\\])\.\.?$/.test(cleaned)) {
      return null;
    }

    const stack = [];
    const baseStr = String(baseDirPath == null ? '' : baseDirPath).replace(/\\/g, '/').trim();
    if (baseStr) {
      for (const rawBase of baseStr.split('/')) {
        if (!rawBase || rawBase === '.') continue;
        if (rawBase === '..') {
          if (stack.length === 0) return null;
          stack.pop();
        } else {
          stack.push(rawBase);
        }
      }
    }

    const relParts = cleaned.replace(/\\/g, '/').split('/');
    for (const rawPart of relParts) {
      if (!rawPart) continue;
      const part = decodePathSegment(rawPart);
      if (!part || part.indexOf('\0') !== -1 || part.indexOf('/') !== -1 || part.indexOf('\\') !== -1) {
        return null;
      }
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) return null;
        stack.pop();
      } else {
        stack.push(part);
      }
    }

    if (stack.length === 0) return null;
    return stack.join('/');
  }

  function isSkippedDirName(name) {
    return !name || name === 'node_modules' || name === '.git' || name.startsWith('.');
  }

  function isMarkdownFileName(name) {
    return /\.(md|markdown)$/i.test(name || '');
  }

  async function openFolder() {
    if (!isFolderSupported()) {
      const err = new Error('UNSUPPORTED');
      err.code = 'UNSUPPORTED';
      throw err;
    }
    try {
      return await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (err && err.name === 'AbortError') return null;
      throw err;
    }
  }

  async function readDirectoryEntries(dirHandle) {
    const entries = [];
    if (typeof dirHandle.entries === 'function') {
      for await (const [name, handle] of dirHandle.entries()) {
        entries.push({ name: name || (handle && handle.name) || '', handle });
      }
    } else if (typeof dirHandle.values === 'function') {
      for await (const handle of dirHandle.values()) {
        entries.push({ name: (handle && handle.name) || '', handle });
      }
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return entries;
  }

  async function listMarkdown(dirHandle, options) {
    if (!dirHandle) return [];
    const opts = options || {};
    const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : 3;
    const limit = typeof opts.limit === 'number' ? opts.limit : 500;

    const granted = await ensurePermission(dirHandle, 'read');
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    const results = [];
    let truncated = false;

    async function walk(currentDir, dirPath, depth) {
      if (truncated) return;
      let entries;
      try {
        entries = await readDirectoryEntries(currentDir);
      } catch (_) {
        return;
      }

      const subdirs = [];
      for (const { name, handle } of entries) {
        if (!handle || !name) continue;
        if (handle.kind === 'file') {
          if (!isMarkdownFileName(name)) continue;
          if (results.length >= limit) {
            truncated = true;
            return;
          }
          let lastModified = 0;
          try {
            const file = await handle.getFile();
            lastModified = file && typeof file.lastModified === 'number' ? file.lastModified : 0;
          } catch (_) {
            lastModified = 0;
          }
          results.push({
            path: dirPath ? `${dirPath}/${name}` : name,
            name,
            handle,
            dirPath,
            lastModified,
          });
        } else if (handle.kind === 'directory') {
          if (depth < maxDepth && !isSkippedDirName(name)) {
            subdirs.push({ name, handle });
          }
        }
      }

      for (const sub of subdirs) {
        if (truncated) return;
        const nextDirPath = dirPath ? `${dirPath}/${sub.name}` : sub.name;
        await walk(sub.handle, nextDirPath, depth + 1);
      }
    }

    await walk(dirHandle, '', 0);
    results.truncated = truncated;
    return results;
  }

  async function getSubdirectoryHandle(dirHandle, dirPath) {
    if (!dirHandle) return null;
    const cleaned = String(dirPath == null ? '' : dirPath).replace(/\\/g, '/').trim();
    if (!cleaned) return dirHandle;
    const segments = cleaned.split('/').filter((s) => s && s !== '.');
    let cur = dirHandle;
    for (const seg of segments) {
      if (seg === '..') return null;
      try {
        cur = await cur.getDirectoryHandle(seg, { create: false });
      } catch (_) {
        return null;
      }
    }
    return cur;
  }

  async function resolveRelative(dirHandle, baseDirPath, relPath) {
    if (!dirHandle) return null;
    const normalized = normalizeRelPath(baseDirPath, relPath);
    if (!normalized) return null;

    const segments = normalized.split('/');
    const fileName = segments.pop();
    if (!fileName) return null;

    let cur = dirHandle;
    for (const seg of segments) {
      try {
        cur = await cur.getDirectoryHandle(seg, { create: false });
      } catch (_) {
        return null;
      }
    }

    try {
      return await cur.getFileHandle(fileName, { create: false });
    } catch (_) {
      return null;
    }
  }

  function normalizeNewFileName(rawName) {
    const trimmed = String(rawName == null ? '' : rawName).trim();
    if (!trimmed) return { ok: false, reason: 'EMPTY' };
    if (/[\\/:*?"<>|]/.test(trimmed)) return { ok: false, reason: 'INVALID_CHARS' };
    if (/^\.+$/.test(trimmed)) return { ok: false, reason: 'INVALID_NAME' };
    const fileName = isMarkdownFileName(trimmed) ? trimmed : `${trimmed}.md`;
    const stem = fileName.replace(/\.(md|markdown)$/i, '').trim();
    if (!stem || /^\.+$/.test(stem)) return { ok: false, reason: 'INVALID_NAME' };
    return { ok: true, fileName };
  }

  async function createFile(dirHandle, name) {
    if (!dirHandle) {
      const err = new Error('NO_FOLDER');
      err.code = 'NO_FOLDER';
      throw err;
    }
    const parsed = normalizeNewFileName(name);
    if (!parsed.ok) {
      const err = new Error(parsed.reason);
      err.code = parsed.reason;
      throw err;
    }
    const granted = await ensurePermission(dirHandle, 'readwrite');
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    let exists = false;
    try {
      await dirHandle.getFileHandle(parsed.fileName, { create: false });
      exists = true;
    } catch (err) {
      if (!err || err.name !== 'NotFoundError') throw err;
    }
    if (exists) {
      const err = new Error('ALREADY_EXISTS');
      err.code = 'ALREADY_EXISTS';
      throw err;
    }

    return await dirHandle.getFileHandle(parsed.fileName, { create: true });
  }

  return {
    isSupported,
    isFolderSupported,
    openFiles,
    openFolder,
    listMarkdown,
    normalizeRelPath,
    resolveRelative,
    getSubdirectoryHandle,
    normalizeNewFileName,
    createFile,
    readHandle,
    writeHandle,
    saveAs,
    ensurePermission,
    sameEntry,
    decodeBytes,
    encodeText,
  };
})();

if (typeof window !== 'undefined') {
  window.GijoFiles = GijoFiles;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GijoFiles;
}
