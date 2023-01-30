import path from 'path'

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: [
      {find: '@ariesate/reactivity', replacement: path.resolve(__dirname, '../../../reactivity/dist/reactivity.esm.js')},
    ]
  }
}
