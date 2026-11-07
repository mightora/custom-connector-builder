import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: './',
  root: 'src',
  plugins: [viteStaticCopy({
    targets: [
      {
        src: '../node_modules/@wasmsharp/core/**/*',
        dest: 'runtime',
        rename: { stripBase: 3 },
        transform: {
          encoding: 'buffer',
          handler(content, path) {
            if (!path.endsWith('.js')) return content
            return Buffer.from(content.toString('utf8').replaceAll(
              'https://unpkg.com/comlink/dist/esm/comlink.mjs',
              './vendor/comlink.mjs'
            ))
          }
        }
      },
      { src: '../node_modules/comlink/dist/esm/comlink.mjs', dest: 'runtime/vendor', rename: { stripBase: true } },
      { src: '../node_modules/comlink/LICENSE', dest: 'runtime/vendor', rename: { stripBase: true, name: 'comlink-LICENSE.txt' } }
    ]
  })],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
