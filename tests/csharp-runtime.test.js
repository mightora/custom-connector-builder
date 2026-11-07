import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PROJECT } from '../src/studio-logic.js'
import { encodeTextBase64, decodeTextBase64, extractScriptUsings, buildCSharpHarness, parseCSharpOutput } from '../src/csharp-runtime.js'

const sample = DEFAULT_PROJECT.files

test('UTF-8 fixtures round-trip through the C# runner envelope', () => {
  const text = '{"title":"Résumé 🦊", "content":"日本語"}'
  assert.equal(decodeTextBase64(encodeTextBase64(text)), text)
})

test('C# harness includes the actual script and a strictly local ScriptBase test adapter', () => {
  const source = buildCSharpHarness(sample['script.csx'], sample['request.json'])
  assert.match(source, /public class Script : ScriptBase/)
  assert.match(source, /ScriptContext/)
  assert.match(source, /JObject\.Parse/)
  assert.match(source, /Console\.WriteLine\("__MIGHTORA_RESPONSE_V1__:/)
  assert.match(source, /#line 1 "script\.csx"/)
  assert.doesNotMatch(source, /new HttpClient\(\)/)
})

test('user usings are lifted into compilation preamble', () => {
  const { usings, code } = extractScriptUsings('using System.Linq;\nusing System.Collections.Generic;\npublic class Script {}')
  assert.deepEqual(usings, ['using System.Linq;', 'using System.Collections.Generic;'])
  assert.match(code, /public class Script/)
  assert.doesNotMatch(code, /using System/)
})

test('Roslyn diagnostics are returned instead of false success', () => {
  const result = parseCSharpOutput({ success: false, diagnostics: [{ id: 'CS1002', severity: 'Error', message: '; expected' }] }, '{}')
  assert.equal(result.status, 'error')
  assert.equal(result.diagnostics[0].id, 'CS1002')
})

test('real C# harness output matches expected JSON independent of object key order', () => {
  const response = JSON.stringify({ Value1: 'hello', Value2: 'WORLD' })
  const result = parseCSharpOutput({ success: true, stdOut: `__MIGHTORA_RESPONSE_V1__:200:${encodeTextBase64(response)}\n`, diagnostics: [] }, '{"Value2":"WORLD","Value1":"hello"}')
  assert.equal(result.status, 'pass')
  assert.equal(result.httpStatus, 200)
})

test('real C# harness mismatches and exceptions fail', () => {
  const mismatch = parseCSharpOutput({ success: true, stdOut: `__MIGHTORA_RESPONSE_V1__:200:${encodeTextBase64('{}')}`, diagnostics: [] }, '{"expected":true}')
  assert.equal(mismatch.status, 'fail')
  const exception = parseCSharpOutput({ success: true, stdOut: '__MIGHTORA_EXCEPTION_V1__:System.InvalidOperationException' }, '{}')
  assert.equal(exception.status, 'error')
})
