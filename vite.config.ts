import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'ES2022',
    sourcemap: true,
  },
});
