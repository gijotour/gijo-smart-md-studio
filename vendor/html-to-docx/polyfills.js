// Node.js global polyfills required by html-to-docx.browser.js — some of its
// bundled dependencies check for these synchronously at load/init time, so
// this must load BEFORE that script tag. Verbatim from the library's own
// documented browser-usage snippet (@turbodocx/html-to-docx README), not a
// homegrown guess — Buffer.from() only needs to cover base64/utf-8 string
// input and raw byte arrays, which is all this app's image-embedding path uses.
if (typeof global === 'undefined') window.global = window;
if (typeof process === 'undefined') window.process = { env: {} };
if (typeof Buffer === 'undefined') {
  window.Buffer = {
    from: function (data, encoding) {
      if (typeof data === 'string') {
        if (encoding === 'base64') {
          var binary = atob(data);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        }
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    isBuffer: function () { return false; },
  };
}
