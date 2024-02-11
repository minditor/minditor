import path from 'path'

export default {
  root: "../",
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      "minditor": '../../src'
    }
  },
  fs: {
    // Allow serving files from one level up to the project root
    allow: ['..'],
  }
}
