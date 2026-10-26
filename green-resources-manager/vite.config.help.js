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
  css: {
    preprocessorOptions: {
      scss: {
        // 帮助页打包同样走新的 Sass 编译器接口，避免再打出 legacy-js-api 警告。
        api: 'modern-compiler'
      }
    }
  },
  build: {
    outDir: 'help-site',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'help-index.html')
      },
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'prism-vendor': ['prismjs', 'prism-themes']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  publicDir: false
})
