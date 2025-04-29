import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
    plugins: [react()], 
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 後端
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },

});
