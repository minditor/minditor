const { jsWithTs: tsjPreset } = require('ts-jest/presets')

module.exports = {
  testEnvironment: 'jsdom',
  // preset: 'ts-jest/presets/js-with-ts',
  setupFilesAfterEnv: ['./scripts/setupJestEnv.ts'],
  transform: {
    ...tsjPreset.transform,
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'esnext',
          sourceMap: true,
          jsx: 'react',
          jsxFactory: 'createElement'
        }
      }
    ],
  },
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: require('./package.json').version,
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __NODE_JS__: true,
    __SSR__: true,
    __FEATURE_OPTIONS_API__: true,
    __FEATURE_SUSPENSE__: true,
    __FEATURE_PROD_DEVTOOLS__: false,
    __COMPAT__: true,
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: [
    'src/**/*.ts',
  ],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'jsx'],
  rootDir: __dirname,
  testMatch: ['<rootDir>/__test__/**/*spec.[jt]s?(x)'],
  testPathIgnorePatterns: process.env.SKIP_E2E
    ? // ignore example tests on netlify builds since they don't contribute
      // to coverage and can cause netlify builds to fail
      ['/node_modules/', '/examples/__tests__', 'cypress']
    : ['/node_modules/'],
  moduleNameMapper: {
    'rata': '<rootDir>/../rata/src',
    'axii': '<rootDir>/../rata/playground/framework/src',
    "\\.(css|less|sass|scss)$": "<rootDir>/__test__/styleMock.js",
    "\\.(gif|ttf|eot|svg)$": "<rootDir>/__test__/fileMock.js"
  },
  transformIgnorePatterns: ['/node_modules', '<rootDir>/../reactivity/dist/reactivity.cjs.js']
}
