/**
 * Generates OpenAPI 2.0 (Swagger) YAML for Power Platform custom connectors.
 * @param {object} config
 * @param {string} config.connectorName
 * @param {string} config.description
 * @param {string} config.host
 * @param {string} config.basePath
 * @param {string} config.authType - 'none' | 'apikey' | 'basic' | 'oauth2'
 * @param {Array}  config.actions
 * @returns {string} YAML string
 */
export function buildYaml(config) {
  const {
    connectorName = 'My Connector',
    description = '',
    host = 'api.local',
    basePath = '/',
    authType = 'none',
    actions = []
  } = config

  const indent = (n) => ' '.repeat(n)
  const safe = (s) => String(s || '')
  const quote = (s) => {
    const str = safe(s)
    if (str.includes(':') || str.includes('#') || str.includes('"') || str.includes('\\') || str.trim() !== str) {
      // Escape backslashes before quotes to prevent double-escaping
      return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return str || '""'
  }

  const lines = []

  lines.push('swagger: "2.0"')
  lines.push('info:')
  lines.push(`${indent(2)}title: ${quote(connectorName)}`)
  lines.push(`${indent(2)}description: ${quote(description)}`)
  lines.push(`${indent(2)}version: "1.0"`)
  lines.push(`host: ${quote(host)}`)
  lines.push(`basePath: ${quote(basePath || '/')}`)
  lines.push('schemes:')
  lines.push(`${indent(2)}- https`)
  lines.push('consumes:')
  lines.push(`${indent(2)}- application/json`)
  lines.push('produces:')
  lines.push(`${indent(2)}- application/json`)

  // Security definitions
  if (authType === 'apikey') {
    lines.push('securityDefinitions:')
    lines.push(`${indent(2)}apiKeyHeader:`)
    lines.push(`${indent(4)}type: apiKey`)
    lines.push(`${indent(4)}in: header`)
    lines.push(`${indent(4)}name: x-api-key`)
    lines.push('security:')
    lines.push(`${indent(2)}- apiKeyHeader: []`)
  } else if (authType === 'basic') {
    lines.push('securityDefinitions:')
    lines.push(`${indent(2)}basicAuth:`)
    lines.push(`${indent(4)}type: basic`)
    lines.push('security:')
    lines.push(`${indent(2)}- basicAuth: []`)
  } else if (authType === 'oauth2') {
    lines.push('securityDefinitions:')
    lines.push(`${indent(2)}oauth2:`)
    lines.push(`${indent(4)}type: oauth2`)
    lines.push(`${indent(4)}flow: accessCode`)
    lines.push(`${indent(4)}authorizationUrl: https://login.microsoftonline.com/common/oauth2/authorize`)
    lines.push(`${indent(4)}tokenUrl: https://login.microsoftonline.com/common/oauth2/token`)
    lines.push(`${indent(4)}scopes: {}`)
    lines.push('security:')
    lines.push(`${indent(2)}- oauth2: []`)
  }

  // Paths
  lines.push('paths:')

  if (actions.length === 0) {
    lines.push(`${indent(2)}/example:`)
    lines.push(`${indent(4)}get:`)
    lines.push(`${indent(6)}summary: Example action`)
    lines.push(`${indent(6)}description: Replace this with your actions.`)
    lines.push(`${indent(6)}operationId: ExampleAction`)
    lines.push(`${indent(6)}parameters: []`)
    lines.push(`${indent(6)}responses:`)
    lines.push(`${indent(8)}"200":`)
    lines.push(`${indent(10)}description: Success`)
  } else {
    // Group actions by path
    const pathMap = {}
    for (const action of actions) {
      const p = action.path || '/unknown'
      if (!pathMap[p]) pathMap[p] = []
      pathMap[p].push(action)
    }

    for (const [path, pathActions] of Object.entries(pathMap)) {
      lines.push(`${indent(2)}${path}:`)
      for (const action of pathActions) {
        const method = (action.method || 'get').toLowerCase()
        lines.push(`${indent(4)}${method}:`)
        lines.push(`${indent(6)}summary: ${quote(action.summary || action.operationId)}`)
        lines.push(`${indent(6)}description: ${quote(action.description || '')}`)
        lines.push(`${indent(6)}operationId: ${safe(action.operationId) || 'UnnamedAction'}`)

        // Parameters
        const params = action.parameters || []
        if (params.length === 0) {
          lines.push(`${indent(6)}parameters: []`)
        } else {
          lines.push(`${indent(6)}parameters:`)
          for (const param of params) {
            lines.push(`${indent(8)}- name: ${safe(param.name)}`)
            lines.push(`${indent(10)}in: ${safe(param.in || 'query')}`)
            lines.push(`${indent(10)}required: ${param.required ? 'true' : 'false'}`)
            lines.push(`${indent(10)}description: ${quote(param.description || '')}`)
            if (param.in === 'body') {
              lines.push(`${indent(10)}schema:`)
              lines.push(`${indent(12)}type: ${safe(param.type || 'string')}`)
            } else {
              lines.push(`${indent(10)}type: ${safe(param.type || 'string')}`)
            }
          }
        }

        // Responses
        lines.push(`${indent(6)}responses:`)
        const responses = action.responses || { '200': { description: 'Success' } }
        for (const [code, resp] of Object.entries(responses)) {
          lines.push(`${indent(8)}"${code}":`)
          lines.push(`${indent(10)}description: ${quote(resp.description || 'Success')}`)
          if (resp.schema) {
            lines.push(`${indent(10)}schema:`)
            lines.push(`${indent(12)}type: ${safe(resp.schema.type || 'object')}`)
            if (resp.schema.properties) {
              lines.push(`${indent(12)}properties:`)
              for (const [propName, propDef] of Object.entries(resp.schema.properties)) {
                lines.push(`${indent(14)}${propName}:`)
                lines.push(`${indent(16)}type: ${safe(propDef.type || 'string')}`)
              }
            }
          }
        }
      }
    }
  }

  return lines.join('\n')
}
