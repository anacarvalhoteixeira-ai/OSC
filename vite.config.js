import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const pagina = (arquivo) => fileURLToPath(new URL(arquivo, import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), {
    name: "pagina-painel",
    generateBundle: { order: "post", handler(_options, bundle) {
      const painel = bundle["public/inicio/index.html"];
      if (painel) {
        delete bundle["public/inicio/index.html"];
        this.emitFile({ type: "asset", fileName: "inicio/index.html", source: painel.source });
      }
    } },
  }],
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: {
    rollupOptions: {
      input: {
        painel: pagina("./public/inicio/index.html"),
        login: pagina("./login.html"),
        cadastro: pagina("./cadastro.html"),
      },
    },
  },
});
