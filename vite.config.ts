import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // Auto-generates self-signed certificate for HTTPS
  ],
  server: {
    host: true,  // Expose to network
    port: 5173
  }
})
