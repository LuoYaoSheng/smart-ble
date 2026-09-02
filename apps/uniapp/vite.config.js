/**
 * UniApp Vite toolchain profile for APP / Android E5 test builds.
 *
 * Problem (B-006): IIFE + code-splitting conflict under HBuilderX APP compile.
 * Scope: toolchain/config ONLY.
 *
 * Loads @dcloudio/vite-plugin-uni from HBuilderX's uniapp-cli-vite (project
 * does not depend on it). Forces inlineDynamicImports for APP targets.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const HX_UNI_VITE_ROOT = '/Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli-vite';
const HX_UNI_PLUGIN = join(HX_UNI_VITE_ROOT, 'node_modules/@dcloudio/vite-plugin-uni');
const HX_VITE = join(HX_UNI_VITE_ROOT, 'node_modules/vite');

function loadViteDefineConfig() {
  const vite = require(existsSync(HX_VITE) ? HX_VITE : 'vite');
  return vite.defineConfig;
}

function loadUniPlugin() {
  if (existsSync(HX_UNI_PLUGIN)) {
    const mod = require(HX_UNI_PLUGIN);
    return mod.default || mod;
  }
  const mod = require('@dcloudio/vite-plugin-uni');
  return mod.default || mod;
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

export default defineConfig({
  plugins: [
    uni(),
    {
      name: 'e5-android-app-profile',
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
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
