import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração otimizada para deploy na Vercel
export default defineConfig({
  base: '/', // Garante que as rotas sejam resolvidas corretamente
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist', // Define a pasta de saída para build
    sourcemap: true, // Ajuda na depuração em produção
  },
  server: {
    port: 3000, // Porta fixa para desenvolvimento
  },
});
