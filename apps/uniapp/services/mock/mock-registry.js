/**
 * MOCK 页面靶标注册表 —— H5 假数据通道（2026-09-11 UI 全面轮）。
 *
 * 页面 setup 内经条件编译（#ifdef H5）调用 registerPageTargets('p00x', { ...refs })，
 * 把页面本地响应式状态暴露给 mock-bridge（window.__MOCK__.targets('p00x')）。
 *
 * 生产剥离：本目录仅被 H5 条件编译块引用；mp-weixin/app 构建不包含。
 */

const registry = new Map();

export function registerPageTargets(pageKey, targets) {
	if (!pageKey || !targets) return;
	registry.set(pageKey, targets);
}

export function unregisterPageTargets(pageKey) {
	registry.delete(pageKey);
}

export function getPageTargets(pageKey) {
	return registry.get(pageKey) || null;
}
