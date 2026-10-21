/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@resources': resolve(__dirname, 'src/configs/resources')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pet: resolve(__dirname, 'pet.html'),
        'comic-viewer': resolve(__dirname, 'comic-viewer.html'),
        'novel-viewer': resolve(__dirname, 'novel-viewer.html'),
        'video-player': resolve(__dirname, 'public/html/video-player.html')
      },
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'pdf-vendor': ['pdfjs-dist'],
          'epub-vendor': ['epubjs'],
          'prism-vendor': ['prismjs', 'prism-themes'],
          'ui-vendor': ['vue-json-pretty']
        }
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    open: false
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: [
      'src/**/*.{test,spec}.{js,ts,vue}',
      'electron/**/*.{test,spec}.{js,ts}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,ts,vue}', 'electron/**/*.js'],
      exclude: [
        'src/third-party/**',
        'src/assets/**',
        'src/**/*.spec.{js,ts}',
        'electron/**/*.spec.js',
        'src/global.d.ts'
      ]
    }
  }
})
