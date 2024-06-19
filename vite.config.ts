import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { name } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: `/${name}`,
});
