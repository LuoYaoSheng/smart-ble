// tests/target/pages/fixtures/runtime.fixture.js
// FakeRuntime：可注入、可重置、无全局污染。不读 manifest expected。

let seq = 0;

function createFakeRuntime(seed = {}) {
  const id = `rt-${++seq}-${Date.now().toString(36)}`;
  /** @type {{ state: Record<string, unknown>, events: object[], navigation: object[], device: object[], errors: object[], listeners: Set<string>, timers: Set<NodeJS.Timeout>, sessions: Set<string> }} */
  const bag = {
    state: { ...(seed.state || {}) },
    events: [],
    navigation: [],
    device: [],
    errors: [],
    listeners: new Set(),
    timers: new Set(),
    sessions: new Set(),
  };

  function emit(kind, name, payload = {}) {
    const ev = { kind, name, payload, at: Date.now(), runtime_id: id };
    bag.events.push(ev);
    return ev;
  }

  const api = {
    id,
    reset() {
      for (const t of bag.timers) clearTimeout(t);
      bag.state = { ...(seed.state || {}) };
      bag.events.length = 0;
      bag.navigation.length = 0;
      bag.device.length = 0;
      bag.errors.length = 0;
      bag.listeners.clear();
      bag.timers.clear();
      bag.sessions.clear();
    },
    getState() {
      return { ...bag.state };
    },
    setState(patch) {
      Object.assign(bag.state, patch || {});
    },
    trackListener(name) {
      bag.listeners.add(String(name));
    },
    untrackListener(name) {
      bag.listeners.delete(String(name));
    },
    trackSession(name) {
      bag.sessions.add(String(name));
    },
    endSession(name) {
      bag.sessions.delete(String(name));
    },
    trackTimer(ms, fn) {
      const t = setTimeout(() => {
        bag.timers.delete(t);
        if (typeof fn === 'function') fn();
      }, ms);
      bag.timers.add(t);
      return t;
    },
    pushNavigation(target, meta = {}) {
      const nav = { target, ...meta, at: Date.now() };
      bag.navigation.push(nav);
      emit('navigation', 'navigate', nav);
      return nav;
    },
    pushDevice(name, payload = {}) {
      const d = { name, payload, at: Date.now() };
      bag.device.push(d);
      emit('device', name, payload);
      return d;
    },
    pushError(code, message) {
      const e = { code, message, at: Date.now() };
      bag.errors.push(e);
      emit('error', code, { message });
      return e;
    },
    // ---- domain helpers ----
    startScan() {
      bag.state.scanning = true;
      this.trackListener('scan');
      this.trackSession('scan');
      return emit('runtime', 'scan.start', {});
    },
    stopScan() {
      bag.state.scanning = false;
      this.untrackListener('scan');
      this.endSession('scan');
      return emit('runtime', 'scan.stop', {});
    },
    emitDevice(device) {
      return this.pushDevice('device.found', device || { id: 'fake', name: 'Fake' });
    },
    emitTimeout() {
      bag.state.scanning = false;
      return emit('runtime', 'scan.timeout', {});
    },
    connect(deviceId) {
      bag.state.connected = deviceId || 'fake';
      this.trackSession(`conn:${bag.state.connected}`);
      return emit('runtime', 'connect', { deviceId: bag.state.connected });
    },
    disconnect() {
      const id0 = bag.state.connected;
      bag.state.connected = null;
      if (id0) this.endSession(`conn:${id0}`);
      return emit('runtime', 'disconnect', { deviceId: id0 });
    },
    failConnect(reason = 'fail') {
      return this.pushError('CONNECT_FAIL', reason);
    },
    discoverServices() {
      return emit('runtime', 'gatt.discover', {});
    },
    read(char) {
      return emit('runtime', 'gatt.read', { char });
    },
    write(char, value) {
      return emit('runtime', 'gatt.write', { char, value });
    },
    notify(char, on) {
      if (on) this.trackListener(`notify:${char}`);
      else this.untrackListener(`notify:${char}`);
      return emit('runtime', 'gatt.notify', { char, on: !!on });
    },
    startBroadcast() {
      bag.state.broadcasting = true;
      this.trackSession('broadcast');
      return emit('runtime', 'broadcast.start', {});
    },
    stopBroadcast() {
      bag.state.broadcasting = false;
      this.endSession('broadcast');
      return emit('runtime', 'broadcast.stop', {});
    },
    otaStart() {
      bag.state.ota = 'started';
      this.trackSession('ota');
      return emit('runtime', 'ota.start', {});
    },
    otaReady() {
      bag.state.ota = 'ready';
      return emit('runtime', 'ota.ready', {});
    },
    otaProgress(n) {
      return emit('runtime', 'ota.progress', { n });
    },
    otaCommit() {
      bag.state.ota = 'commit';
      return emit('runtime', 'ota.commit', {});
    },
    otaSuccess() {
      bag.state.ota = 'success';
      this.endSession('ota');
      return emit('runtime', 'ota.success', {});
    },
    hidProvision() {
      this.trackSession('hid');
      return emit('runtime', 'hid.provision', {});
    },
    hidStatus(status) {
      return emit('runtime', 'hid.status', { status });
    },
    hidError(message) {
      return this.pushError('HID', message);
    },
    emit(name, payload = {}) {
      return emit('runtime', name, payload);
    },
    getRuntimeEvents() {
      return bag.events
        .filter((e) => e.kind === 'runtime' || e.kind === 'navigation' || e.kind === 'device')
        .map((e) => e.name);
    },
    getRawEvents() {
      return bag.events.map((e) => ({ ...e }));
    },
    getDeviceEvents() {
      return bag.device.map((d) => d.name);
    },
    getNavigationEvents() {
      return bag.navigation.map((n) => ({ ...n }));
    },
    getErrors() {
      return bag.errors.map((e) => ({ ...e }));
    },
    noteCleanup(note) {
      if (!bag.state.cleanup_notes) bag.state.cleanup_notes = [];
      bag.state.cleanup_notes.push(String(note));
    },
    getCleanupSnapshot() {
      const notes = [...(bag.state.cleanup_notes || [])];
      return {
        listeners: bag.listeners.size,
        sessions: bag.sessions.size,
        timers: bag.timers.size,
        tracked: bag.listeners.size + bag.sessions.size + bag.timers.size,
        resources: [...bag.listeners, ...bag.sessions],
        notes,
      };
    },
    snapshot() {
      return {
        runtime_id: id,
        state: { ...bag.state },
        events: bag.events.map((e) => ({ ...e })),
        navigation: bag.navigation.map((n) => ({ ...n })),
        device: bag.device.map((d) => ({ ...d })),
        errors: bag.errors.map((e) => ({ ...e })),
        listeners: [...bag.listeners],
        sessions: [...bag.sessions],
        timers: bag.timers.size,
      };
    },
  };

  // expose mutable state bag for state-controller patches
  Object.defineProperty(api, 'state', {
    get() {
      return bag.state;
    },
    set(v) {
      bag.state = v && typeof v === 'object' ? v : {};
    },
  });

  return api;
}

module.exports = {  createFakeRuntime  };
module.exports.default = module.exports;
module.exports = { ...module.exports, createFakeRuntime };
