const GPT_PROMPT_TEMPLATE_VERSION = '2.0'

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

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function toCamelCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[^a-zA-Z]+/, '')
  const safe = cleaned || 'Value1'
  return safe.charAt(0).toLowerCase() + safe.slice(1)
}

function escapeForCSharpComment(str) {
  return String(str || '').replace(/\r?\n/g, ' ').trim()
}

function buildInputExtractionLines(valuesIn) {
  return valuesIn
    .map((field) => {
      const varName = toCamelCase(field)
      return `        var ${varName} = input["${field}"]?.Value<string>() ?? string.Empty;`
    })
    .join('\n')
}

function buildOutputResultLines(valuesIn, valuesOut) {
  const outputFields = valuesOut.length ? valuesOut : ['Value2']
  const inputFields = valuesIn.length ? valuesIn : ['Value1']
  const primaryInput = inputFields[0]
  const primaryInputVar = toCamelCase(primaryInput)

  const outputLines = outputFields.map((field) => {
    if (field.toLowerCase() === 'value2') {
      return `            ["${field}"] = $"Hello! You sent: {${primaryInputVar}}",`
    }
    return `            ["${field}"] = string.Empty,`
  })

  const echoLines = inputFields.map((field) => {
    const varName = toCamelCase(field)
    return `            ["${field}"] = ${varName},`
  })

  return `${outputLines.join('\n')}\n${echoLines.join('\n')}`
}

function buildCSharpFiveStepExample(valuesIn, valuesOut, processingInstructions) {
  const inputFields = valuesIn.length ? valuesIn : ['Value1']
  const extractionLines = buildInputExtractionLines(inputFields)
  const resultLines = buildOutputResultLines(inputFields, valuesOut)
  const processingText = escapeForCSharpComment(processingInstructions)

  return `public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Step 1: Read the incoming request body
        var contentAsString = await this.Context.Request.Content
            .ReadAsStringAsync().ConfigureAwait(false);

        // Step 2: Parse the JSON body
        JObject input;
        try
        {
            input = JObject.Parse(contentAsString);
        }
        catch
        {
            return new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = CreateJsonContent("{\\"error\\": \\"Invalid JSON in request body\\"}")
            };
        }

        // Step 3: Read values from the incoming request
${extractionLines}

        // Step 4: Apply processing and build the response
        // Processing instructions: ${processingText || 'No custom processing instructions provided.'}
        var result = new JObject
        {
${resultLines}
        };

        // Step 5: Return the response
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = CreateJsonContent(result.ToString())
        };

        return response;
    }
}`
}

function buildGptPrompt(valuesIn, valuesOut, sampleInput, processingInstructions) {
  const formattedInputs = valuesIn.length ? valuesIn.map((v) => `- ${v}`).join('\n') : '- Value1'
  const formattedOutputs = valuesOut.length ? valuesOut.map((v) => `- ${v}`).join('\n') : '- Value2'
  const exampleCode = buildCSharpFiveStepExample(valuesIn, valuesOut, processingInstructions)

  return `You are generating C# code for a Power Platform custom connector policy template.

Important platform constraints:
- Runtime target: .NET Standard 2.0
- Maximum execution time: 5 seconds
- Maximum script size: 1 MB

Only use these namespaces:
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using System.Xml.Linq;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

Required behavior:
1. Return complete C# code for a Script class inheriting from ScriptBase.
2. Keep this exact 5-step structure with comments in order:
  - Step 1: Read the incoming request body
  - Step 2: Parse the JSON body
  - Step 3: Read values from the incoming request
  - Step 4: Apply processing and build the response
  - Step 5: Return the response
3. Read these incoming values from the request JSON body:
${formattedInputs}
4. Return these outgoing values in the response JSON body:
${formattedOutputs}
5. Always echo all input values back in the response for debugging.
6. Include robust error handling for invalid JSON.
7. Keep logic efficient to stay within 5 seconds execution.

Requested processing behavior before output:
${processingInstructions?.trim() || 'No custom processing provided. Keep default response behavior.'}

Sample incoming JSON payload:
${sampleInput || '{\n  "Value1": "Example"\n}'}

Use this example as the required baseline and then finalize it for production:

${exampleCode}

Output requirements:
- Output only C# code.
- Do not include markdown fences.
- Use JObject for parsing input and building response.
- Return HttpStatusCode.OK for successful execution.

Prompt template version: ${GPT_PROMPT_TEMPLATE_VERSION}`
}

function initGptPromptBuilder() {
  const valuesInEl = document.getElementById('prompt-values-in')
  const valuesOutEl = document.getElementById('prompt-values-out')
  const processingEl = document.getElementById('prompt-processing-instructions')
  const sampleInputEl = document.getElementById('prompt-sample-input')
  const outputEl = document.getElementById('gpt-prompt-output')
  const copyBtn = document.getElementById('copy-gpt-prompt-btn')

  if (!valuesInEl || !valuesOutEl || !processingEl || !sampleInputEl || !outputEl) return

  const refreshPrompt = () => {
    const valuesIn = parseCsvList(valuesInEl.value)
    const valuesOut = parseCsvList(valuesOutEl.value)
    outputEl.textContent = buildGptPrompt(
      valuesIn,
      valuesOut,
      sampleInputEl.value.trim(),
      processingEl.value.trim()
    )
  }

  valuesInEl.addEventListener('input', refreshPrompt)
  valuesOutEl.addEventListener('input', refreshPrompt)
  processingEl.addEventListener('input', refreshPrompt)
  sampleInputEl.addEventListener('input', refreshPrompt)

  copyBtn?.addEventListener('click', () => {
    copyToClipboard(outputEl.textContent || '', copyBtn)
    showNotice('Prompt copied to clipboard.', 'success')
  })

  refreshPrompt()
}

// ── Initialise ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGptPromptBuilder()
})
