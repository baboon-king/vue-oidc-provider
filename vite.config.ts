import vueJsx from "@vitejs/plugin-vue-jsx";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [vueJsx(), dts()],
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "vue-oidc-provider",
      fileName: "vue-oidc-provider",
    },
    rollupOptions: {
      external: ["oidc-client-ts", "vue"],
      output: {
        globals: {
          vue: "Vue",
          "oidc-client-ts": "oidcClientTs",
        },
      },
    },
  },
});
