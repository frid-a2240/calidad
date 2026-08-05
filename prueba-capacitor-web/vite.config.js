import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ALIAS = 'calidad'  // mismo valor que en main.py y en IIS

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // dev: URL limpia. build: con el prefijo del alias.
  base: command === 'build' ? `/${ALIAS}/` : '/',
  build: {
    outDir: '../prueba-capacitor-backend/dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5174,
  },
}))
