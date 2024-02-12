import { defineConfig } from 'vitest/config'

export default defineConfig({
    define: {
        __DEV__: true,
    },
    test: {
        // ...
        include: ['__test__/**/*.spec.ts'],
    },
})