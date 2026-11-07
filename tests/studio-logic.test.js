import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PROJECT, analyseScript, validateOpenApi, runMockPreview } from '../src/studio-logic.js'

const fixture = DEFAULT_PROJECT.files

test('baseline script has no structural errors and matches the expected response', () => {
  assert.equal(analyseScript(fixture['script.csx']).filter(item => item.severity === 'error').length, 0)
  const result = runMockPreview(fixture['script.csx'], fixture['request.json'], fixture['expected.json'])
  assert.equal(result.status, 'pass')
  assert.equal(result.actual.Value2, 'Processed: HELLO CONNECTOR')
})

test('an incorrect expected value produces fail, not pass', () => {
  assert.equal(runMockPreview(fixture['script.csx'], fixture['request.json'], '{"Value2":"different"}').status, 'fail')
})

test('invalid JSON is reported as an error', () => {
  assert.equal(runMockPreview(fixture['script.csx'], '{bad json', fixture['expected.json']).status, 'error')
})

test('unsupported branching is not misrepresented as executable C#', () => {
  const modified = fixture['script.csx'].replace('var cleaned =', 'if (value == "x") return response;\n        var cleaned =')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('unsupported network calls are not simulated', () => {
  const modified = fixture['script.csx'].replace('var cleaned =', 'await this.Context.SendAsync(this.Context.Request, this.CancellationToken);\n        var cleaned =')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('assignments that change variables reject the preview', () => {
  const modified = fixture['script.csx'].replace('var result = new JObject', 'cleaned = "unexpected";\n        var result = new JObject')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('unsupported output expressions reject rather than fabricated success', () => {
  const modified = fixture['script.csx'].replace('$"Processed: {cleaned}"', 'MakeRemoteRequest()')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('unrecognised side-effect calls are not silently ignored', () => {
  const modified = fixture['script.csx'].replace('var cleaned =', 'SideEffect();\n        var cleaned =')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('extra return paths are refused', () => {
  const modified = fixture['script.csx'].replace('var cleaned =', 'return response;\n        var cleaned =')
  assert.equal(runMockPreview(modified, fixture['request.json'], fixture['expected.json']).status, 'unsupported')
})

test('balanced C# script remains valid with brackets inside strings and comments', () => {
  const modified = fixture['script.csx'].replace('// Step 1:', '// { [ ] ) Step 1:')
  assert.equal(analyseScript(modified).filter(item => item.severity === 'error').length, 0)
})

test('missing braces are flagged', () => {
  const modified = fixture['script.csx'].slice(0, -1)
  assert.ok(analyseScript(modified).some(item => item.severity === 'error'))
})

test('valid Swagger 2.0 passes basic checks', () => {
  assert.equal(validateOpenApi(fixture['openapi.yaml']).some(item => item.severity === 'error'), false)
})

test('YAML parsing errors and invalid Swagger versions are reported', () => {
  assert.equal(validateOpenApi('swagger: [').some(item => item.severity === 'error'), true)
  assert.equal(validateOpenApi(fixture['openapi.yaml'].replace("'2.0'", "'3.0'")).some(item => item.severity === 'error'), true)
})

test('duplicate operation IDs are flagged', () => {
  const invalid = fixture['openapi.yaml'] + `\n  /other:\n    get:\n      operationId: TransformText\n      responses:\n        '200':\n          description: OK\n`
  assert.ok(validateOpenApi(invalid).some(item => item.message.includes('Duplicate operationId')))
})
