import { load as parseYaml } from 'js-yaml'

export const STUDIO_STORAGE_KEY = 'mightora-connector-studio-v1'

// Monaco's desktop-first editing surface is awkward on small touch screens.
// Keep the same project, tests and exports with a native textarea on phones.
export function prefersMobileEditor(userAgent, narrowTouchScreen) {
  return /iPhone|iPod/i.test(userAgent || '') || Boolean(narrowTouchScreen)
}

export const DEFAULT_PROJECT = {
  name: 'Text transformation',
  files: {
    'script.csx': `public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Step 1: Read incoming JSON
        var contentAsString = await this.Context.Request.Content
            .ReadAsStringAsync().ConfigureAwait(false);

        // Step 2: Parse the request
        JObject input;
        try
        {
            input = JObject.Parse(contentAsString);
        }
        catch
        {
            return new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = CreateJsonContent("{\\"error\\":\\"Invalid JSON\\"}")
            };
        }

        // Step 3: Extract values
        var value = input["Value1"]?.Value<string>() ?? string.Empty;

        // Step 4: Transform and assemble output
        var cleaned = value.Trim().ToUpperInvariant();
        var result = new JObject
        {
            ["Value2"] = $"Processed: {cleaned}",
            ["Value1"] = value,
        };

        // Step 5: Return the response
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = CreateJsonContent(result.ToString())
        };
    }
}`,
    'openapi.yaml': `swagger: '2.0'
info:
  title: Text transformation
  version: '1.0'
  description: A local-logic Power Platform custom connector example.
host: api.local
basePath: /
schemes:
  - https
consumes:
  - application/json
produces:
  - application/json
paths:
  /transform:
    post:
      operationId: TransformText
      summary: Transform text
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            properties:
              Value1:
                type: string
      responses:
        '200':
          description: Processed text
          schema:
            type: object
            properties:
              Value2:
                type: string
              Value1:
                type: string`,
    'request.json': '{\n  "Value1": "  hello connector  "\n}',
    'expected.json': '{\n  "Value2": "Processed: HELLO CONNECTOR",\n  "Value1": "  hello connector  "\n}'
  }
}

export function copyProject(project) {
  return JSON.parse(JSON.stringify(project))
}

function findStructuralIssues(source) {
  const issues = []
  const stack = []
  let mode = 'code'
  for (let i = 0; i < source.length; i++) {
    const chr = source[i]
    const next = source[i + 1]
    if (mode === 'line') { if (chr === '\n') mode = 'code'; continue }
    if (mode === 'block') { if (chr === '*' && next === '/') { mode = 'code'; i++ } continue }
    if (mode === 'string') {
      if (chr === '\\') { i++; continue }
      if (chr === '"') mode = 'code'
      continue
    }
    if (mode === 'char') {
      if (chr === '\\') { i++; continue }
      if (chr === "'") mode = 'code'
      continue
    }
    if (chr === '/' && next === '/') { mode = 'line'; i++; continue }
    if (chr === '/' && next === '*') { mode = 'block'; i++; continue }
    if (chr === '"') { mode = 'string'; continue }
    if (chr === "'") { mode = 'char'; continue }
    if ('({['.includes(chr)) stack.push({ chr, line: source.slice(0, i).split('\n').length })
    if (')}]'.includes(chr)) {
      const opening = stack.pop()
      const matchingOpen = { ')': '(', '}': '{', ']': '[' }[chr]
      if (!opening || opening.chr !== matchingOpen) {
        issues.push({ severity: 'error', message: `Unbalanced ${chr}`, line: source.slice(0, i).split('\n').length })
      }
    }
  }
  for (const opening of stack) issues.push({ severity: 'error', message: `Unclosed ${opening.chr}`, line: opening.line })
  if (mode === 'string' || mode === 'block') issues.push({ severity: 'error', message: `Unterminated ${mode === 'string' ? 'string' : 'comment'}`, line: source.split('\n').length })
  return issues
}

export function analyseScript(source) {
  const issues = findStructuralIssues(source)
  if (!/class\s+Script\s*:\s*ScriptBase\b/.test(source)) issues.push({ severity: 'error', message: 'Expected class Script : ScriptBase', line: 1 })
  if (!/override\s+(?:async\s+)?Task<HttpResponseMessage>\s+ExecuteAsync\s*\(/.test(source)) issues.push({ severity: 'error', message: 'Expected an ExecuteAsync() override returning Task<HttpResponseMessage>', line: 1 })
  if (!/return\s+(?:new\s+HttpResponseMessage|response)\b/.test(source)) issues.push({ severity: 'warning', message: 'No familiar HTTP response return found; check all execution paths.', line: 1 })
  if (/\bnew\s+HttpClient\s*\(/.test(source)) issues.push({ severity: 'warning', message: 'Prefer Context.SendAsync to constructing HttpClient.', line: source.slice(0, source.indexOf('new HttpClient')).split('\n').length })
  if (/\b(?:API_KEY_HERE|YOUR_SECRET|Bearer\s+[A-Za-z0-9_-]{18,})\b/.test(source)) issues.push({ severity: 'warning', message: 'Possible credential or placeholder in the script. Do not embed secrets.', line: 1 })
  if (new Blob([source]).size > 1024 * 1024) issues.push({ severity: 'error', message: 'Script is larger than the Power Platform 1 MB limit.', line: 1 })
  issues.push({ severity: 'info', message: 'Static checks only. This is not Roslyn compilation or validation in Microsoft’s connector runtime.', line: 1 })
  return issues
}

export function validateOpenApi(source) {
  const issues = []
  let document
  try { document = parseYaml(source) } catch (error) {
    return [{ severity: 'error', message: `YAML parsing failed: ${error.reason || error.message}`, line: error.mark?.line + 1 || 1 }]
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) return [{ severity: 'error', message: 'OpenAPI document must be an object.', line: 1 }]
  if (String(document.swagger) !== '2.0') issues.push({ severity: 'error', message: 'Power Platform custom connectors expect a Swagger 2.0 definition.', line: 1 })
  if (!document.info?.title || !document.info?.version) issues.push({ severity: 'error', message: 'info.title and info.version are required.', line: 1 })
  if (!document.host) issues.push({ severity: 'warning', message: 'No API host defined.', line: 1 })
  const paths = document.paths && typeof document.paths === 'object' ? Object.entries(document.paths) : []
  if (!paths.length) issues.push({ severity: 'error', message: 'At least one API operation is required in paths.', line: 1 })
  const operationIds = new Set()
  let count = 0
  for (const [path, definitions] of paths) {
    for (const [method, operation] of Object.entries(definitions || {})) {
      if (!/^(get|post|put|patch|delete|head|options)$/.test(method)) continue
      count++
      if (!operation?.operationId) issues.push({ severity: 'error', message: `${method.toUpperCase()} ${path} is missing operationId.`, line: 1 })
      else if (operationIds.has(operation.operationId)) issues.push({ severity: 'error', message: `Duplicate operationId: ${operation.operationId}`, line: 1 })
      else operationIds.add(operation.operationId)
      if (!operation?.responses) issues.push({ severity: 'warning', message: `${method.toUpperCase()} ${path} does not define responses.`, line: 1 })
    }
  }
  if (!count) issues.push({ severity: 'error', message: 'No supported HTTP operations found.', line: 1 })
  if (!issues.length) issues.push({ severity: 'success', message: `YAML parses and ${count} operation${count === 1 ? '' : 's'} passed basic Swagger 2.0 checks. This is not full platform validation.`, line: 1 })
  return issues
}

function splitExpressionChain(expression) {
  const match = expression.match(/^([A-Za-z_]\w*)((?:\.(?:Trim|ToUpperInvariant|ToLowerInvariant|ToUpper|ToLower)\(\))*)$/)
  if (!match) return null
  return { variable: match[1], steps: [...match[2].matchAll(/\.([A-Za-z]+)\(\)/g)].map(m => m[1]) }
}

function evaluateExpression(expression, vars) {
  const value = expression.trim()
  if (value === 'string.Empty') return ''
  if (/^(?:-?\d+(?:\.\d+)?|true|false|null)$/.test(value)) return JSON.parse(value)
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) return JSON.parse(value)
  if (/^\$"(?:[^"\\]|\\.)*"$/.test(value)) {
    const literal = JSON.parse(value.slice(1))
    return literal.replace(/\{([A-Za-z_]\w*)\}/g, (_, key) => {
      if (!(key in vars)) throw new Error(`Unknown interpolation variable: ${key}`)
      return String(vars[key])
    })
  }
  const chain = splitExpressionChain(value)
  if (!chain || !(chain.variable in vars)) throw new Error(`Unsupported C# expression: ${value}`)
  return chain.steps.reduce((current, step) => {
    if (typeof current !== 'string') throw new Error(`${step} requires a string value`)
    if (step === 'Trim') return current.trim()
    if (step === 'ToUpperInvariant' || step === 'ToUpper') return current.toUpperCase()
    if (step === 'ToLowerInvariant' || step === 'ToLower') return current.toLowerCase()
    throw new Error(`Unsupported method ${step}`)
  }, vars[chain.variable])
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * Safe, deliberately narrow, deterministic interpretation of the documented
 * baseline JObject transform pattern. This NEVER executes or compiles C#.
 * Unsupported constructs reject the preview instead of reporting a false pass.
 */
export function runMockPreview(script, requestText, expectedText) {
  const errors = analyseScript(script).filter(item => item.severity === 'error')
  if (errors.length) return { status: 'error', errors: errors.map(issue => issue.message), trace: [] }
  let input
  let expected
  try { input = JSON.parse(requestText) } catch (error) { return { status: 'error', errors: [`Request JSON: ${error.message}`], trace: [] } }
  try { expected = JSON.parse(expectedText) } catch (error) { return { status: 'error', errors: [`Expected JSON: ${error.message}`], trace: [] } }
  if (!input || Array.isArray(input) || typeof input !== 'object') return { status: 'error', errors: ['The mock request must contain a JSON object.'], trace: [] }
  const cleaned = stripComments(script)
  if (/\b(?:if|else|for|while|switch|foreach|throw|lock|using)\s*\(/.test(cleaned) || /\bContext\.SendAsync\s*\(/.test(cleaned)) {
    return { status: 'unsupported', errors: ['Conditional logic or backend calls require real .NET runtime testing. The local preview deliberately does not simulate them.'], trace: [] }
  }
  // The preview must not silently ignore additional method calls, asynchronous
  // work or alternate return paths. It intentionally rejects broad C# features.
  const allowedCalls = new Set(['ExecuteAsync', 'ReadAsStringAsync', 'ConfigureAwait', 'Parse', 'HttpResponseMessage', 'CreateJsonContent', 'ToString', 'Trim', 'ToUpperInvariant', 'ToLowerInvariant', 'ToUpper', 'ToLower'])
  const calls = [...cleaned.matchAll(/\b([A-Za-z_]\w*)\s*(?:<string>)?\s*\(/g)].map(match => match[1])
  if (calls.some(call => !allowedCalls.has(call) && call !== 'Value') || [...cleaned.matchAll(/\breturn\b/g)].length !== 2 || [...cleaned.matchAll(/\bawait\b/g)].length !== 1) {
    return { status: 'unsupported', errors: ['The script uses method calls or control paths outside the supported mock preview pattern.'], trace: [] }
  }
  if (/\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w+)+\s*(?:=(?!=)|\+=|-=|\*=)/.test(cleaned)) {
    return { status: 'unsupported', errors: ['Property mutations require real C# execution; this mock preview cannot validate them.'], trace: [] }
  }
  const reassignmentLines = [...cleaned.matchAll(/^\s*(?!var\b)(?:[A-Za-z_]\w*|input\[[^\]]+\])\s*(?:=(?!=)|\+=|-=|\*=).*$/gm)]
  if (reassignmentLines.some(match => !/^\s*input\s*=\s*JObject\.Parse\(contentAsString\)\s*;\s*$/.test(match[0]) && !/^\s*Content\s*=\s*CreateJsonContent\(/.test(match[0]))) {
    return { status: 'unsupported', errors: ['Variable reassignment is not supported by the safe local preview.'], trace: [] }
  }
  const resultBlock = cleaned.match(/\bvar\s+result\s*=\s*new\s+JObject\s*\{([\s\S]*?)\}\s*;/)
  if (!resultBlock) return { status: 'unsupported', errors: ['Preview supports only a named `var result = new JObject { ... };` output block.'], trace: [] }
  const afterResult = cleaned.slice(resultBlock.index + resultBlock[0].length)
  if (/\bresult\s*(?:\[|\.(?!ToString\b))/.test(afterResult) || !/CreateJsonContent\(result\.ToString\(\)\)/.test(afterResult) || !/new\s+HttpResponseMessage\(HttpStatusCode\.OK\)/.test(afterResult)) {
    return { status: 'unsupported', errors: ['The final response differs from the supported 200 OK / result.ToString() pattern.'], trace: [] }
  }
  const vars = {}
  const trace = []
  const beforeResult = cleaned.slice(0, resultBlock.index)
  const inputRe = /\bvar\s+(\w+)\s*=\s*input\["([^"\n]+)"\]\?\.Value<string>\(\)\s*\?\?\s*string\.Empty\s*;/g
  for (const match of beforeResult.matchAll(inputRe)) {
    vars[match[1]] = input[match[2]] == null ? '' : String(input[match[2]])
    trace.push(`Read ${match[2]} as ${match[1]}`)
  }
  if (!trace.length) return { status: 'unsupported', errors: ['No supported input["field"]?.Value<string>() extraction was found.'], trace }
  const assignments = [...beforeResult.matchAll(/\bvar\s+(\w+)\s*=\s*([^;\n]+)\s*;/g)]
  for (const match of assignments) {
    if (match[1] === 'contentAsString' || match[1] in vars) continue
    try { vars[match[1]] = evaluateExpression(match[2], vars); trace.push(`Computed ${match[1]}`) }
    catch (error) { return { status: 'unsupported', errors: [error.message], trace } }
  }
  const actual = {}
  const entries = resultBlock[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  for (const entry of entries) {
    const match = entry.match(/^\["([^"\n]+)"\]\s*=\s*(.+?),?$/)
    if (!match) return { status: 'unsupported', errors: [`Unsupported JObject output line: ${entry}`], trace }
    const expression = match[2].replace(/,\s*$/, '')
    try { actual[match[1]] = evaluateExpression(expression, vars) }
    catch (error) { return { status: 'unsupported', errors: [error.message], trace } }
    trace.push(`Produced ${match[1]}`)
  }
  const pass = deeplyEqual(actual, expected)
  return { status: pass ? 'pass' : 'fail', actual, expected, trace, errors: [], message: pass ? 'Mock transformation matches expected JSON.' : 'Mock output differs from expected JSON.' }
}

function deeplyEqual(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return keysA.length === keysB.length && keysA.every(key => Object.prototype.hasOwnProperty.call(b, key) && deeplyEqual(a[key], b[key]))
}
