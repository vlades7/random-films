import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // относительные пути — сборку можно выложить в любую папку на любом статическом хостинге
  base: './',
  server: { open: true },
  preview: { open: true },
})
