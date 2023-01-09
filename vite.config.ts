import path from 'path'
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
      '@ariesate/reactivity': fileURLToPath(new URL('../reactivity/dist/reactivity.esm.js', import.meta.url))
    }
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
}
