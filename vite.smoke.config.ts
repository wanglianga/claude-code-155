import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const nodeExternal = [
  'happy-dom', 'child_process', 'worker_threads', 'zlib', 'path', 'fs', 'os',
  'crypto', 'stream', 'http', 'https', 'net', 'tls', 'url', 'util', 'events',
]

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    lib: { entry: fileURLToPath(new URL('./scripts/dom-smoke.ts', import.meta.url)), formats: ['es'], fileName: () => 'dom-smoke.js' },
    outDir: 'dist-smoke',
    emptyOutDir: true,
    rollupOptions: { external: (id) => nodeExternal.some(n => id === n || id.startsWith(n + '/')) || id.startsWith('node:') },
  },
})
