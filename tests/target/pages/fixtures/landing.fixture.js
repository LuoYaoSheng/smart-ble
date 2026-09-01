// tests/target/pages/fixtures/landing.fixture.js
// WEB-001：从 docs 构建产物探测，不读 markdown expected。

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ROOT = resolve(__dirname, '../../../..');

function loadLandingHtml() {
  const candidates = [
    'docs/.vitepress/dist/index.html',
    'docs/.vitepress/dist/index.md.html',
  ];
  for (const rel of candidates) {
    const abs = resolve(ROOT, rel);
    if (existsSync(abs)) {
      return { path: rel, html: readFileSync(abs, 'utf8') };
    }
  }
  // fallback：直接读源 index（构建期投影已含 1.0.5/PREVIEW）；仍非 behavior expected
  const src = resolve(ROOT, 'docs/index.md');
  if (existsSync(src)) {
    return { path: 'docs/index.md', html: readFileSync(src, 'utf8') };
  }
  return { path: null, html: '' };
}

function probeLandingFacts(html = '') {
  const text = String(html);
  return {
    has_smart_ble: /Smart BLE/i.test(text),
    has_preview: /PREVIEW/.test(text),
    has_version: /1\.0\.5/.test(text),
    has_not_released: /NOT_RELEASED/.test(text),
    has_metadata_link: /\/release\/latest\.json/.test(text),
    has_fake_releases_latest: /releases\/latest/.test(text),
    has_download_apk_href: /href=["'][^"']*\.apk["']/i.test(text),
  };
}

module.exports = { ...module.exports, loadLandingHtml, probeLandingFacts };
