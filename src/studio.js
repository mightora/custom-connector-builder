import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'
import JSZip from 'jszip'
import { DEFAULT_PROJECT, STUDIO_STORAGE_KEY, copyProject, analyseScript, validateOpenApi, runMockPreview } from './studio-logic.js'
import './studio.css'

self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    return label === 'json' ? new jsonWorker() : new editorWorker()
  }
}

const FILES = ['script.csx', 'openapi.yaml', 'request.json', 'expected.json']
const LANGUAGES = { 'script.csx': 'csharp', 'openapi.yaml': 'yaml', 'request.json': 'json', 'expected.json': 'json' }
const LANG_LABEL = { 'script.csx': 'C# · ScriptBase', 'openapi.yaml': 'OpenAPI · Swagger 2.0', 'request.json': 'JSON · Mock request', 'expected.json': 'JSON · Expected response' }
const PROXY_SCRIPT = `public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Inspect or transform the request before forwarding to the API.
        var response = await this.Context.SendAsync(
            this.Context.Request, this.CancellationToken).ConfigureAwait(false);

        // Transform the response body here if required.
        return response;
    }
}`

const PROXY_YAML = `swagger: '2.0'
info:
  title: API proxy starter
  version: '1.0'
host: api.example.com
basePath: /
schemes:
  - https
consumes:
  - application/json
produces:
  - application/json
paths:
  /items:
    get:
      operationId: GetItems
      summary: List items
      responses:
        '200':
          description: Success`

function sampleProject(which) {
  const project = copyProject(DEFAULT_PROJECT)
  if (which === 'proxy') {
    project.name = 'API proxy starter'
    project.files['script.csx'] = PROXY_SCRIPT
    project.files['openapi.yaml'] = PROXY_YAML
    project.files['request.json'] = '{}'
    project.files['expected.json'] = '{}'
  }
  return project
}

function safeStorageRead() {
  try {
    const result = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY))
    if (!result || typeof result !== 'object' || !result.files || !FILES.every(name => typeof result.files[name] === 'string')) return null
    return { name: String(result.name || 'My connector').slice(0, 80), files: Object.fromEntries(FILES.map(name => [name, result.files[name].slice(0, 1024 * 1024)])) }
  } catch { return null }
}

function setText(id, value) {
  const node = document.getElementById(id)
  if (node) node.textContent = value
}

function presentJSON(value) { return JSON.stringify(value, null, 2) }

let project = safeStorageRead() || sampleProject('text')
let editor
let activeFile = 'script.csx'
let saveTimer
let initialised = false
const models = new Map()

function writeStatus(value) { setText('studio-save-status', value) }

function persist() {
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(project))
    writeStatus('● Saved locally')
  } catch {
    writeStatus('Storage unavailable — export to keep changes')
  }
}

function queueSave() {
  writeStatus('Saving…')
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 400)
}

function loadModels() {
  for (const file of FILES) {
    const model = models.get(file)
    if (model) model.setValue(project.files[file])
  }
  if (!editor) document.getElementById('studio-editor-fallback').value = project.files[activeFile]
  queueSave()
  refreshDiagnostics()
}

function selectFile(name) {
  if (!FILES.includes(name)) return
  activeFile = name
  document.querySelectorAll('[data-studio-file]').forEach(button => {
    const selected = button.dataset.studioFile === name
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-selected', String(selected))
  })
  setText('studio-active-file', name)
  setText('studio-file-language', LANG_LABEL[name])
  setText('studio-editor-meta', LANG_LABEL[name] + ' · UTF-8')
  if (editor) {
    editor.setModel(models.get(name))
    editor.focus()
  } else {
    document.getElementById('studio-editor-fallback').value = project.files[name]
  }
}

function refreshDiagnostics() {
  const issues = [
    ...analyseScript(project.files['script.csx']).map(issue => ({ ...issue, file: 'script.csx' })),
    ...validateOpenApi(project.files['openapi.yaml']).map(issue => ({ ...issue, file: 'openapi.yaml' }))
  ]
  for (const name of ['request.json', 'expected.json']) {
    try { JSON.parse(project.files[name]) }
    catch (error) { issues.push({ file: name, severity: 'error', line: 1, message: `Invalid fixture JSON: ${error.message}` }) }
  }
  const warnings = issues.filter(issue => issue.severity === 'warning' || issue.severity === 'error')
  setText('studio-issue-count', String(warnings.length))
  const list = document.getElementById('studio-diagnostics-list')
  if (list) {
    list.replaceChildren(...issues.map(issue => {
      const li = document.createElement('li')
      li.className = 'studio-issue studio-issue--' + issue.severity
      const file = document.createElement('button')
      file.type = 'button'
      file.textContent = `${issue.file}:${issue.line || 1}`
      file.addEventListener('click', () => {
        selectFile(issue.file)
        editor?.revealLineInCenter(issue.line || 1)
        editor?.setPosition({ lineNumber: Math.max(1, issue.line || 1), column: 1 })
      })
      const message = document.createElement('span')
      message.textContent = issue.message
      li.append(file, message)
      return li
    }))
  }
  if (models.has('script.csx')) {
    monaco.editor.setModelMarkers(models.get('script.csx'), 'mightora', issues.filter(x => x.file === 'script.csx' && ['error', 'warning'].includes(x.severity)).map(x => ({
      startLineNumber: x.line || 1, endLineNumber: x.line || 1, startColumn: 1, endColumn: 2,
      severity: x.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning, message: x.message
    })))
  }
  return issues
}

function displayMockResult(result) {
  const status = document.getElementById('studio-test-status')
  status.className = 'studio-result-heading studio-result-heading--' + result.status
  const labels = { pass: '✓ Preview matched expected JSON', fail: '✕ Preview differs from expected JSON', error: '✕ Check your input', unsupported: '◌ Preview not supported for this script' }
  status.textContent = labels[result.status] || 'Test complete'
  const output = document.getElementById('studio-test-output')
  output.replaceChildren()
  const pre = document.createElement('pre')
  pre.textContent = result.errors?.length ? result.errors.join('\n') : `Actual response\n${presentJSON(result.actual)}\n\nExpected response\n${presentJSON(result.expected)}`
  output.append(pre)
  if (result.trace?.length) {
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Transformation trace'
    const trace = document.createElement('pre')
    trace.textContent = result.trace.join('\n')
    details.append(summary, trace)
    output.append(details)
  }
}

function runTest() {
  refreshDiagnostics()
  displayMockResult(runMockPreview(project.files['script.csx'], project.files['request.json'], project.files['expected.json']))
}

function showPanel(name) {
  document.querySelectorAll('[data-studio-panel]').forEach(button => {
    const selected = button.dataset.studioPanel === name
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-selected', String(selected))
  })
  document.getElementById('studio-tests-panel').hidden = name !== 'tests'
  document.getElementById('studio-diagnostics-panel').hidden = name !== 'diagnostics'
  if (name === 'diagnostics') refreshDiagnostics()
}

async function exportProject() {
  const zip = new JSZip()
  zip.file('script.csx', project.files['script.csx'])
  zip.file('openapi.yaml', project.files['openapi.yaml'])
  zip.file('fixtures/request.json', project.files['request.json'])
  zip.file('fixtures/expected.json', project.files['expected.json'])
  zip.file('README.md', `# ${project.name}\n\nExported by Mightora Connector Studio.\n\nFiles:\n- script.csx: Power Platform custom connector C# script\n- openapi.yaml: Swagger 2.0 API definition\n- fixtures/: inputs and expected outputs for local preview\n\nIMPORTANT: Connector Studio performs structural validation and a narrow mock transformation preview only; it does not compile or execute arbitrary C# or validate the result in Microsoft's hosted runtime. Test with a .NET compilation harness and a Power Platform development environment before deployment.\n\nSource: https://github.com/mightora/custom-connector-builder\n`)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  downloadBlob(blob, 'mightora-connector-project.zip')
  writeStatus('✓ Project exported')
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function importFile(file) {
  if (!file || file.size > 4 * 1024 * 1024) { writeStatus('Import must be smaller than 4 MB'); return }
  try {
    const name = file.name.toLowerCase()
    if (name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      const map = { 'script.csx': ['script.csx', 'script.cs'], 'openapi.yaml': ['openapi.yaml', 'swagger.yaml', 'openapi.yml'], 'request.json': ['fixtures/request.json', 'request.json'], 'expected.json': ['fixtures/expected.json', 'expected.json'] }
      let found = 0
      for (const [target, candidates] of Object.entries(map)) {
        const source = candidates.map(path => zip.file(path)).find(Boolean)
        if (source) {
          const content = await source.async('string')
          if (content.length > 1024 * 1024) throw new Error(`${target} exceeds 1 MB`)
          project.files[target] = content
          found++
        }
      }
      if (!found) throw new Error('No recognised connector files in ZIP')
    } else {
      const contents = await file.text()
      if (contents.length > 1024 * 1024) throw new Error('File exceeds 1 MB')
      const target = /\.(cs|csx)$/.test(name) ? 'script.csx' : /\.(yaml|yml)$/.test(name) ? 'openapi.yaml' : name.includes('expected') ? 'expected.json' : 'request.json'
      project.files[target] = contents
      selectFile(target)
    }
    loadModels()
    writeStatus('✓ Imported locally')
  } catch (error) { writeStatus(`Import failed: ${error.message}`) }
}

async function sendHttpRequest() {
  const url = document.getElementById('studio-http-url').value.trim()
  const method = document.getElementById('studio-http-method').value
  const textResult = document.getElementById('studio-http-result')
  if (!/^https:\/\//i.test(url) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(url)) {
    textResult.textContent = 'Use an HTTPS URL (or http://localhost for local development).'
    return
  }
  if (!window.confirm(`Send an ${method} request from your browser to ${new URL(url).origin}? Only use endpoints you are authorised to test.`)) return
  let headers
  try {
    headers = JSON.parse(document.getElementById('studio-http-headers').value || '{}')
    if (!headers || Array.isArray(headers) || typeof headers !== 'object' || Object.values(headers).some(value => typeof value !== 'string')) throw new Error('Headers must be a JSON object of string values')
  } catch (error) { textResult.textContent = 'Invalid headers JSON: ' + error.message; return }
  const body = document.getElementById('studio-http-body').value
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  textResult.textContent = 'Sending…'
  try {
    const response = await fetch(url, { method, headers, body: ['GET', 'HEAD'].includes(method) ? undefined : body || undefined, signal: controller.signal, redirect: 'error', credentials: 'omit' })
    const responseBody = await response.text()
    textResult.textContent = `HTTP ${response.status} ${response.statusText}\n\n${responseBody.slice(0, 50000)}`
  } catch (error) { textResult.textContent = `Request failed: ${error.message}. CORS, network access, or the server's policy may prevent browser testing.` }
  finally { clearTimeout(timer) }
}

function setupEditor() {
  const host = document.getElementById('studio-editor')
  if (editor || !host) return
  try {
    for (const file of FILES) {
      const model = monaco.editor.createModel(project.files[file], LANGUAGES[file], monaco.Uri.parse(`inmemory://mightora/${file}`))
      models.set(file, model)
      model.onDidChangeContent(() => {
        project.files[file] = model.getValue()
        queueSave()
        if (file === 'script.csx' || file === 'openapi.yaml') refreshDiagnostics()
      })
    }
    editor = monaco.editor.create(host, {
      model: models.get(activeFile), theme: 'vs-dark', automaticLayout: true,
      fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 13, lineHeight: 22,
      minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on',
      accessibilitySupport: 'auto', tabSize: 4, padding: { top: 16, bottom: 16 }
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => persist())
  } catch (error) {
    console.warn('Monaco editor unavailable; using the accessible textarea fallback', error)
    host.hidden = true
    const fallback = document.getElementById('studio-editor-fallback')
    fallback.hidden = false
    fallback.value = project.files[activeFile]
    fallback.addEventListener('input', () => {
      project.files[activeFile] = fallback.value
      queueSave()
      refreshDiagnostics()
    })
  }
}

export function openStudioWithFiles(files, name = 'Imported connector') {
  initStudio()
  project.name = name
  for (const file of FILES) if (typeof files[file] === 'string') project.files[file] = files[file]
  loadModels()
  selectFile('script.csx')
  window.location.hash = '#/studio'
}

export function initStudio() {
  if (initialised) return
  initialised = true
  setupEditor()
  document.querySelectorAll('[data-studio-file]').forEach(button => button.addEventListener('click', () => selectFile(button.dataset.studioFile)))
  document.querySelectorAll('[data-studio-panel]').forEach(button => button.addEventListener('click', () => showPanel(button.dataset.studioPanel)))
  document.getElementById('studio-run-test').addEventListener('click', runTest)
  document.getElementById('studio-validate').addEventListener('click', refreshDiagnostics)
  document.getElementById('studio-export').addEventListener('click', exportProject)
  document.getElementById('studio-import').addEventListener('change', async event => {
    await importFile(event.target.files[0])
    event.target.value = ''
  })
  document.getElementById('studio-new').addEventListener('click', () => {
    if (!window.confirm('Replace the current local project? Export a ZIP first if you need to keep your changes.')) return
    project = sampleProject(document.getElementById('studio-template').value)
    loadModels()
    selectFile('script.csx')
  })
  document.getElementById('studio-template').addEventListener('change', () => {
    writeStatus('Select Reset sample to load this template')
  })
  document.getElementById('studio-http-send').addEventListener('click', sendHttpRequest)
  const header = document.querySelector('mightora-header')
  if (header && 'ResizeObserver' in window) new ResizeObserver(() => document.documentElement.style.setProperty('--studio-header-height', `${header.getBoundingClientRect().height}px`)).observe(header)
  refreshDiagnostics()
}
