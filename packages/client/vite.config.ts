import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER = process.env.RPG_SERVER_URL ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // O cliente fala com o servidor pelo mesmo host em produção; em
    // desenvolvimento o proxy evita configurar CORS e URLs em dois lugares.
    proxy: {
      '/api': { target: SERVER, changeOrigin: true },
      '/socket.io': { target: SERVER, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
