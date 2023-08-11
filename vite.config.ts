import {fileURLToPath, URL } from 'url'

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      'rata': fileURLToPath(new URL('../rata/src/index.ts', import.meta.url)),
      'axii': fileURLToPath(new URL('../rata/playground/framework/src/index.ts', import.meta.url)),
    }
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
}
