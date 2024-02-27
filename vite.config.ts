import {resolve} from "path";

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'minditor',
      // the proper extensions will be added
      fileName: 'index',
    },
  },
  define: {
    __DEV__: false,
  },
}
