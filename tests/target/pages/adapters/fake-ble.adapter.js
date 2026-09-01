// tests/target/pages/adapters/fake-ble.adapter.js
function createFakeBleAdapter(runtime, bleFixture) {
  return {
    startScan() {
      return runtime.startScan();
    },
    stopScan() {
      return runtime.stopScan();
    },
    connect(id) {
      return runtime.connect(id);
    },
    disconnect() {
      return runtime.disconnect();
    },
    seed(device) {
      bleFixture.seedDevice(device);
    },
  };
}

module.exports = { ...module.exports, createFakeBleAdapter };
