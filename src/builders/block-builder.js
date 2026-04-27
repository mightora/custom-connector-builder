/**
 * BlockBuilder manages a drag-and-drop canvas of code blocks.
 */
export class BlockBuilder {
  constructor(canvasEl, BLOCKS) {
    this.canvasEl = canvasEl
    this.BLOCKS = BLOCKS
    this.canvasBlocks = [] // { id: string, blockTypeId: string, params: {} }
    this._nextId = 1
  }

  addBlock(blockTypeId) {
    const def = this.BLOCKS.find((b) => b.id === blockTypeId)
    if (!def) return
    const instance = {
      id: `block-${this._nextId++}`,
      blockTypeId,
      params: this._defaultParams(def.codeTemplate)
    }
    this.canvasBlocks.push(instance)
    this.renderCanvas()
  }

  removeBlock(id) {
    this.canvasBlocks = this.canvasBlocks.filter((b) => b.id !== id)
    this.renderCanvas()
  }

  moveBlock(id, direction) {
    const idx = this.canvasBlocks.findIndex((b) => b.id === id)
    if (idx === -1) return
    if (direction === 'up' && idx > 0) {
      ;[this.canvasBlocks[idx - 1], this.canvasBlocks[idx]] = [
        this.canvasBlocks[idx],
        this.canvasBlocks[idx - 1]
      ]
    } else if (direction === 'down' && idx < this.canvasBlocks.length - 1) {
      ;[this.canvasBlocks[idx], this.canvasBlocks[idx + 1]] = [
        this.canvasBlocks[idx + 1],
        this.canvasBlocks[idx]
      ]
    }
    this.renderCanvas()
  }

  renderCanvas() {
    if (!this.canvasEl) return
    this.canvasEl.innerHTML = ''

    if (this.canvasBlocks.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'block-canvas__empty'
      empty.textContent = 'Click a block from the palette to add it to your script.'
      this.canvasEl.appendChild(empty)
      return
    }

    this.canvasBlocks.forEach((instance, idx) => {
      const def = this.BLOCKS.find((b) => b.id === instance.blockTypeId)
      if (!def) return

      const item = document.createElement('div')
      item.className = 'block-item'
      item.dataset.id = instance.id

      const header = document.createElement('div')
      header.className = 'block-item__header'

      const title = document.createElement('span')
      title.className = 'block-item__title'
      title.textContent = def.name

      const badge = document.createElement('span')
      badge.className = `block-item__badge block-item__badge--${def.category.toLowerCase()}`
      badge.textContent = def.category

      const controls = document.createElement('div')
      controls.className = 'block-item__controls'

      const upBtn = document.createElement('button')
      upBtn.className = 'block-item__btn'
      upBtn.textContent = '↑'
      upBtn.title = 'Move up'
      upBtn.disabled = idx === 0
      upBtn.addEventListener('click', () => this.moveBlock(instance.id, 'up'))

      const downBtn = document.createElement('button')
      downBtn.className = 'block-item__btn'
      downBtn.textContent = '↓'
      downBtn.title = 'Move down'
      downBtn.disabled = idx === this.canvasBlocks.length - 1
      downBtn.addEventListener('click', () => this.moveBlock(instance.id, 'down'))

      const removeBtn = document.createElement('button')
      removeBtn.className = 'block-item__btn block-item__btn--remove'
      removeBtn.textContent = '✕'
      removeBtn.title = 'Remove block'
      removeBtn.addEventListener('click', () => this.removeBlock(instance.id))

      controls.appendChild(upBtn)
      controls.appendChild(downBtn)
      controls.appendChild(removeBtn)

      header.appendChild(title)
      header.appendChild(badge)
      header.appendChild(controls)

      const body = document.createElement('div')
      body.className = 'block-item__body'

      // Render parameter inputs
      const placeholders = this._extractPlaceholders(def.codeTemplate)
      if (placeholders.length > 0) {
        placeholders.forEach((placeholder) => {
          const row = document.createElement('div')
          row.className = 'block-item__param'

          const label = document.createElement('label')
          label.textContent = this._placeholderLabel(placeholder)

          const input = document.createElement('input')
          input.type = 'text'
          input.className = 'block-item__input'
          input.placeholder = placeholder
          input.value = instance.params[placeholder] || ''
          input.addEventListener('input', (e) => {
            instance.params[placeholder] = e.target.value
          })

          row.appendChild(label)
          row.appendChild(input)
          body.appendChild(row)
        })
      } else {
        const preview = document.createElement('code')
        preview.className = 'block-item__preview'
        preview.textContent = def.codeTemplate
        body.appendChild(preview)
      }

      item.appendChild(header)
      item.appendChild(body)
      this.canvasEl.appendChild(item)
    })
  }

  generateCode() {
    if (this.canvasBlocks.length === 0) return '// No blocks added yet'

    const lines = this.canvasBlocks.map((instance) => {
      const def = this.BLOCKS.find((b) => b.id === instance.blockTypeId)
      if (!def) return ''
      let code = def.codeTemplate
      for (const [key, val] of Object.entries(instance.params)) {
        code = code.split(`{${key}}`).join(val || key)
      }
      return code
    })

    return lines.filter(Boolean).join('\n')
  }

  _defaultParams(template) {
    const placeholders = this._extractPlaceholders(template)
    const params = {}
    placeholders.forEach((p) => {
      params[p] = ''
    })
    return params
  }

  _extractPlaceholders(template) {
    const matches = template.match(/\{([^}]+)\}/g) || []
    return [...new Set(matches.map((m) => m.slice(1, -1)))]
  }

  _placeholderLabel(placeholder) {
    return placeholder
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  }
}
