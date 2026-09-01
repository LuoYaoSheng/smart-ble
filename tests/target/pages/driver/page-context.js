// tests/target/pages/driver/page-context.js
const { createFakeRuntime } = require('../fixtures/runtime.fixture.js');
const { createAppShell } = require('../fixtures/app-shell.fixture.js');
const { createBleFixture } = require('../fixtures/ble.fixture.js');
const { createHidFixture } = require('../fixtures/hid.fixture.js');
const { createUniappAdapter } = require('../adapters/uniapp.adapter.js');
const { createVitepressAdapter } = require('../adapters/vitepress.adapter.js');
const { createFakeBleAdapter } = require('../adapters/fake-ble.adapter.js');
const { createFakePlatform } = require('../adapters/fake-platform.adapter.js');
function createPageContext(pageId, behaviorPage) {
  const runtime = createFakeRuntime({ state: { pageId } });
  const shell = createAppShell(pageId);
  shell.route = behaviorPage?.route || null;
  const ble = createBleFixture(runtime);
  const hid = createHidFixture(runtime);
  const platform = createFakePlatform();
  const ctx = {
    pageId,
    behaviorPage,
    runtime,
    shell,
    ble,
    hid,
    platform,
    landing: null,
    stateId: null,
    lastOperationId: null,
    lastOperationResult: null,
    controls: new Map(),
    adapter: null,
  };
  ctx.adapter = pageId === 'WEB-001'
    ? createVitepressAdapter(ctx)
    : createUniappAdapter(ctx);
  ctx.bleAdapter = createFakeBleAdapter(runtime, ble);
  return ctx;
}

function resetPageContext(ctx) {
  ctx.runtime.reset();
  ctx.ble.reset();
  ctx.hid.reset();
  ctx.stateId = null;
  ctx.lastOperationId = null;
  ctx.lastOperationResult = null;
  ctx.controls.clear();
  ctx.shell.sections = [];
  ctx.shell.openedAt = null;
  ctx.landing = null;
}

module.exports = { ...module.exports, createPageContext, resetPageContext };
