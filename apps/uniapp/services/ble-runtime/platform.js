let testPlatform = null;

export function setBlePlatformForTesting(platform) {
  testPlatform = platform;
}

export function resetBlePlatformForTesting() {
  testPlatform = null;
}

export function getBlePlatform() {
  // `uni` 是 HBuilderX 的编译期平台对象；微信运行时不会保证挂到 globalThis。
  // Node 单测通过显式注入优先覆盖，避免依赖任何全局对象。
  const runtimePlatform = typeof uni !== 'undefined' ? uni : globalThis.uni;
  const platform = testPlatform || runtimePlatform;
  if (!platform) throw new Error('BLE platform is unavailable');
  return platform;
}
