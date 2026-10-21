import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const pagina = (arquivo) => fileURLToPath(new URL(arquivo, import.meta.url));

export default defineConfig({
  plugins: [tailwindcss()],
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: {
    rollupOptions: {
      input: {
        painel: pagina("./index.html"),
        login: pagina("./login.html"),
        cadastro: pagina("./cadastro.html"),
      },
    },
  },
});
