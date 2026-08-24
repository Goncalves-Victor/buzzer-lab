import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracao basica do Vite. host:true permite abrir pelo celular na mesma rede,
// o que importa aqui porque o piano precisa ser testado em touchscreen.
export default defineConfig({
  plugins: [react()],
  base: './',

  server: {
    host: true,
    port: 5173,
  },
});