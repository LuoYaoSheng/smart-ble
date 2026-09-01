// tests/target/pages/fixtures/app-shell.fixture.js
function createAppShell(pageId) {
  return {
    pageId,
    route: null,
    title: null,
    platform: 'fake',
    openedAt: null,
    versionLabel: null,
    sections: [],
    controls: new Map(),
    a11y: { landmarks: [], labels: [] },
  };
}

module.exports = { ...module.exports, createAppShell };
