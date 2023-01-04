import { defineConfig } from "cypress";
import { resolve } from "path";
import { default as vitePreprocessor } from "cypress-vite";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on(
        "file:preprocessor",
        vitePreprocessor(resolve(__dirname, "./cypress/vite.config.ts"))
      );
    },
  },

  experimentalWebKitSupport: true,

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
