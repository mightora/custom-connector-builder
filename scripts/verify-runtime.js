import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Verifies the GitHub Pages artifact contains every entrypoint used by the
// browser compiler, and that Comlink is served locally rather than via CDN.
const runtime = join(process.cwd(), 'dist', 'runtime')
for (const name of [
  'WasmCompiler.js', 'worker.js', 'WasmSharpWorker.js',
  'dotnet.js', 'dotnet.native.wasm', 'System.Net.Http.dll',
  'Microsoft.CodeAnalysis.CSharp.dll', 'vendor/comlink.mjs',
  'vendor/comlink-LICENSE.txt', 'LICENSE'
]) {
  const path = join(runtime, name)
  if (!existsSync(path) || !statSync(path).size) throw new Error(`Missing or empty runtime asset: ${name}`)
}
for (const name of ['WasmCompiler.js', 'worker.js']) {
  const source = readFileSync(join(runtime, name), 'utf8')
  if (source.includes('https://unpkg.com/comlink')) throw new Error(`External runtime module import in ${name}`)
  if (!source.includes('./vendor/comlink.mjs')) throw new Error(`Missing local Comlink import in ${name}`)
}
console.log('✓ Browser .NET assets and local Comlink dependencies are present')
