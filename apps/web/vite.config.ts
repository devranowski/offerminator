import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import postcssGlobalData from '@csstools/postcss-global-data';
import postcssCustomMedia from 'postcss-custom-media';
import { defineConfig } from 'vitest/config';

const DEFAULT_API_TARGET = 'http://localhost:3000';
const BREAKPOINTS_FILE = fileURLToPath(new URL('./src/styles/breakpoints.css', import.meta.url));

function createViteConfig(apiTarget = DEFAULT_API_TARGET) {
  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [postcssGlobalData({ files: [BREAKPOINTS_FILE] }), postcssCustomMedia()],
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
    },
  };
}

const config = defineConfig(
  createViteConfig(process.env['OFFERMINATOR_API_PROXY_TARGET'] ?? DEFAULT_API_TARGET),
);

export { createViteConfig, config as default };
