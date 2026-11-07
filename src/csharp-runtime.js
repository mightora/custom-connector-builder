/**
 * C# is compiled with Roslyn and executed by .NET WebAssembly in a browser Web
 * Worker. No code or fixtures are submitted to a hosted compiler.
 *
 * This is a local approximation of the Microsoft custom connector ScriptBase
 * contract, NOT the Microsoft-hosted runtime or an isolation/security boundary.
 */

const OUTPUT_MARKER = '__MIGHTORA_RESPONSE_V1__:'
const ERROR_MARKER = '__MIGHTORA_EXCEPTION_V1__:'

let runtimePromise

export function encodeTextBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}

export function decodeTextBase64(encoded) {
  return new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0)))
}

export function extractScriptUsings(script) {
  const usings = []
  const code = script.replace(/^\s*(?:global\s+)?using\s+[^;\r\n]+;[ \t]*$/gm, line => {
    usings.push(line.trim())
    return ''
  })
  return { usings, code }
}

const SHIM = `
// Local testing equivalents of a subset of the Power Platform ScriptBase API.
public abstract class ScriptBase
{
    public ScriptContext Context { get; } = new ScriptContext();
    public CancellationToken CancellationToken => CancellationToken.None;
    protected static HttpContent CreateJsonContent(string json) =>
        new StringContent(json, Encoding.UTF8, "application/json");
    public abstract Task<HttpResponseMessage> ExecuteAsync();
}

public sealed class ScriptContext
{
    public HttpRequestMessage Request { get; set; } = new HttpRequestMessage();
    public string OperationId { get; set; } = "TransformText";

    // The browser harness does not contact the target API. For a proxy script
    // this deterministic stub echoes its outgoing body as the response.
    public async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        var body = request.Content == null ? "{}" : await request.Content.ReadAsStringAsync();
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
    }
}

// Small fixture-only JObject compatibility adapter. It is intentionally not
// the full Newtonsoft.Json implementation used by Microsoft custom connectors.
namespace Newtonsoft.Json.Linq
{
    public sealed class JToken
    {
        private readonly System.Text.Json.Nodes.JsonNode? _node;
        public JToken(System.Text.Json.Nodes.JsonNode? node) { _node = node; }
        public T? Value<T>() => _node == null ? default : _node.GetValue<T>();
        internal System.Text.Json.Nodes.JsonNode? Clone() => _node?.DeepClone();
        public static implicit operator JToken(string value) =>
            new JToken(System.Text.Json.Nodes.JsonValue.Create(value));
        public static implicit operator JToken(int value) =>
            new JToken(System.Text.Json.Nodes.JsonValue.Create(value));
        public static implicit operator JToken(bool value) =>
            new JToken(System.Text.Json.Nodes.JsonValue.Create(value));
    }

    public sealed class JObject
    {
        private readonly System.Text.Json.Nodes.JsonObject _obj;
        public JObject() { _obj = new System.Text.Json.Nodes.JsonObject(); }
        private JObject(System.Text.Json.Nodes.JsonObject obj) { _obj = obj; }
        public static JObject Parse(string json) =>
            new JObject(System.Text.Json.Nodes.JsonNode.Parse(json) as System.Text.Json.Nodes.JsonObject
                ?? throw new FormatException("Expected a JSON object"));
        public JToken? this[string key]
        {
            get => _obj[key] is { } node ? new JToken(node) : null;
            set => _obj[key] = value?.Clone();
        }
        public override string ToString() => _obj.ToJsonString();
    }
}
`

/** Build a real C# program around the custom connector script and input fixture. */
export function buildCSharpHarness(script, requestText) {
  const { usings, code } = extractScriptUsings(script)
  const encoded = encodeTextBase64(requestText)
  return `using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
${usings.join('\n')}

try
{
    var script = new Script();
    script.Context.Request = new HttpRequestMessage(HttpMethod.Post, "https://api.local/transform")
    {
        Content = new StringContent(Encoding.UTF8.GetString(Convert.FromBase64String("${encoded}")), Encoding.UTF8, "application/json")
    };
    var response = await script.ExecuteAsync();
    var body = response.Content == null ? "" : await response.Content.ReadAsStringAsync();
    Console.WriteLine("${OUTPUT_MARKER}" + (int)response.StatusCode + ":" +
        Convert.ToBase64String(Encoding.UTF8.GetBytes(body)));
}
catch (Exception ex)
{
    Console.WriteLine("${ERROR_MARKER}" + ex.ToString());
}

${SHIM}

#line 1 "script.csx"
${code}
`
}

export function parseCSharpOutput(result, expectedText) {
  const diagnostics = (result.diagnostics || []).filter(d => d.severity === 'Error' || d.severity === 'Warning')
  if (!result.success) return { status: 'error', diagnostics, output: result.stdErr || '', message: 'C# compilation or execution failed' }
  const stdout = result.stdOut || ''
  const exception = stdout.split(/\r?\n/).find(line => line.startsWith(ERROR_MARKER))
  if (exception) return { status: 'error', diagnostics, output: stdout, message: exception.slice(ERROR_MARKER.length) }
  const response = stdout.split(/\r?\n/).find(line => line.startsWith(OUTPUT_MARKER))
  if (!response) return { status: 'error', diagnostics, output: stdout, message: 'No response received from the C# harness' }
  const match = response.slice(OUTPUT_MARKER.length).match(/^(\d{3}):([A-Za-z0-9+/=]*)$/)
  if (!match) return { status: 'error', diagnostics, output: stdout, message: 'Invalid C# harness response' }
  const httpStatus = Number(match[1])
  const responseText = decodeTextBase64(match[2])
  let actual
  let expected
  try { actual = JSON.parse(responseText) } catch { actual = responseText }
  try { expected = JSON.parse(expectedText) } catch { expected = expectedText }
  const normalize = value => JSON.stringify(sortJson(value))
  const matches = normalize(actual) === normalize(expected)
  return { status: matches ? 'pass' : 'fail', actual, expected, httpStatus, diagnostics, output: stdout.replace(response + '\n', '').trim(), message: matches ? 'Real C# response matches the fixture' : 'Real C# response differs from the fixture' }
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]))
  return value
}

export async function loadCSharpRuntime(onProgress) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      // This URL is served verbatim from the npm package, not processed by Vite.
      // @vite-ignore preserves the relative imports and worker/wasm asset paths.
      const module = await import(/* @vite-ignore */ new URL('./runtime/WasmCompiler.js', document.baseURI).href)
      return module.WasmSharpModule.initializeAsync({
        onDownloadResourceProgress(loaded, total) { onProgress?.(`Loading .NET components: ${loaded}/${total}`) }
      })
    })().catch(error => { runtimePromise = undefined; throw error })
  }
  return runtimePromise
}

export async function runCSharp(script, requestText, expectedText, onProgress) {
  onProgress?.('Starting .NET WebAssembly and Roslyn…')
  const runtime = await loadCSharpRuntime(onProgress)
  onProgress?.('Compiling C# with Roslyn…')
  const compilation = await runtime.createCompilationAsync(buildCSharpHarness(script, requestText))
  onProgress?.('Running compiled C# in the browser…')
  return parseCSharpOutput(await compilation.run(), expectedText)
}
