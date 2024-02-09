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
    alias: {
      'minditor': fileURLToPath(new URL('../src', import.meta.url))
    }
  }
}
