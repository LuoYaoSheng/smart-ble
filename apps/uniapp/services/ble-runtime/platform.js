let testPlatform = null;

export function setBlePlatformForTesting(platform) {
  testPlatform = platform;
}

export function resetBlePlatformForTesting() {
  testPlatform = null;
}

export function getBlePlatform() {
  const platform = testPlatform || globalThis.uni;
  if (!platform) throw new Error('BLE platform is unavailable');
  return platform;
}
