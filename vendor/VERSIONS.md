# Vendored third-party files

Static files vendored to remove CDN dependencies (jsdelivr/cdnjs are unreachable
in some deployment/build environments, and this app needs to work offline as a
desktop app). Fetched from the npm registry, not CDNs. Bump versions by
re-running the same `npm pack` + copy steps with a new version number.

| Library | Version | Source | License | Files taken |
|---|---|---|---|---|
| marked | 18.0.9 | `npm pack marked@18.0.9` → `package/lib/marked.umd.js` | MIT | `marked/marked.js` |
| DOMPurify | 3.4.13 | `npm pack dompurify@3.4.13` → `package/dist/purify.min.js` | (MPL-2.0 OR Apache-2.0) | `dompurify/purify.min.js` |
| Font Awesome Free | 7.3.1 | `npm pack @fortawesome/fontawesome-free@7.3.1` | CC-BY-4.0 (icons) / SIL OFL-1.1 (fonts) / MIT (code) | `fontawesome/css/{fontawesome,solid,regular}.min.css`, `fontawesome/webfonts/{fa-solid-900,fa-regular-400}.woff2` — only the solid+regular subset actually used by the app (no `fa-brands`, no full 25MB package) |

Not vendored: the app previously loaded Google Fonts (Inter/Noto Sans KR/Fira
Code). These were dropped in favor of a system font stack (see `css/style.css`)
rather than self-hosted — self-hosting full CJK (Noto Sans KR) webfonts is
multi-MB, and the editor is a plain `<textarea>` with no syntax highlighting,
so a distinct monospace face bought nothing.
