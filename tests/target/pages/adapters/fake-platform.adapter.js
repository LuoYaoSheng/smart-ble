// tests/target/pages/adapters/fake-platform.adapter.js
function createFakePlatform() {
  return {
    name: 'fake',
    openExternal(url) {
      return { opened: true, url };
    },
    copy(text) {
      return { copied: true, text };
    },
    share(payload) {
      return { shared: true, payload };
    },
  };
}

module.exports = { ...module.exports, createFakePlatform };
