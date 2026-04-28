import { buildYaml } from './builders/yaml-builder.js'
import { buildCSharp } from './builders/csharp-builder.js'
import { BlockBuilder } from './builders/block-builder.js'
import { BLOCKS } from './data/blocks.js'
import { dadJokesExample } from './examples/dad-jokes.js'
import { calculationOnlyExample } from './examples/calculation-only.js'

// ── Application State ──────────────────────────────────────────
const state = {
  currentStep: 1,
  connectorType: '',
  connectorName: '',
  description: '',
  host: '',
  basePath: '/',
  authType: 'none',
  actions: [],
  csharpLogic: '',
  generatedYaml: '',
  generatedCSharp: ''
}

const TOTAL_STEPS = 10

// ── Step Navigation ────────────────────────────────────────────
function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return

  // Hide current step panel
  const currentPanel = document.getElementById(`step-${state.currentStep}`)
  if (currentPanel) {
    currentPanel.classList.remove('step-panel--active')
  }

  state.currentStep = n

  // Show new step panel
  const nextPanel = document.getElementById(`step-${n}`)
  if (nextPanel) {
    nextPanel.classList.add('step-panel--active')
    nextPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // Update step indicator
  const items = document.querySelectorAll('.step-indicator__item')
  items.forEach((item) => {
    const step = parseInt(item.dataset.step, 10)
    item.classList.remove('step-indicator__item--active', 'step-indicator__item--completed')
    item.removeAttribute('aria-current')
    if (step === n) {
      item.classList.add('step-indicator__item--active')
      item.setAttribute('aria-current', 'step')
    } else if (step < n) {
      item.classList.add('step-indicator__item--completed')
    }
  })

  // Refresh step-specific panels
  if (n === 5) renderInputsPanel()
  if (n === 6) renderResponsesPanel()
  if (n === 8) {
    updateOutputs()
    const preview = document.getElementById('step-yaml-preview')
    if (preview) preview.textContent = state.generatedYaml || '# No YAML generated yet.'
  }
  if (n === 9) {
    const preview = document.getElementById('step-csharp-preview')
    if (preview) preview.textContent = state.generatedCSharp || '// No C# generated yet.'
  }
}

// ── Output Generation ──────────────────────────────────────────
function updateOutputs() {
  const config = {
    connectorName: state.connectorName || 'My Connector',
    description: state.description || '',
    host: state.host || 'example.com',
    basePath: state.basePath || '/',
    authType: state.authType || 'none',
    actions: state.actions
  }

  state.generatedYaml = buildYaml(config)

  const inputs = state.actions.flatMap((a) => a.parameters || [])
  state.generatedCSharp = buildCSharp({
    connectorName: state.connectorName || 'My Connector',
    operationId: state.actions[0]?.operationId || 'ExecuteOperation',
    inputs,
    csharpLogic: state.csharpLogic || ''
  })

  const yamlEl = document.getElementById('yaml-output')
  const csharpEl = document.getElementById('csharp-output')
  if (yamlEl) yamlEl.textContent = state.generatedYaml
  if (csharpEl) csharpEl.textContent = state.generatedCSharp
}

// ── Action List ────────────────────────────────────────────────
let actionIdCounter = 1

function createAction() {
  return {
    _id: actionIdCounter++,
    operationId: '',
    summary: '',
    description: '',
    method: 'get',
    path: '/',
    parameters: [],
    responses: {
      '200': { description: 'Success', schema: { type: 'object', properties: {} } }
    }
  }
}

function renderActionList() {
  const list = document.getElementById('action-list')
  if (!list) return
  list.innerHTML = ''

  if (state.actions.length === 0) {
    const empty = document.createElement('li')
    empty.textContent = 'No actions yet. Click "Add action" to get started.'
    empty.style.color = 'var(--ccb-neutral-600)'
    empty.style.fontSize = '0.9rem'
    list.appendChild(empty)
    return
  }

  state.actions.forEach((action, idx) => {
    const li = document.createElement('li')
    li.className = 'action-item'

    li.innerHTML = `
      <div class="action-item__header">
        <span class="action-item__name">Action ${idx + 1}</span>
        <button class="btn btn--sm btn--danger" data-remove-action="${action._id}" type="button">Remove</button>
      </div>
      <div class="action-item__fields">
        <div class="form-group">
          <label>Operation ID</label>
          <input type="text" data-field="operationId" data-action-id="${action._id}" value="${escHtml(action.operationId)}" placeholder="e.g. GetRandomJoke" />
        </div>
        <div class="form-group">
          <label>Summary</label>
          <input type="text" data-field="summary" data-action-id="${action._id}" value="${escHtml(action.summary)}" placeholder="Short description" />
        </div>
        <div class="form-group">
          <label>HTTP method</label>
          <select data-field="method" data-action-id="${action._id}">
            ${['get', 'post', 'put', 'patch', 'delete'].map((m) => `<option value="${m}"${action.method === m ? ' selected' : ''}>${m.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Path</label>
          <input type="text" data-field="path" data-action-id="${action._id}" value="${escHtml(action.path)}" placeholder="/endpoint" />
        </div>
      </div>
    `

    li.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', (e) => {
        const field = e.target.dataset.field
        const id = parseInt(e.target.dataset.actionId, 10)
        const a = state.actions.find((x) => x._id === id)
        if (a) a[field] = e.target.value
      })
    })

    li.querySelector(`[data-remove-action="${action._id}"]`).addEventListener('click', () => {
      state.actions = state.actions.filter((a) => a._id !== action._id)
      renderActionList()
    })

    list.appendChild(li)
  })
}

// ── Inputs Panel ───────────────────────────────────────────────
function renderInputsPanel() {
  const container = document.getElementById('inputs-container')
  if (!container) return

  if (state.actions.length === 0) {
    container.innerHTML = '<p style="color:var(--ccb-neutral-600)">No actions defined yet. Go back and add at least one action.</p>'
    return
  }

  container.innerHTML = ''
  state.actions.forEach((action) => {
    const section = document.createElement('div')
    section.style.marginBottom = '2rem'

    const title = document.createElement('h4')
    title.textContent = action.operationId || `Action (${action.method?.toUpperCase()} ${action.path})`
    title.style.marginBottom = '0.5rem'

    const paramList = document.createElement('ul')
    paramList.className = 'param-list'
    paramList.setAttribute('aria-label', `Parameters for ${title.textContent}`)

    function renderParams() {
      paramList.innerHTML = ''
      ;(action.parameters || []).forEach((param, pIdx) => {
        const li = document.createElement('li')
        li.className = 'param-item'
        li.innerHTML = `
          <input type="text" placeholder="Name" value="${escHtml(param.name)}" aria-label="Parameter name" />
          <input type="text" placeholder="Description" value="${escHtml(param.description)}" aria-label="Parameter description" />
          <select aria-label="Parameter location">
            ${['query', 'header', 'path', 'body'].map((loc) => `<option value="${loc}"${param.in === loc ? ' selected' : ''}>${loc}</option>`).join('')}
          </select>
          <select aria-label="Parameter type">
            ${['string', 'number', 'integer', 'boolean'].map((t) => `<option value="${t}"${param.type === t ? ' selected' : ''}>${t}</option>`).join('')}
          </select>
          <button class="btn btn--sm btn--danger" type="button" aria-label="Remove parameter">✕</button>
        `

        const [nameInput, descInput, inSelect, typeSelect, removeBtn] = li.querySelectorAll('input, select, button')
        nameInput.addEventListener('input', (e) => { param.name = e.target.value })
        descInput.addEventListener('input', (e) => { param.description = e.target.value })
        inSelect.addEventListener('change', (e) => { param.in = e.target.value })
        typeSelect.addEventListener('change', (e) => { param.type = e.target.value })
        removeBtn.addEventListener('click', () => {
          action.parameters.splice(pIdx, 1)
          renderParams()
        })

        paramList.appendChild(li)
      })
    }

    renderParams()

    const addParamBtn = document.createElement('button')
    addParamBtn.className = 'btn btn--ghost btn--sm'
    addParamBtn.type = 'button'
    addParamBtn.textContent = '+ Add parameter'
    addParamBtn.style.marginTop = '0.5rem'
    addParamBtn.addEventListener('click', () => {
      if (!action.parameters) action.parameters = []
      action.parameters.push({ name: '', in: 'query', type: 'string', required: false, description: '' })
      renderParams()
    })

    section.appendChild(title)
    section.appendChild(paramList)
    section.appendChild(addParamBtn)
    container.appendChild(section)
  })
}

// ── Responses Panel ────────────────────────────────────────────
function renderResponsesPanel() {
  const container = document.getElementById('responses-container')
  if (!container) return

  if (state.actions.length === 0) {
    container.innerHTML = '<p style="color:var(--ccb-neutral-600)">No actions defined yet. Go back and add at least one action.</p>'
    return
  }

  container.innerHTML = ''
  state.actions.forEach((action) => {
    const section = document.createElement('div')
    section.style.marginBottom = '2rem'

    const title = document.createElement('h4')
    title.textContent = action.operationId || `Action (${action.method?.toUpperCase()} ${action.path})`
    title.style.marginBottom = '0.5rem'

    const desc = document.createElement('p')
    desc.style.fontSize = '0.88rem'
    desc.style.color = 'var(--ccb-neutral-600)'
    desc.textContent = 'Define the properties returned in the 200 OK response.'

    const propList = document.createElement('div')
    propList.style.display = 'flex'
    propList.style.flexDirection = 'column'
    propList.style.gap = '0.5rem'

    if (!action.responses) action.responses = {}
    if (!action.responses['200']) action.responses['200'] = { description: 'Success', schema: { type: 'object', properties: {} } }
    if (!action.responses['200'].schema) action.responses['200'].schema = { type: 'object', properties: {} }
    if (!action.responses['200'].schema.properties) action.responses['200'].schema.properties = {}

    function renderProps() {
      propList.innerHTML = ''
      const props = action.responses['200'].schema.properties
      Object.entries(props).forEach(([propName, propDef]) => {
        const row = document.createElement('div')
        row.className = 'param-item'
        row.innerHTML = `
          <input type="text" value="${escHtml(propName)}" placeholder="Property name" aria-label="Property name" />
          <select aria-label="Property type">
            ${['string', 'number', 'integer', 'boolean'].map((t) => `<option value="${t}"${propDef.type === t ? ' selected' : ''}>${t}</option>`).join('')}
          </select>
          <button class="btn btn--sm btn--danger" type="button" style="grid-column:span 3" aria-label="Remove property">Remove</button>
        `

        const [nameInput, typeSelect, removeBtn] = row.querySelectorAll('input, select, button')
        const oldName = propName

        nameInput.addEventListener('blur', (e) => {
          const newName = e.target.value.trim()
          if (newName && newName !== oldName) {
            const val = props[oldName]
            delete props[oldName]
            props[newName] = val
            renderProps()
          }
        })

        typeSelect.addEventListener('change', (e) => {
          props[propName] = { type: e.target.value }
        })

        removeBtn.addEventListener('click', () => {
          delete props[propName]
          renderProps()
        })

        propList.appendChild(row)
      })
    }

    renderProps()

    const addPropBtn = document.createElement('button')
    addPropBtn.className = 'btn btn--ghost btn--sm'
    addPropBtn.type = 'button'
    addPropBtn.textContent = '+ Add response property'
    addPropBtn.style.marginTop = '0.5rem'
    addPropBtn.addEventListener('click', () => {
      action.responses['200'].schema.properties[`property${Object.keys(action.responses['200'].schema.properties).length + 1}`] = { type: 'string' }
      renderProps()
    })

    section.appendChild(title)
    section.appendChild(desc)
    section.appendChild(propList)
    section.appendChild(addPropBtn)
    container.appendChild(section)
  })
}

// ── Block Builder ──────────────────────────────────────────────
let blockBuilder = null

function initBlockBuilder() {
  const canvasEl = document.getElementById('block-canvas')
  if (!canvasEl) return

  blockBuilder = new BlockBuilder(canvasEl, BLOCKS)
  blockBuilder.renderCanvas()

  // Build palette
  const paletteContent = document.getElementById('block-palette-content')
  if (!paletteContent) return

  const categories = [...new Set(BLOCKS.map((b) => b.category))]
  categories.forEach((cat) => {
    const catDiv = document.createElement('div')
    catDiv.className = 'block-palette__category'

    const catTitle = document.createElement('p')
    catTitle.className = 'block-palette__category-title'
    catTitle.textContent = cat
    catDiv.appendChild(catTitle)

    BLOCKS.filter((b) => b.category === cat).forEach((block) => {
      const btn = document.createElement('button')
      btn.className = 'palette-block'
      btn.type = 'button'
      btn.title = block.description
      btn.innerHTML = `<span class="palette-block__name">${escHtml(block.name)}</span><span class="palette-block__add" aria-hidden="true">+</span>`
      btn.addEventListener('click', () => {
        blockBuilder.addBlock(block.id)
      })
      catDiv.appendChild(btn)
    })

    paletteContent.appendChild(catDiv)
  })

  // Apply blocks → C# logic textarea
  document.getElementById('apply-blocks-btn')?.addEventListener('click', () => {
    const code = blockBuilder.generateCode()
    const textarea = document.getElementById('csharp-logic')
    if (textarea) {
      textarea.value = code
      state.csharpLogic = code
    }
    showNotice('Block code applied to C# logic. Continue to Step 7 to review it.', 'success')
  })

  document.getElementById('clear-blocks-btn')?.addEventListener('click', () => {
    if (blockBuilder) {
      blockBuilder.canvasBlocks = []
      blockBuilder.renderCanvas()
    }
  })
}

// ── Copy to Clipboard ──────────────────────────────────────────
function copyToClipboard(text, btn) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => flashCopied(btn)).catch(() => fallbackCopy(text, btn))
  } else {
    fallbackCopy(text, btn)
  }
}

function fallbackCopy(text, btn) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    document.execCommand('copy')
    flashCopied(btn)
  } catch (_) {
    // silent
  }
  document.body.removeChild(textarea)
}

function flashCopied(btn) {
  if (!btn) return
  const original = btn.textContent
  btn.textContent = '✓ Copied!'
  btn.classList.add('copy-btn--copied')
  setTimeout(() => {
    btn.textContent = original
    btn.classList.remove('copy-btn--copied')
  }, 2000)
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target
      const text = target === 'yaml' ? state.generatedYaml : state.generatedCSharp
      if (!text) {
        showNotice('Nothing to copy yet. Please complete the builder steps first.', 'warning')
        return
      }
      copyToClipboard(text, btn)
    })
  })
}

// ── Examples ───────────────────────────────────────────────────
function initExamples() {
  document.getElementById('load-dadjokes-yaml')?.addEventListener('click', () => {
    state.generatedYaml = dadJokesExample.generateYaml()
    const yamlEl = document.getElementById('yaml-output')
    if (yamlEl) yamlEl.textContent = state.generatedYaml
    document.getElementById('outputs')?.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('load-dadjokes-csharp')?.addEventListener('click', () => {
    state.generatedCSharp = dadJokesExample.generateCSharp()
    const csharpEl = document.getElementById('csharp-output')
    if (csharpEl) csharpEl.textContent = state.generatedCSharp
    document.getElementById('outputs')?.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('load-vat-yaml')?.addEventListener('click', () => {
    state.generatedYaml = calculationOnlyExample.generateYaml()
    const yamlEl = document.getElementById('yaml-output')
    if (yamlEl) yamlEl.textContent = state.generatedYaml
    document.getElementById('outputs')?.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('load-vat-csharp')?.addEventListener('click', () => {
    state.generatedCSharp = calculationOnlyExample.generateCSharp()
    const csharpEl = document.getElementById('csharp-output')
    if (csharpEl) csharpEl.textContent = state.generatedCSharp
    document.getElementById('outputs')?.scrollIntoView({ behavior: 'smooth' })
  })
}

// ── Step Builder Wiring ─────────────────────────────────────────
function initStepBuilder() {
  // Step indicator clicks
  document.querySelectorAll('.step-indicator__item').forEach((item) => {
    item.addEventListener('click', () => {
      const step = parseInt(item.dataset.step, 10)
      goToStep(step)
    })
    item.style.cursor = 'pointer'
  })

  // Step 1 – Connector type
  document.querySelectorAll('[name="connectorType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => { state.connectorType = e.target.value })
  })
  document.getElementById('step-1-next')?.addEventListener('click', () => goToStep(2))

  // Step 2 – Name / description
  document.getElementById('connector-name')?.addEventListener('input', (e) => {
    state.connectorName = e.target.value
    updateOutputs()
  })
  document.getElementById('connector-description')?.addEventListener('input', (e) => {
    state.description = e.target.value
    updateOutputs()
  })
  document.getElementById('connector-host')?.addEventListener('input', (e) => {
    state.host = e.target.value
    updateOutputs()
  })
  document.getElementById('connector-base-path')?.addEventListener('input', (e) => {
    state.basePath = e.target.value
    updateOutputs()
  })
  document.getElementById('step-2-prev')?.addEventListener('click', () => goToStep(1))
  document.getElementById('step-2-next')?.addEventListener('click', () => goToStep(3))

  // Step 3 – Auth
  document.querySelectorAll('[name="authType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.authType = e.target.value
      updateOutputs()
    })
  })
  document.getElementById('step-3-prev')?.addEventListener('click', () => goToStep(2))
  document.getElementById('step-3-next')?.addEventListener('click', () => goToStep(4))

  // Step 4 – Actions
  document.getElementById('add-action-btn')?.addEventListener('click', () => {
    state.actions.push(createAction())
    renderActionList()
  })
  document.getElementById('step-4-prev')?.addEventListener('click', () => goToStep(3))
  document.getElementById('step-4-next')?.addEventListener('click', () => {
    updateOutputs()
    goToStep(5)
  })

  // Step 5 – Inputs
  document.getElementById('step-5-prev')?.addEventListener('click', () => goToStep(4))
  document.getElementById('step-5-next')?.addEventListener('click', () => {
    updateOutputs()
    goToStep(6)
  })

  // Step 6 – Responses
  document.getElementById('step-6-prev')?.addEventListener('click', () => goToStep(5))
  document.getElementById('step-6-next')?.addEventListener('click', () => {
    updateOutputs()
    goToStep(7)
  })

  // Step 7 – C# Logic
  document.getElementById('csharp-logic')?.addEventListener('input', (e) => {
    state.csharpLogic = e.target.value
    updateOutputs()
  })
  document.getElementById('step-7-prev')?.addEventListener('click', () => goToStep(6))
  document.getElementById('step-7-next')?.addEventListener('click', () => {
    updateOutputs()
    goToStep(8)
  })

  // Step 8 – YAML preview
  document.getElementById('step-8-prev')?.addEventListener('click', () => goToStep(7))
  document.getElementById('step-8-next')?.addEventListener('click', () => goToStep(9))

  // Step 9 – C# preview
  document.getElementById('step-9-prev')?.addEventListener('click', () => goToStep(8))
  document.getElementById('step-9-next')?.addEventListener('click', () => goToStep(10))

  // Step 10 – Copy / reset
  document.getElementById('step-10-prev')?.addEventListener('click', () => goToStep(9))
  document.getElementById('reset-builder-btn')?.addEventListener('click', async () => {
    const confirmed = await showConfirm('This will reset all builder data. Are you sure?')
    if (confirmed) {
      resetState()
      goToStep(1)
    }
  })

  // Output panel reset buttons
  document.getElementById('reset-yaml-btn')?.addEventListener('click', () => {
    state.generatedYaml = ''
    const el = document.getElementById('yaml-output')
    if (el) el.textContent = '# Your YAML will appear here as you build your connector above.'
  })
  document.getElementById('reset-csharp-btn')?.addEventListener('click', () => {
    state.generatedCSharp = ''
    const el = document.getElementById('csharp-output')
    if (el) el.textContent = '// Your C# script will appear here as you build your connector above.'
  })
}

// ── State Reset ────────────────────────────────────────────────
function resetState() {
  state.currentStep = 1
  state.connectorType = ''
  state.connectorName = ''
  state.description = ''
  state.host = ''
  state.basePath = '/'
  state.authType = 'none'
  state.actions = []
  state.csharpLogic = ''
  state.generatedYaml = ''
  state.generatedCSharp = ''

  // Reset form fields
  const nameEl = document.getElementById('connector-name')
  const descEl = document.getElementById('connector-description')
  const hostEl = document.getElementById('connector-host')
  const baseEl = document.getElementById('connector-base-path')
  const logicEl = document.getElementById('csharp-logic')
  if (nameEl) nameEl.value = ''
  if (descEl) descEl.value = ''
  if (hostEl) hostEl.value = ''
  if (baseEl) baseEl.value = '/'
  if (logicEl) logicEl.value = ''

  document.querySelectorAll('[name="connectorType"]').forEach((r) => { r.checked = false })
  const noneAuth = document.querySelector('[name="authType"][value="none"]')
  if (noneAuth) noneAuth.checked = true

  renderActionList()

  const yamlEl = document.getElementById('yaml-output')
  const csharpEl = document.getElementById('csharp-output')
  if (yamlEl) yamlEl.textContent = '# Your YAML will appear here as you build your connector above.'
  if (csharpEl) csharpEl.textContent = '// Your C# script will appear here as you build your connector above.'
}

// ── Accessible Notifications ───────────────────────────────────
/**
 * Shows an inline notice message in a live region instead of browser alert().
 * @param {string} message
 * @param {'info'|'success'|'warning'} type
 */
function showNotice(message, type = 'info') {
  let container = document.getElementById('app-notice')
  if (!container) {
    container = document.createElement('div')
    container.id = 'app-notice'
    container.setAttribute('role', 'status')
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-atomic', 'true')
    container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;max-width:360px;z-index:999;'
    document.body.appendChild(container)
  }

  const notice = document.createElement('div')
  notice.className = `notice notice--${type}`
  notice.style.cssText = 'box-shadow:0 4px 16px rgba(0,0,0,0.15);border-radius:8px;'
  notice.textContent = message
  container.appendChild(notice)

  setTimeout(() => {
    notice.style.transition = 'opacity 0.4s'
    notice.style.opacity = '0'
    setTimeout(() => notice.remove(), 400)
  }, 3500)
}

/**
 * Shows an inline confirm dialog using a modal instead of browser confirm().
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Confirmation')

    const dialog = document.createElement('div')
    dialog.style.cssText = 'background:#fff;border-radius:8px;padding:2rem;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);'

    const msg = document.createElement('p')
    msg.textContent = message
    msg.style.marginBottom = '1.5rem'

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:0.75rem;justify-content:flex-end;'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'btn btn--ghost btn--sm'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(false) })

    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'btn btn--danger btn--sm'
    confirmBtn.textContent = 'Reset'
    confirmBtn.addEventListener('click', () => { overlay.remove(); resolve(true) })

    actions.appendChild(cancelBtn)
    actions.appendChild(confirmBtn)
    dialog.appendChild(msg)
    dialog.appendChild(actions)
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)

    // Trap focus
    confirmBtn.focus()

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { overlay.remove(); resolve(false) }
    })
  })
}

// ── Helpers ────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Initialise ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStepBuilder()
  initBlockBuilder()
  initExamples()
  initCopyButtons()
  renderActionList()
})
