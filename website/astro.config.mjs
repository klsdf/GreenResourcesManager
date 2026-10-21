import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import sitemap from '@astrojs/sitemap'

const websiteRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  site: 'https://klsdf.github.io',
  base: '/GreenResourcesManager',
  integrations: [
    vue({ appEntrypoint: '/src/vue-app.ts' }),
    sitemap()
  ],
  vite: {
    resolve: {
      dedupe: ['vue'],
      alias: {
        vue: `${websiteRoot}node_modules/vue`,
        prismjs: `${websiteRoot}node_modules/prismjs`,
        'prism-themes': `${websiteRoot}node_modules/prism-themes`
      }
    },
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
})
