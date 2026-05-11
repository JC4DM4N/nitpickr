import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/apps': 'http://localhost:8000',
      '/reviews': 'http://localhost:8000',
      '/notifications': 'http://localhost:8000',
      '/exchanges': 'http://localhost:8000',
    },
  },
})
