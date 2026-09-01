// tests/target/pages/fixtures/ble.fixture.js
function createBleFixture(runtime) {
  return {
    devices: [],
    reset() {
      this.devices = [];
      runtime.setState({ scanning: false, connected: null });
    },
    seedDevice(d) {
      this.devices.push(d);
      runtime.emitDevice(d);
    },
  };
}

module.exports = { ...module.exports, createBleFixture };
