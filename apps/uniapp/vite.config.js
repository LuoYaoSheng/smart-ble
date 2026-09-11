/**
 * UniApp Vite toolchain profile: pure-CLI first, HBuilderX fallback.
 *
 * CLI mode (primary): @dcloudio/vite-plugin-uni resolves from this project's
 * node_modules (see scripts/uniapp/run-uni.mjs; npm run build:mp-weixin).
 *
 * HBuilderX mode (fallback): when this project has no local install, resolve
 * the plugin/vite from HBuilderX's uniapp-cli-vite bundle (macOS or Windows
 * install paths, or HBUILDERX_UNI_VITE_ROOT).
 *
 * APP inline patch (B-006): uni's APP target builds a single app-service.js
 * (IIFE) while rollup templates may still carry manualChunks; the combination
 * is rejected by rollup. Force inlineDynamicImports and drop manualChunks for
 * APP targets ONLY — the previous unconditional inlineDynamicImports broke
 * some legacy builds (manualChunks is required there), see DEF-003.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

const HX_UNI_VITE_CANDIDATES = [
  process.env.HBUILDERX_UNI_VITE_ROOT,
  '/Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli-vite',
  'D:/HBuilderX/plugins/uniapp-cli-vite',
  'C:/Program Files/HBuilderX/plugins/uniapp-cli-vite',
].filter(Boolean);

function hxViteRoot() {
  for (const root of HX_UNI_VITE_CANDIDATES) {
    if (existsSync(join(root, 'node_modules/@dcloudio/vite-plugin-uni'))) return root;
  }
  return null;
}

function loadViteDefineConfig() {
  // CLI mode first: project node_modules; HBuilderX also resolves via its loader.
  try {
    return require('vite').defineConfig;
  } catch {
    const hxRoot = hxViteRoot();
    const hxVite = hxRoot && join(hxRoot, 'node_modules/vite');
    if (hxVite && existsSync(hxVite)) return require(hxVite).defineConfig;
    throw new Error('vite not found: run `npm install` in apps/uniapp or install HBuilderX');
  }
}

function loadUniPlugin() {
  const unwrap = (mod) => mod.default || mod;
  try {
    return unwrap(require('@dcloudio/vite-plugin-uni'));
  } catch {
    const hxRoot = hxViteRoot();
    if (hxRoot) {
      return unwrap(require(join(hxRoot, 'node_modules/@dcloudio/vite-plugin-uni')));
    }
    throw new Error(
      '@dcloudio/vite-plugin-uni not found: run `npm install` in apps/uniapp or install HBuilderX'
    );
  }
}

function isAppPlatform() {
  const platform = String(process.env.UNI_PLATFORM || '').toLowerCase();
  return platform === 'app'
    || platform === 'app-plus'
    || platform.startsWith('app-')
    || !platform;
}

const defineConfig = loadViteDefineConfig();
const uni = loadUniPlugin();

const config = {
  plugins: [
    uni(),
    {
      name: 'uni-app-inline-imports-profile',
      apply: 'build',
      enforce: 'post',
      configResolved(config) {
        if (!isAppPlatform()) return;
        if (!config.build.rollupOptions) config.build.rollupOptions = {};
        const { output } = config.build.rollupOptions;
        const patch = (out) => {
          const next = out && typeof out === 'object' ? { ...out } : {};
          next.inlineDynamicImports = true;
          if ('manualChunks' in next) delete next.manualChunks;
          return next;
        };
        if (Array.isArray(output)) {
          config.build.rollupOptions.output = output.map(patch);
        } else {
          config.build.rollupOptions.output = patch(output);
        }
      },
    },
  ],
};

if (isAppPlatform()) {
  config.build = {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  };
}

export default defineConfig(config);
