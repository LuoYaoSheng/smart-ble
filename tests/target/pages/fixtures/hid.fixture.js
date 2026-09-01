// tests/target/pages/fixtures/hid.fixture.js
function createHidFixture(runtime) {
  return {
    reset() {
      runtime.setState({ hid: 'idle' });
    },
    provision() {
      runtime.setState({ hid: 'provisioning' });
      return runtime.hidProvision();
    },
  };
}

module.exports = { ...module.exports, createHidFixture };
