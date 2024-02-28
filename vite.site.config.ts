import { resolve } from 'path'

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  define: {
    __DEV__: false,
  },
  resolve: {
    alias: {
      'minditor': './src/index.ts',
    }
  },
  assetsInclude: ['readme_cn.json', 'readme_en.json'],
  build: {
    outDir: 'docs',
    target: 'esnext',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        reference: resolve(__dirname, 'reference.html'),
      },
    },
  },

}
