import path from 'path'
import {fileURLToPath, URL} from "url";

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  define: {
    __DEV__: true,
  },
  resolve: {
    // alias: [
    //   {find: '@ariesate/reactivity', replacement: path.resolve(__dirname, '../../reactivity/dist/reactivity.esm.js')},
    //   {find: '@tests/data', replacement: path.resolve(__dirname, '../tests/server/data')},
    // ]
    alias: {
      'rata': fileURLToPath(new URL('../../rata/src/index.ts', import.meta.url)),
      'axii': fileURLToPath(new URL('../../rata/playground/framework/src/index.ts', import.meta.url)),
      '@tests/data': fileURLToPath(new URL('../tests/server/data', import.meta.url)),
      'minditor': fileURLToPath(new URL('../src', import.meta.url))
    }
  }
}
