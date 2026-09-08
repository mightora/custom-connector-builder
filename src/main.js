import regexTesterMd from '../connectors/01-regex-tester.md?raw'
import markdownHtmlMd from '../connectors/02-markdown-html-converter.md?raw'
import compareJsonMd from '../connectors/03-compare-json-lists.md?raw'
import businessRulesMd from '../connectors/04-business-rules-calculator.md?raw'
import pricingCalculatorMd from '../connectors/05-pricing-calculator.md?raw'
import jsonCalculationMd from '../connectors/06-json-calculation-engine.md?raw'

const CONNECTORS = [
  {
    id: 'regex-tester',
    fileId: '01-regex-tester',
    title: 'Regex Tester',
    description: 'Accepts a text value and a regular expression, validates the expression, tests it against the supplied text, and returns whether it matched and corresponding values.',
    icon: '🔍',
    tags: ['Validation', 'String Processing', 'No-Backend'],
    markdown: regexTesterMd,
    helperId: 'regex-tester'
  },
  {
    id: 'markdown-html-converter',
    fileId: '02-markdown-html-converter',
    title: 'Markdown / HTML Converter',
    description: 'Converts content bi-directionally between Markdown and HTML using local C# logic. Suitable for quick styling adjustments without third-party services.',
    icon: '📝',
    tags: ['Format Conversion', 'Utility', 'Bidirectional'],
    markdown: markdownHtmlMd,
    helperId: 'markdown-html-converter'
  },
  {
    id: 'compare-json-lists',
    fileId: '03-compare-json-lists',
    title: 'Compare JSON Lists',
    description: 'Compares two JSON lists of items, identifying exact duplicates/matches, items only in list 1, and items only in list 2, with detailed row counts.',
    icon: '📊',
    tags: ['JSON Handling', 'Data Comparison', 'Performance'],
    markdown: compareJsonMd,
    helperId: 'compare-json-lists'
  },
  {
    id: 'business-rules-calculator',
    fileId: '04-business-rules-calculator',
    title: 'Business Rules Calculator',
    description: 'Exposes an action that evaluates customer data against business rules to compute pricing adjustments or scoring values in real time.',
    icon: '⚙️',
    tags: ['Calculations', 'Audit Trail', 'Rules Engine'],
    markdown: businessRulesMd,
    helperId: 'business-rules-calculator'
  },
  {
    id: 'pricing-calculator',
    fileId: '05-pricing-calculator',
    title: 'Pricing Calculator',
    description: 'A dedicated pricing rules engine. Computes total product cost with volume tiers, geographical adaptations, loyalty perks, and provides a full audit trail.',
    icon: '💰',
    tags: ['Pricing', 'Tier Adjustments', 'Audit Trail', 'Recommended'],
    markdown: pricingCalculatorMd,
    helperId: 'pricing-calculator'
  },
  {
    id: 'json-calculation-engine',
    fileId: '06-json-calculation-engine',
    title: 'JSON Calculation Engine',
    description: 'Calculates custom columns row-over-row sequentially and extracts aggregate summaries like totals, averages, and counts on JSON array payloads.',
    icon: '🧮',
    tags: ['Dynamic Formula', 'Math Pipeline', 'Bulk Calculations'],
    markdown: jsonCalculationMd,
    helperId: 'json-calculation-engine'
  }
]

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

function buildCSharpLocalExample(valuesIn, valuesOut, processingInstructions) {
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

function buildCSharpProxyExample(valuesIn, valuesOut, processingInstructions) {
  const inputFields = valuesIn.length ? valuesIn : ['Value1']
  const extractionLines = buildInputExtractionLines(inputFields)
  const resultLines = buildOutputResultLines(inputFields, valuesOut)
  const processingText = escapeForCSharpComment(processingInstructions)

  return `public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Step 1: Read and modify incoming Request
        // Optionally inspect or modify request headers, query parameters, or body
        // var contentAsString = await this.Context.Request.Content.ReadAsStringAsync().ConfigureAwait(false);

        // Example: Inject API Key authentication header
        // this.Context.Request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "API_KEY_HERE");

        // Step 2: Forward request across the internet to the backend
        var response = await this.Context.SendAsync(this.Context.Request, this.Context.Logger).ConfigureAwait(false);

        // Step 3: Check response status and compile errors
        if (response.StatusCode == HttpStatusCode.OK)
        {
            // Step 4: Transform outgoing response body
            // Processing instructions: ${processingText || 'No custom processing instructions provided.'}
            var responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            var backendJson = JObject.Parse(responseContent);

            // Read values from backend JSON
            // (Simulated using input fields for illustration, update as needed)
${extractionLines.replace(/input/g, 'backendJson')}

            var result = new JObject
            {
${resultLines}
            };

            response.Content = CreateJsonContent(result.ToString());
        }
        else
        {
            // Handle error response from backend API
            var errorContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            var errorResult = new JObject
            {
                ["error"] = $"Backend returned status {(int)response.StatusCode}",
                ["details"] = errorContent
            };
            response.Content = CreateJsonContent(errorResult.ToString());
        }

        // Step 5: Return final response
        return response;
    }
}`
}

function buildGptPrompt(valuesIn, valuesOut, sampleInput, processingInstructions, connectorName, operationId, isExternal, hostName) {
  const cTitle = connectorName || 'Custom Utility'
  const opId = operationId || 'ExecuteAction'
  const hostVal = isExternal ? (hostName || 'api.example.com') : 'api.local'
  const formattedInputs = valuesIn.length ? valuesIn.map((v) => `- ${v}`).join('\n') : '- Value1'
  const formattedOutputs = valuesOut.length ? valuesOut.map((v) => `- ${v}`).join('\n') : '- Value2'
  const exampleCode = isExternal 
    ? buildCSharpProxyExample(valuesIn, valuesOut, processingInstructions)
    : buildCSharpLocalExample(valuesIn, valuesOut, processingInstructions)

  return `You are generating both the OpenAPI/Swagger 2.0 definition and the Custom C# Script for a Power Platform Custom Connector.

Platform & Runtime Constraints:
- Script Runtime target: .NET Standard 2.0
- Maximum execution time: 5 seconds
- Maximum script size: 1 MB
- Host API Domain: ${hostVal}
- Connection type: ${isExternal ? 'Proxy / External API Backend' : 'Local Code Execution (No Backend API required)'}

Only use these allowed namespaces in C#:
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

---

SECTION 1: Swagger 2.0 API Definition
Please generate a complete, valid OpenAPI/Swagger 2.0 definition in YAML format for this connector.
Integration specs:
- Title: ${cTitle}
- Host: ${hostVal}
- BasePath: /
- Schemes: ['https']
- Operation: POST /${opId.toLowerCase()}
- Operation ID: ${opId}
- Consumes/Produces: application/json
- Parameters:
  - Expects a JSON object in the body with the following fields:
${formattedInputs}
- Responses:
  - 200 OK: Returns a JSON object with the following fields:
${formattedOutputs}

---

SECTION 2: Custom C# Script Code
Please generate ready-to-compile C# code for a Script class inheriting from ScriptBase.
Required logic:
1. Class must inherit from ScriptBase and override ExecuteAsync().
2. You must strictly use this exact 5-step numbered comments inside ExecuteAsync():
${isExternal ? `  - Step 1: Read and modify incoming Request
  - Step 2: Forward request across the internet to the backend
  - Step 3: Check response status and compile errors
  - Step 4: Transform outgoing response body
  - Step 5: Return final response` : `  - Step 1: Read the incoming request body
  - Step 2: Parse the JSON body
  - Step 3: Read values from the incoming request
  - Step 4: Apply processing and build the response
  - Step 5: Return the response`}
3. Parse these incoming fields from the JSON payload:
${formattedInputs}
4. Apply the requested processing behavior:
${processingInstructions?.trim() || 'No custom processing provided.'}
5. Return these outgoing fields in the output JSON payload:
${formattedOutputs}
6. Always echo all input fields back in the response object to aid in validation and debugging.
7. Wrap your reading logic in try-catch to safely catch malformed JSON and return custom HTTP 400.
8. Maintain highly efficient code (stay under 5s).

Sample JSON payload structure for inputs:
${sampleInput || '{\n  "Value1": "Example"\n}'}

Use this Example Code as the baseline design and complete it:

${exampleCode}

---

Output formatting instructions:
- Place the Swagger 2.0 configuration inside a single 'yaml' fenced code block.
- Place the C# script code inside a single 'csharp' fenced code block.
- Do not add any preamble, conversational greeting, explanation, or notes. Output exactly and only the two code blocks.

Prompt template version: ${GPT_PROMPT_TEMPLATE_VERSION}`
}

function initGptPromptBuilder() {
  const presetEl = document.getElementById('prompt-preset')
  const connectorNameEl = document.getElementById('prompt-connector-name')
  const operationIdEl = document.getElementById('prompt-operation-id')
  const modeLocalEl = document.getElementById('mode-local')
  const modeExternalEl = document.getElementById('mode-external')
  const hostNameContainer = document.getElementById('host-name-container')
  const hostNameEl = document.getElementById('prompt-host-name')
  const valuesInEl = document.getElementById('prompt-values-in')
  const valuesOutEl = document.getElementById('prompt-values-out')
  const processingEl = document.getElementById('prompt-processing-instructions')
  const sampleInputEl = document.getElementById('prompt-sample-input')
  const outputEl = document.getElementById('gpt-prompt-output')
  const copyBtn = document.getElementById('copy-gpt-prompt-btn')

  if (!valuesInEl || !valuesOutEl || !processingEl || !sampleInputEl || !outputEl) return

  const PROMPT_PRESETS = {
    'math-utility': {
      name: "Math Calculator",
      operationId: "CalculateArea",
      isExternal: false,
      hostname: "api.local",
      inputs: "length, width",
      outputs: "area, perimeter",
      processing: "Calculate the area as length times width, and perimeter as 2 * (length + width). Ensure handling of decimal/double values formatted from strings, and return results.",
      sampleJson: "{\n  \"length\": \"12.5\",\n  \"width\": \"4.0\"\n}"
    },
    'text-formatter': {
      name: "Text Formatter",
      operationId: "FormatString",
      isExternal: false,
      hostname: "api.local",
      inputs: "rawText, casingMode",
      outputs: "formattedText, charactersCount",
      processing: "Trim the rawText. If casingMode is 'upper', convert the text to uppercase. If casingMode is 'lower', convert it to lowercase. Return the new string in formattedText and its length in charactersCount.",
      sampleJson: "{\n  \"rawText\": \"   Hello Custom Connector!   \",\n  \"casingMode\": \"upper\"\n}"
    },
    'header-auth': {
      name: "Secured External Service",
      operationId: "FetchSecuredStatus",
      isExternal: true,
      hostname: "api.secureservice.com",
      inputs: "userId, queryType",
      outputs: "status, lastUpdated, rawData",
      processing: "Intercept request, append 'X-API-Key: confidential-api-token-value' to headers, forward to host, then parse backend response JSON to return status and rawData directly.",
      sampleJson: "{\n  \"userId\": \"usr_98ae8b\",\n  \"queryType\": \"detailed\"\n}"
    },
    'payload-filter': {
      name: "External Data Filter",
      operationId: "SearchItems",
      isExternal: true,
      hostname: "api.inventory.com",
      inputs: "category, minRating",
      outputs: "matchingCount, filteredItems",
      processing: "Forward request to the inventory host. From the returned backend array, filter the list of items to only include those matching the category and having a rating >= minRating. Return the final reduced list as filteredItems along with matchingCount.",
      sampleJson: "{\n  \"category\": \"electronics\",\n  \"minRating\": 4.5\n}"
    }
  }

  const toggleHostField = () => {
    const isExternal = modeExternalEl?.checked
    if (hostNameContainer) {
      hostNameContainer.style.display = isExternal ? 'block' : 'none'
    }
  }

  const refreshPrompt = () => {
    const valuesIn = parseCsvList(valuesInEl.value)
    const valuesOut = parseCsvList(valuesOutEl.value)
    const connectorName = connectorNameEl?.value || 'Custom Utility'
    const operationId = operationIdEl?.value || 'ExecuteAction'
    const isExternal = !!modeExternalEl?.checked
    const hostName = hostNameEl?.value || 'api.example.com'

    outputEl.textContent = buildGptPrompt(
      valuesIn,
      valuesOut,
      sampleInputEl.value.trim(),
      processingEl.value.trim(),
      connectorName,
      operationId,
      isExternal,
      hostName
    )
  }

  // Preset Selection Event
  presetEl?.addEventListener('change', () => {
    const selectedPresetKey = presetEl.value
    if (selectedPresetKey === 'custom' || !PROMPT_PRESETS[selectedPresetKey]) return

    const preset = PROMPT_PRESETS[selectedPresetKey]

    if (connectorNameEl) connectorNameEl.value = preset.name
    if (operationIdEl) operationIdEl.value = preset.operationId
    if (valuesInEl) valuesInEl.value = preset.inputs
    if (valuesOutEl) valuesOutEl.value = preset.outputs
    if (processingEl) processingEl.value = preset.processing
    if (sampleInputEl) sampleInputEl.value = preset.sampleJson

    if (preset.isExternal) {
      if (modeExternalEl) modeExternalEl.checked = true
      if (modeLocalEl) modeLocalEl.checked = false
      if (hostNameEl) hostNameEl.value = preset.hostname
    } else {
      if (modeLocalEl) modeLocalEl.checked = true
      if (modeExternalEl) modeExternalEl.checked = false
    }

    toggleHostField()
    refreshPrompt()
  })

  // Inputs Event Listeners
  connectorNameEl?.addEventListener('input', refreshPrompt)
  operationIdEl?.addEventListener('input', refreshPrompt)
  modeLocalEl?.addEventListener('change', () => { toggleHostField(); refreshPrompt(); })
  modeExternalEl?.addEventListener('change', () => { toggleHostField(); refreshPrompt(); })
  hostNameEl?.addEventListener('input', refreshPrompt)
  valuesInEl.addEventListener('input', refreshPrompt)
  valuesOutEl.addEventListener('input', refreshPrompt)
  processingEl.addEventListener('input', refreshPrompt)
  sampleInputEl.addEventListener('input', refreshPrompt)

  copyBtn?.addEventListener('click', () => {
    copyToClipboard(outputEl.textContent || '', copyBtn)
    showNotice('Prompt copied to clipboard.', 'success')
  })

  toggleHostField()
  refreshPrompt()
}

// ── Sandbox Helpers ────────────────────────────────────────────

function createRegexTesterTool() {
  const div = document.createElement('div')
  div.className = 'sandbox-tool'
  div.innerHTML = `
    <div class="form-group mb-2">
      <label for="reg-text" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Text to test against</label>
      <textarea id="reg-text" class="form-control" rows="3" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.85rem;">Incident INC-12345 has priority P1</textarea>
    </div>
    <div class="form-group mb-3">
      <label for="reg-pattern" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Regular Expression (C# style)</label>
      <input id="reg-pattern" type="text" value="INC-\\d+" class="form-control" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-family:var(--ccb-font-mono); font-size:0.85rem;" />
    </div>
    <div class="sandbox-results" style="background:var(--ccb-neutral-50); border-radius:8px; padding:1rem; border:1px solid var(--ccb-neutral-200);">
      <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700;">Local Execution Result (C# simulation)</h4>
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        <span style="font-size:0.8rem; color:var(--ccb-neutral-600);">isMatch:</span>
        <span id="reg-is-match" style="font-weight:700; font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:4px;">FALSE</span>
      </div>
      <div style="margin-bottom:0.5rem;">
        <span style="font-size:0.8rem; color:var(--ccb-neutral-600); display:block; margin-bottom:0.15rem;">match value:</span>
        <strong id="reg-match" style="font-family:var(--ccb-font-mono); font-size:0.85rem; background:#fff; padding:0.25rem 0.5rem; border:1px solid var(--ccb-neutral-200); border-radius:4px; display:block; min-height:1.8rem; word-break:break-all;">N/A</strong>
      </div>
      <div id="reg-error-box" class="notice notice--danger" style="display:none; padding:0.5rem; margin:0.5rem 0 0; font-size:0.8rem; border-radius:4px; border: 1px solid var(--ccb-error);"></div>
    </div>
  `

  const textEl = div.querySelector('#reg-text')
  const patternEl = div.querySelector('#reg-pattern')
  const isMatchEl = div.querySelector('#reg-is-match')
  const matchEl = div.querySelector('#reg-match')
  const errorEl = div.querySelector('#reg-error-box')

  function runMatch() {
    errorEl.style.display = 'none'
    const text = textEl.value
    const pattern = patternEl.value

    if (!pattern) {
      isMatchEl.textContent = 'FALSE'
      isMatchEl.style.background = 'var(--ccb-error-light)'
      isMatchEl.style.color = 'var(--ccb-error)'
      matchEl.textContent = 'N/A'
      return
    }

    try {
      const reg = new RegExp(pattern)
      const match = text.match(reg)
      if (match) {
        isMatchEl.textContent = 'TRUE'
        isMatchEl.style.background = 'var(--ccb-success-light)'
        isMatchEl.style.color = 'var(--ccb-success)'
        matchEl.textContent = match[0]
      } else {
        isMatchEl.textContent = 'FALSE'
        isMatchEl.style.background = 'var(--ccb-error-light)'
        isMatchEl.style.color = 'var(--ccb-error)'
        matchEl.textContent = 'No match found'
      }
    } catch (e) {
      isMatchEl.textContent = 'ERROR'
      isMatchEl.style.background = 'var(--ccb-warning-light)'
      isMatchEl.style.color = 'var(--ccb-warning)'
      matchEl.textContent = 'N/A'
      errorEl.textContent = `Regex Error: ${e.message}`
      errorEl.style.display = 'block'
    }
  }

  textEl.addEventListener('input', runMatch)
  patternEl.addEventListener('input', runMatch)
  setTimeout(runMatch, 0)

  return div
}

function htmlToMarkdown(htmlStr) {
  let text = String(htmlStr || '')
  // Replace headings
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  // Replace bold
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  // Replace italic
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
  // Replace links
  text = text.replace(/<a\s+[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  // Replace paragraphs
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
  // Replace list items
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
  // Strip tags
  text = text.replace(/<[^>]+>/g, '')
  // Clean excessive spaces and newlines
  text = text.replace(/\r/g, '')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function createMarkdownHtmlTool() {
  const div = document.createElement('div')
  div.className = 'sandbox-tool'
  div.innerHTML = `
    <div class="form-group mb-2">
      <label for="conv-direction" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Conversion Direction</label>
      <select id="conv-direction" class="form-control" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.85rem; background-color:#fff; cursor:pointer;">
        <option value="markdownToHtml">Markdown → HTML</option>
        <option value="htmlToMarkdown">HTML → Markdown</option>
      </select>
    </div>
    <div class="form-group mb-2">
      <label for="conv-input" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Input Content</label>
      <textarea id="conv-input" class="form-control" rows="5" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.85rem; font-family:var(--ccb-font-mono);"></textarea>
    </div>
    <div class="sandbox-results" style="background:var(--ccb-neutral-50); border-radius:8px; padding:1rem; border:1px solid var(--ccb-neutral-200);">
      <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700;">Output (C# simulation)</h4>
      <textarea id="conv-output" readonly rows="5" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.85rem; font-family:var(--ccb-font-mono); background-color:#fafafa; margin-bottom:0.75rem; border-color:var(--ccb-neutral-300);"></textarea>
      
      <div id="conv-preview-label" style="font-size:0.75rem; font-weight:700; color:var(--ccb-neutral-600); margin-bottom:0.25rem;">HTML Preview:</div>
      <div id="conv-preview" style="background:#fff; border:1px solid var(--ccb-neutral-200); border-radius:4px; padding:0.75rem; min-height:60px; font-size:0.85rem; overflow:auto;"></div>
    </div>
  `

  const directionEl = div.querySelector('#conv-direction')
  const inputEl = div.querySelector('#conv-input')
  const outputEl = div.querySelector('#conv-output')
  const previewEl = div.querySelector('#conv-preview')
  const previewLabelEl = div.querySelector('#conv-preview-label')

  const defaultMd = `# Sample Markdown\n\nThis is **bold** text and [this is a link](https://mightora.io).\n\n- Option A\n- Option B`
  const defaultHtml = `<h1>Sample HTML</h1>\n\n<p>This is <strong>bold</strong> text and <a href="https://mightora.io">this is a link</a>.</p>\n<ul>\n  <li>Option A</li>\n  <li>Option B</li>\n</ul>`

  inputEl.value = defaultMd

  function doConversion() {
    const dir = directionEl.value
    const input = inputEl.value

    if (dir === 'markdownToHtml') {
      previewLabelEl.style.display = 'block'
      previewEl.style.display = 'block'
      
      const html = window.marked ? window.marked.parse(input) : input
      outputEl.value = html
      previewEl.innerHTML = html
    } else {
      previewLabelEl.style.display = 'none'
      previewEl.style.display = 'none'
      
      const md = htmlToMarkdown(input)
      outputEl.value = md
    }
  }

  directionEl.addEventListener('change', () => {
    if (directionEl.value === 'markdownToHtml') {
      inputEl.value = defaultMd
    } else {
      inputEl.value = defaultHtml
    }
    doConversion()
  })

  inputEl.addEventListener('input', doConversion)
  setTimeout(doConversion, 0)

  return div
}

function createCompareJsonListsTool() {
  const div = document.createElement('div')
  div.className = 'sandbox-tool'
  div.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;" class="mb-2">
      <div class="form-group">
        <label for="cmp-list1" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">List 1 (JSON Array)</label>
        <textarea id="cmp-list1" class="form-control" rows="6" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.75rem; font-family:var(--ccb-font-mono);">[\n  {"id": 1, "name": "Ian"},\n  {"id": 2, "name": "Albert"},\n  {"id": 3, "name": "Emily"}\n]</textarea>
      </div>
      <div class="form-group">
        <label for="cmp-list2" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">List 2 (JSON Array)</label>
        <textarea id="cmp-list2" class="form-control" rows="6" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.75rem; font-family:var(--ccb-font-mono);">[\n  {"name": "Ian", "id": 1},\n  {"id": 2, "name": "Albert"},\n  {"id": 4, "name": "Sarah"}\n]</textarea>
      </div>
    </div>
    <div style="text-align:right;" class="mb-2">
      <button id="cmp-run-btn" class="btn btn--primary btn--sm" type="button">Compare Lists</button>
    </div>
    
    <div id="cmp-error-box" class="notice notice--danger mb-2" style="display:none; border-radius:4px; font-size:0.8rem; padding:0.5rem; border:1px solid var(--ccb-error);"></div>

    <div class="sandbox-results" style="background:var(--ccb-neutral-50); border-radius:8px; padding:1rem; border:1px solid var(--ccb-neutral-200);">
      <h4 style="margin:0 0 0.75rem 0; font-size:0.85rem; font-weight:700;">Comparison Result Summary</h4>
      
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem; margin-bottom:0.75rem; text-align:center;">
        <div style="background:#fff; border:1.5px solid var(--ccb-neutral-200); padding:0.4rem; border-radius:6px;">
          <span style="font-size:0.7rem; color:var(--ccb-neutral-600); display:block;">Matches</span>
          <strong id="cmp-count-match" style="font-size:1.1rem; color:var(--ccb-primary);">0</strong>
        </div>
        <div style="background:#fff; border:1.5px solid var(--ccb-neutral-200); padding:0.4rem; border-radius:6px;">
          <span style="font-size:0.7rem; color:var(--ccb-neutral-600); display:block;">Only in L1</span>
          <strong id="cmp-count-l1" style="font-size:1.1rem; color:var(--ccb-accent-dark);">0</strong>
        </div>
        <div style="background:#fff; border:1.5px solid var(--ccb-neutral-200); padding:0.4rem; border-radius:6px;">
          <span style="font-size:0.7rem; color:var(--ccb-neutral-600); display:block;">Only in L2</span>
          <strong id="cmp-count-l2" style="font-size:1.1rem; color:var(--ccb-warning);">0</strong>
        </div>
      </div>

      <div style="margin-bottom:0.5rem;">
        <label style="font-weight:700; font-size:0.7rem; display:block; margin-bottom:0.15rem; color:var(--ccb-neutral-600);">Matches (Present in Both):</label>
        <pre id="cmp-out-matches" style="background:#fff; color:var(--ccb-neutral-900); padding:0.5rem; border:1px solid var(--ccb-neutral-200); border-radius:4px; max-height:80px; overflow:auto; margin:0; font-size:0.72rem; font-family:var(--ccb-font-mono);"></pre>
      </div>

      <div style="margin-bottom:0.5rem;">
        <label style="font-weight:700; font-size:0.7rem; display:block; margin-bottom:0.15rem; color:var(--ccb-neutral-600);">Only in List 1:</label>
        <pre id="cmp-out-l1" style="background:#fff; color:var(--ccb-neutral-900); padding:0.5rem; border:1px solid var(--ccb-neutral-200); border-radius:4px; max-height:80px; overflow:auto; margin:0; font-size:0.72rem; font-family:var(--ccb-font-mono);"></pre>
      </div>

      <div>
        <label style="font-weight:700; font-size:0.7rem; display:block; margin-bottom:0.15rem; color:var(--ccb-neutral-600);">Only in List 2:</label>
        <pre id="cmp-out-l2" style="background:#fff; color:var(--ccb-neutral-900); padding:0.5rem; border:1px solid var(--ccb-neutral-200); border-radius:4px; max-height:80px; overflow:auto; margin:0; font-size:0.72rem; font-family:var(--ccb-font-mono);"></pre>
      </div>
    </div>
  `

  const list1El = div.querySelector('#cmp-list1')
  const list2El = div.querySelector('#cmp-list2')
  const runBtn = div.querySelector('#cmp-run-btn')
  const errorEl = div.querySelector('#cmp-error-box')

  const countMatchEl = div.querySelector('#cmp-count-match')
  const countL1El = div.querySelector('#cmp-count-l1')
  const countL2El = div.querySelector('#cmp-count-l2')

  const outMatchEl = div.querySelector('#cmp-out-matches')
  const outL1El = div.querySelector('#cmp-out-l1')
  const outL2El = div.querySelector('#cmp-out-l2')

  function sortKeys(obj) {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(sortKeys)
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortKeys(obj[key])
      return acc
    }, {})
  }

  function compare() {
    errorEl.style.display = 'none'
    let l1, l2
    try {
      l1 = JSON.parse(list1El.value)
      if (!Array.isArray(l1)) throw new Error('List 1 must be a valid JSON Array.')
    } catch (e) {
      errorEl.textContent = `List 1 Error: ${e.message}`
      errorEl.style.display = 'block'
      return
    }

    try {
      l2 = JSON.parse(list2El.value)
      if (!Array.isArray(l2)) throw new Error('List 2 must be a valid JSON Array.')
    } catch (e) {
      errorEl.textContent = `List 2 Error: ${e.message}`
      errorEl.style.display = 'block'
      return
    }

    const matches = []
    const onlyInL1 = []
    const onlyInL2 = [...l2]

    for (const item1 of l1) {
      const canonical1 = JSON.stringify(sortKeys(item1))
      let matchIdx = -1

      for (let i = 0; i < onlyInL2.length; i++) {
        const canonical2 = JSON.stringify(sortKeys(onlyInL2[i]))
        if (canonical1 === canonical2) {
          matchIdx = i
          break
        }
      }

      if (matchIdx !== -1) {
        matches.push(item1)
        onlyInL2.splice(matchIdx, 1)
      } else {
        onlyInL1.push(item1)
      }
    }

    countMatchEl.textContent = matches.length
    countL1El.textContent = onlyInL1.length
    countL2El.textContent = onlyInL2.length

    outMatchEl.textContent = JSON.stringify(matches, null, 2)
    outL1El.textContent = JSON.stringify(onlyInL1, null, 2)
    outL2El.textContent = JSON.stringify(onlyInL2, null, 2)
  }

  runBtn.addEventListener('click', compare)
  setTimeout(compare, 0)

  return div
}

function createPricingCalculatorTool() {
  const div = document.createElement('div')
  div.className = 'sandbox-tool'
  div.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
      <div class="form-group">
        <label for="pr-product" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Product</label>
        <select id="pr-product" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem; background:#fff; cursor:pointer;">
          <option value="Standard">Standard</option>
          <option value="Professional" selected>Professional</option>
          <option value="Enterprise">Enterprise</option>
        </select>
      </div>
      <div class="form-group">
        <label for="pr-region" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Region</label>
        <select id="pr-region" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem; background:#fff; cursor:pointer;">
          <option value="Europe" selected>Europe</option>
          <option value="NorthAmerica">North America</option>
          <option value="AsiaPacific">Asia Pacific</option>
          <option value="UK">United Kingdom (UK)</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
      <div class="form-group">
        <label for="pr-customer" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Customer Type</label>
        <select id="pr-customer" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem; background:#fff; cursor:pointer;">
          <option value="Standard">Standard</option>
          <option value="Partner">Partner</option>
          <option value="Government">Government</option>
          <option value="Education" selected>Education</option>
        </select>
      </div>
      <div class="form-group">
        <label for="pr-priority" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Priority Priority</label>
        <select id="pr-priority" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem; background:#fff; cursor:pointer;">
          <option value="Standard" selected>Standard</option>
          <option value="Priority">Priority</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem; margin-bottom:0.75rem;">
      <div class="form-group">
        <label for="pr-base-price" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Base Rate ($)</label>
        <input id="pr-base-price" type="number" min="0" value="100" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem;" />
      </div>
      <div class="form-group">
        <label for="pr-qty" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Quantity</label>
        <input id="pr-qty" type="number" min="1" value="25" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem;" />
      </div>
      <div class="form-group">
        <label for="pr-loyalty" style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.15rem;">Loyalty (Yrs)</label>
        <input id="pr-loyalty" type="number" min="0" value="4" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.8rem;" />
      </div>
    </div>

    <div class="sandbox-results" style="background:var(--ccb-neutral-50); border-radius:8px; padding:1rem; border:1px solid var(--ccb-neutral-200);">
      <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700;">Calculator Results (C# simulation)</h4>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.75rem; text-align:center;">
        <div style="background:#fff; border:1.5px solid var(--ccb-neutral-200); padding:0.35rem; border-radius:6px;">
          <span style="font-size:0.65rem; color:var(--ccb-neutral-600); display:block;">Original Cost</span>
          <strong id="pr-out-original" style="font-size:1.05rem; color:var(--ccb-neutral-600);">$0.00</strong>
        </div>
        <div style="background:#fff; border:1.5px solid var(--ccb-neutral-200); padding:0.35rem; border-radius:6px; position:relative; box-shadow:0 2px 4px rgba(15,109,255,0.05);">
          <span style="font-size:0.65rem; color:var(--ccb-neutral-600); display:block;">Calculated Cost</span>
          <strong id="pr-out-calculated" style="font-size:1.1rem; color:var(--ccb-primary);">$0.00</strong>
        </div>
      </div>

      <div style="margin-bottom:0rem;">
        <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.25rem; color:var(--ccb-neutral-700);">Applied Rules (audit output):</label>
        <ul id="pr-out-rules" style="margin:0; padding-left:1.2rem; font-size:0.75rem; color:var(--ccb-neutral-700); line-height:1.4;">
        </ul>
      </div>
    </div>
  `

  const productEl = div.querySelector('#pr-product')
  const regionEl = div.querySelector('#pr-region')
  const customerEl = div.querySelector('#pr-customer')
  const priorityEl = div.querySelector('#pr-priority')
  const basePriceEl = div.querySelector('#pr-base-price')
  const qtyEl = div.querySelector('#pr-qty')
  const loyaltyEl = div.querySelector('#pr-loyalty')

  const originalEl = div.querySelector('#pr-out-original')
  const calculatedEl = div.querySelector('#pr-out-calculated')
  const rulesListEl = div.querySelector('#pr-out-rules')

  function calculatePrice() {
    const product = productEl.value
    const region = regionEl.value
    const customerType = customerEl.value
    const priority = priorityEl.value
    const basePrice = Math.max(0, parseFloat(basePriceEl.value) || 0)
    const quantity = Math.max(1, parseInt(qtyEl.value) || 1)
    const loyaltyYears = Math.max(0, parseInt(loyaltyEl.value) || 0)

    const appliedRules = []
    const originalPrice = basePrice * quantity
    let calculatedPrice = originalPrice

    if (product === "Professional") {
      calculatedPrice *= 1.05
      appliedRules.push("Professional product: 5% premium")
    } else if (product === "Enterprise") {
      calculatedPrice *= 1.10
      appliedRules.push("Enterprise product: 10% premium")
    }

    if (region === "Europe") {
      calculatedPrice *= 1.05
      appliedRules.push("Europe region: 5% adjustment")
    } else if (region === "NorthAmerica") {
      calculatedPrice *= 1.08
      appliedRules.push("North America region: 8% adjustment")
    } else if (region === "AsiaPacific") {
      calculatedPrice *= 1.12
      appliedRules.push("Asia Pacific region: 12% adjustment")
    }

    if (customerType === "Partner") {
      calculatedPrice *= 0.85
      appliedRules.push("Partner customer: 15% discount")
    } else if (customerType === "Government") {
      calculatedPrice *= 0.90
      appliedRules.push("Government customer: 10% discount")
    } else if (customerType === "Education") {
      calculatedPrice *= 0.80
      appliedRules.push("Education customer: 20% discount")
    }

    if (quantity >= 100) {
      calculatedPrice *= 0.80
      appliedRules.push("100+ units: 20% volume discount")
    } else if (quantity >= 50) {
      calculatedPrice *= 0.85
      appliedRules.push("50+ units: 15% volume discount")
    } else if (quantity >= 20) {
      calculatedPrice *= 0.90
      appliedRules.push("20+ units: 10% volume discount")
    } else if (quantity >= 10) {
      calculatedPrice *= 0.95
      appliedRules.push("10+ units: 5% volume discount")
    }

    if (loyaltyYears >= 5) {
      calculatedPrice *= 0.90
      appliedRules.push("5+ years loyalty: 10% discount")
    } else if (loyaltyYears >= 3) {
      calculatedPrice *= 0.95
      appliedRules.push("3+ years loyalty: 5% discount")
    }

    if (priority === "Priority") {
      calculatedPrice *= 1.10
      appliedRules.push("Priority service: 10% surcharge")
    } else if (priority === "Urgent") {
      calculatedPrice *= 1.25
      appliedRules.push("Urgent service: 25% surcharge")
    }

    if (product === "Enterprise" && region === "UK" && customerType === "Partner") {
      calculatedPrice *= 0.95
      appliedRules.push("Enterprise UK Partner: additional 5% discount")
    }

    if (customerType === "Government" && quantity >= 50) {
      calculatedPrice *= 0.95
      appliedRules.push("Government bulk purchase: additional 5% discount")
    }

    if (product === "Enterprise" && customerType === "Education" && region === "Europe") {
      calculatedPrice *= 0.93
      appliedRules.push("Enterprise European Education: additional 7% discount")
    }

    calculatedPrice = Math.round(calculatedPrice * 100) / 100

    originalEl.textContent = `$${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    calculatedEl.textContent = `$${calculatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    rulesListEl.innerHTML = ''
    if (appliedRules.length === 0) {
      rulesListEl.innerHTML = '<li style="color:var(--ccb-neutral-500);">None. Base rate applied.</li>'
    } else {
      appliedRules.forEach(rule => {
        const li = document.createElement('li')
        li.textContent = rule
        rulesListEl.appendChild(li)
      })
    }
  }

  [productEl, regionEl, customerEl, priorityEl, basePriceEl, qtyEl, loyaltyEl].forEach(element => {
    element.addEventListener('input', calculatePrice)
  })

  setTimeout(calculatePrice, 0)

  return div
}

function safeEvalExpression(expr, context) {
  let cleaned = expr.trim()
  const variables = Object.keys(context).sort((a,b) => b.length - a.length)
  
  for (const key of variables) {
    const val = context[key]
    const re = new RegExp('\\b' + key + '\\b', 'g')
    cleaned = cleaned.replace(re, val !== undefined ? val : 0)
  }
  
  cleaned = cleaned.replace(/[^0-9\+\-\*\/\%\.\s\(\)]/g, '')
  
  try {
    const result = new Function(`return (${cleaned})`)()
    return isNaN(result) || !isFinite(result) ? 0 : parseFloat(result)
  } catch (e) {
    throw new Error(`Syntax error in: "${expr}"`)
  }
}

function safeEvalAggregate(expr, data) {
  const match = expr.match(/^\s*(SUM|AVG|MIN|MAX|COUNT)\s*\((.*?)\)\s*$/i)
  if (!match) {
    throw new Error(`Unsupported aggregate: "${expr}". Use SUM(col), AVG(col), etc.`)
  }
  const func = match[1].toUpperCase()
  const column = match[2].trim()

  const values = data.map(row => parseFloat(row[column]) || 0)

  if (func === 'COUNT') return data.length
  if (values.length === 0) return 0

  switch (func) {
    case 'SUM':
      return values.reduce((sum, v) => sum + v, 0)
    case 'AVG':
      return values.reduce((sum, v) => sum + v, 0) / values.length
    case 'MIN':
      return Math.min(...values)
    case 'MAX':
      return Math.max(...values)
    default:
      return 0
  }
}

function createJsonCalculationEngineTool() {
  const div = document.createElement('div')
  div.className = 'sandbox-tool'
  div.innerHTML = `
    <div class="form-group mb-2">
      <label for="calc-data" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">JSON Row Data (Array)</label>
      <textarea id="calc-data" class="form-control" rows="4" style="width:100%; padding:0.5rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.75rem; font-family:var(--ccb-font-mono);">[
  { "quantity": 10, "unitPrice": 15.0, "discountRate": 0.10 },
  { "quantity": 5, "unitPrice": 22.5, "discountRate": 0.05 },
  { "quantity": 1, "unitPrice": 110.0, "discountRate": 0.20 }
]</textarea>
    </div>

    <!-- ── Calculation Builder Helper ────────────────────────────── -->
    <div class="builder-helper-container" style="margin-bottom: 1.25rem; padding: 0.85rem; border: 1.5px dashed var(--ccb-primary); border-radius: 8px; background: var(--ccb-primary-light);">
      <h4 style="margin: 0 0 0.4rem 0; font-size: 0.85rem; font-weight: 700; color: var(--ccb-primary-dark); display: flex; align-items: center; gap: 0.4rem;">
        <i class="fas fa-magic"></i> Formula Builder Helper
      </h4>
      <p style="margin: 0 0 0.65rem 0; font-size: 0.75rem; color: var(--ccb-neutral-700); line-height: 1.45;">
        Add variables, operators, and aggregate functions visually without typing errors.
      </p>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.65rem;">
        <button id="builder-add-row-btn" class="btn btn--primary btn--sm" type="button" style="min-height: 28px; font-size: 0.72rem; padding: 0.2rem 0.6rem;">+ Add Formula</button>
        <button id="builder-add-agg-btn" class="btn btn--outline btn--sm" type="button" style="min-height: 28px; font-size: 0.72rem; padding: 0.2rem 0.6rem; background: #fff; color: var(--ccb-primary); border-color: var(--ccb-neutral-300);">+ Add Aggregate</button>
      </div>

      <!-- ROW FORM -->
      <div id="builder-row-form" style="display: none; background: #fff; border: 1px solid var(--ccb-neutral-200); padding: 0.65rem; border-radius: 6px; margin-bottom: 0.5rem; box-shadow: var(--ccb-shadow);">
        <h5 style="margin: 0 0 0.5rem 0; font-size: 0.78rem; font-weight: 700; color: var(--ccb-neutral-900);">Add Row Formula</h5>
        
        <div class="form-group mb-2">
          <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">TARGET COLUMN NAME</label>
          <input id="row-target" type="text" placeholder="e.g. lineTotal" style="padding: 0.3rem 0.45rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; font-family: var(--ccb-font-mono);" />
        </div>

        <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem;">
          <div style="flex: 1.2;">
            <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">LEFT VALUE</label>
            <input id="row-operand1" type="text" placeholder="e.g. quantity" style="padding: 0.3rem 0.45rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; font-family: var(--ccb-font-mono);" />
          </div>
          <div>
            <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block; text-align: center;">OP</label>
            <select id="row-operator" style="padding: 0.3rem; font-size: 0.75rem; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; background: #fff; cursor: pointer; font-family: var(--ccb-font-mono);">
              <option value="*">* (Multiply)</option>
              <option value="/">/ (Divide)</option>
              <option value="+">+ (Add)</option>
              <option value="-">- (Subtract)</option>
            </select>
          </div>
          <div style="flex: 1.2;">
            <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">RIGHT VALUE</label>
            <input id="row-operand2" type="text" placeholder="e.g. unitPrice" style="padding: 0.3rem 0.45rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; font-family: var(--ccb-font-mono);" />
          </div>
        </div>

        <div id="row-builder-pill-box" style="margin-bottom: 0.5rem;">
          <span style="font-size: 0.62rem; font-weight: 700; color: var(--ccb-neutral-500); display: block; margin-bottom: 0.2rem;">SUGGESTED SOURCE FIELDS (CLICK TO USE):</span>
          <div class="row-cols-pills" style="display: flex; flex-wrap: wrap; gap: 0.25rem;"></div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.3rem;">
          <button id="row-cancel-btn" type="button" style="min-height: 24px; padding: 0.15rem 0.45rem; font-size: 0.7rem; border: 1px solid var(--ccb-neutral-300); background: #fff; cursor: pointer; border-radius: 4px;">Cancel</button>
          <button id="row-save-btn" type="button" class="btn btn--primary" style="min-height: 24px; padding: 0.15rem 0.45rem; font-size: 0.7rem; border-radius: 4px;">Append Formula</button>
        </div>
      </div>

      <!-- AGGREGATE FORM -->
      <div id="builder-agg-form" style="display: none; background: #fff; border: 1px solid var(--ccb-neutral-200); padding: 0.65rem; border-radius: 6px; margin-bottom: 0.5rem; box-shadow: var(--ccb-shadow);">
        <h5 style="margin: 0 0 0.5rem 0; font-size: 0.78rem; font-weight: 700; color: var(--ccb-neutral-900);">Add Aggregate Total</h5>

        <div class="form-group mb-2">
          <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">TOTAL VARIABLE NAME</label>
          <input id="agg-target" type="text" placeholder="e.g. grandTotal" style="padding: 0.3rem 0.45rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; font-family: var(--ccb-font-mono);" />
        </div>

        <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem;">
          <div style="width: 90px;">
            <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">FUNCTION</label>
            <select id="agg-func" style="padding: 0.3rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; background: #fff; cursor: pointer;">
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
              <option value="MIN">MIN</option>
              <option value="MAX">MAX</option>
              <option value="COUNT">COUNT</option>
            </select>
          </div>
          <span style="font-size: 1rem; font-weight: 700; margin-top: 1rem;">(</span>
          <div style="flex: 1;">
            <label style="font-size: 0.65rem; font-weight: 700; margin-bottom: 0.15rem; color: var(--ccb-neutral-600); display: block;">COLUMN TO CALCULATE</label>
            <input id="agg-col" type="text" placeholder="e.g. grossTotal" style="padding: 0.3rem 0.45rem; font-size: 0.75rem; width: 100%; border: 1.5px solid var(--ccb-neutral-200); border-radius: 4px; font-family: var(--ccb-font-mono);" />
          </div>
          <span style="font-size: 1rem; font-weight: 700; margin-top: 1rem;">)</span>
        </div>

        <div id="agg-builder-pill-box" style="margin-bottom: 0.5rem;">
          <span style="font-size: 0.62rem; font-weight: 700; color: var(--ccb-neutral-500); display: block; margin-bottom: 0.2rem;">CHOOSE DYNAMIC COLUMN (CLICK TO USE):</span>
          <div class="agg-cols-pills" style="display: flex; flex-wrap: wrap; gap: 0.25rem;"></div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.3rem;">
          <button id="agg-cancel-btn" type="button" style="min-height: 24px; padding: 0.15rem 0.45rem; font-size: 0.7rem; border: 1px solid var(--ccb-neutral-300); background: #fff; cursor: pointer; border-radius: 4px;">Cancel</button>
          <button id="agg-save-btn" type="button" class="btn btn--primary" style="min-height: 24px; padding: 0.15rem 0.45rem; font-size: 0.7rem; border-radius: 4px;">Append Total</button>
        </div>
      </div>
    </div>

    <div class="form-group mb-2">
      <label for="calc-rows" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Row Calculations (sequential, line-by-line)</label>
      <textarea id="calc-rows" class="form-control" rows="3" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.75rem; font-family:var(--ccb-font-mono);">lineTotal = quantity * unitPrice
discountAmount = lineTotal * discountRate
netTotal = lineTotal - discountAmount
vat = netTotal * 0.20
grossTotal = netTotal + vat</textarea>
    </div>

    <div class="form-group mb-3">
      <label for="calc-totals" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.25rem;">Aggregate Calculations</label>
      <textarea id="calc-totals" class="form-control" rows="2" style="width:100%; padding:0.4rem; border-radius:4px; border:1px solid var(--ccb-neutral-200); font-size:0.75rem; font-family:var(--ccb-font-mono);">totalVat = SUM(vat)
grandTotal = SUM(grossTotal)</textarea>
    </div>

    <div style="text-align:right;" class="mb-2">
      <button id="calc-run-btn" class="btn btn--primary btn--sm" type="button">Run Calculations</button>
    </div>

    <div id="calc-error-box" class="notice notice--danger mb-2" style="display:none; border-radius:4px; font-size:0.8rem; padding:0.5rem; border:1px solid var(--ccb-error);"></div>

    <div class="sandbox-results" style="background:var(--ccb-neutral-50); border-radius:8px; padding:1rem; border:1px solid var(--ccb-neutral-200);">
      <h4 style="margin:0 0 0.5rem 0; font-size:0.85rem; font-weight:700;">Calculated Dynamic Table Output</h4>
      
      <div id="calc-out-totals" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
      </div>

      <div style="overflow-x:auto;">
        <table id="calc-out-table" style="width:100%; border-collapse:collapse; background:#fff; font-size:0.75rem; border:1px solid var(--ccb-neutral-200);">
          <thead style="background:var(--ccb-neutral-100); font-weight:700;">
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
    </div>
  `

  const dataEl = div.querySelector('#calc-data')
  const rowsEl = div.querySelector('#calc-rows')
  const totalsEl = div.querySelector('#calc-totals')
  const runBtn = div.querySelector('#calc-run-btn')
  const errorEl = div.querySelector('#calc-error-box')
  const totalsContainer = div.querySelector('#calc-out-totals')
  const tableEl = div.querySelector('#calc-out-table')

  // Visual Builder References
  const builderAddRowBtn = div.querySelector('#builder-add-row-btn')
  const builderAddAggBtn = div.querySelector('#builder-add-agg-btn')
  const rowCancelBtn = div.querySelector('#row-cancel-btn')
  const aggCancelBtn = div.querySelector('#agg-cancel-btn')
  const rowSaveBtn = div.querySelector('#row-save-btn')
  const aggSaveBtn = div.querySelector('#agg-save-btn')

  const rowForm = div.querySelector('#builder-row-form')
  const aggForm = div.querySelector('#builder-agg-form')

  const rowPillBox = div.querySelector('.row-cols-pills')
  const aggPillBox = div.querySelector('.agg-cols-pills')

  let lastFocusedOperand = 'row-operand1'

  div.querySelector('#row-operand1').addEventListener('focus', () => { lastFocusedOperand = 'row-operand1' })
  div.querySelector('#row-operand2').addEventListener('focus', () => { lastFocusedOperand = 'row-operand2' })

  function getAvailableColumns() {
    try {
      const dataVal = JSON.parse(dataEl.value)
      if (Array.isArray(dataVal) && dataVal.length > 0) {
        return Object.keys(dataVal[0])
      }
    } catch (_) {}
    return ['quantity', 'unitPrice', 'discountRate']
  }

  function getAllColumns() {
    const base = getAvailableColumns()
    const rowCalcLines = rowsEl.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    rowCalcLines.forEach(line => {
      const parts = line.split('=')
      if (parts.length === 2) {
        const col = parts[0].trim()
        if (col && !base.includes(col)) {
          base.push(col)
        }
      }
    })
    return base
  }

  function updateColumnsPills() {
    if (!rowPillBox || !aggPillBox) return

    rowPillBox.innerHTML = ''
    aggPillBox.innerHTML = ''

    const availCols = getAvailableColumns()
    availCols.forEach(col => {
      const pill = document.createElement('button')
      pill.type = 'button'
      pill.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.65rem; background: var(--ccb-neutral-100); color: var(--ccb-neutral-900); border: 1px solid var(--ccb-neutral-200); border-radius: 4px; cursor: pointer; transition: all var(--ccb-transition); font-family: var(--ccb-font-mono);'
      pill.textContent = col
      pill.addEventListener('click', () => {
        const opInput = div.querySelector(`#${lastFocusedOperand}`)
        if (opInput) {
          opInput.value = col
        }
      })
      rowPillBox.appendChild(pill)
    })

    const allCols = getAllColumns()
    allCols.forEach(col => {
      const pill = document.createElement('button')
      pill.type = 'button'
      pill.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.65rem; background: var(--ccb-neutral-100); color: var(--ccb-neutral-900); border: 1px solid var(--ccb-neutral-200); border-radius: 4px; cursor: pointer; transition: all var(--ccb-transition); font-family: var(--ccb-font-mono);'
      pill.textContent = col
      pill.addEventListener('click', () => {
        const input = div.querySelector('#agg-col')
        if (input) input.value = col
      })
      aggPillBox.appendChild(pill)
    })
  }

  builderAddRowBtn?.addEventListener('click', () => {
    rowForm.style.display = 'block'
    aggForm.style.display = 'none'
    updateColumnsPills()
  })

  builderAddAggBtn?.addEventListener('click', () => {
    rowForm.style.display = 'none'
    aggForm.style.display = 'block'
    updateColumnsPills()
  })

  rowCancelBtn?.addEventListener('click', () => {
    rowForm.style.display = 'none'
  })

  aggCancelBtn?.addEventListener('click', () => {
    aggForm.style.display = 'none'
  })

  rowSaveBtn?.addEventListener('click', () => {
    const target = div.querySelector('#row-target').value.trim()
    const op1 = div.querySelector('#row-operand1').value.trim()
    const op = div.querySelector('#row-operator').value
    const op2 = div.querySelector('#row-operand2').value.trim()

    if (!target || !op1 || !op2) {
      showNotice('Please fill in all row calculation fields.', 'warning')
      return
    }

    const currentText = rowsEl.value.trim()
    const newLine = `${target} = ${op1} ${op} ${op2}`
    rowsEl.value = currentText ? `${currentText}\n${newLine}` : newLine

    div.querySelector('#row-target').value = ''
    div.querySelector('#row-operand1').value = ''
    div.querySelector('#row-operand2').value = ''
    rowForm.style.display = 'none'

    updateColumnsPills()
    rowsEl.dispatchEvent(new Event('input'))
    runEngine()
    showNotice(`Row formula "${newLine}" appended!`, 'success')
  })

  aggSaveBtn?.addEventListener('click', () => {
    const target = div.querySelector('#agg-target').value.trim()
    const func = div.querySelector('#agg-func').value
    const col = div.querySelector('#agg-col').value.trim()

    if (!target || !col) {
      showNotice('Please fill in all aggregate calculation fields.', 'warning')
      return
    }

    const currentText = totalsEl.value.trim()
    const newLine = `${target} = ${func}(${col})`
    totalsEl.value = currentText ? `${currentText}\n${newLine}` : newLine

    div.querySelector('#agg-target').value = ''
    div.querySelector('#agg-col').value = ''
    aggForm.style.display = 'none'

    totalsEl.dispatchEvent(new Event('input'))
    runEngine()
    showNotice(`Aggregate "${newLine}" appended!`, 'success')
  })

  dataEl.addEventListener('input', updateColumnsPills)
  rowsEl.addEventListener('input', updateColumnsPills)

  function runEngine() {
    errorEl.style.display = 'none'
    totalsContainer.innerHTML = ''
    tableEl.querySelector('thead').innerHTML = ''
    tableEl.querySelector('tbody').innerHTML = ''

    let data
    try {
      data = JSON.parse(dataEl.value)
      if (!Array.isArray(data)) throw new Error("JSON data must be a valid array.")
    } catch (e) {
      errorEl.textContent = `Data Error: ${e.message}`
      errorEl.style.display = 'block'
      return
    }

    const rowCalcLines = rowsEl.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    const totalCalcLines = totalsEl.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

    const calculatedData = []

    try {
      for (let r = 0; r < data.length; r++) {
        if (typeof data[r] !== 'object' || data[r] === null) {
          throw new Error(`Row ${r + 1} is not a valid JSON object.`)
        }
        const row = { ...data[r] }

        for (const line of rowCalcLines) {
          const parts = line.split('=')
          if (parts.length !== 2) {
            throw new Error(`Invalid calculation line "${line}". Format: targetColumn = formula`)
          }
          const outputCol = parts[0].trim()
          const expr = parts[1].trim()

          const val = safeEvalExpression(expr, row)
          row[outputCol] = val
        }
        calculatedData.push(row)
      }

      const calculatedTotals = {}
      for (const line of totalCalcLines) {
        const parts = line.split('=')
        if (parts.length !== 2) {
          throw new Error(`Invalid aggregate line "${line}". Format: targetName = SUM(column)`)
        }
        const targetTotal = parts[0].trim()
        const expr = parts[1].trim()

        const val = safeEvalAggregate(expr, calculatedData)
        calculatedTotals[targetTotal] = val
      }

      const totalKeys = Object.keys(calculatedTotals)
      if (totalKeys.length > 0) {
        totalKeys.forEach(key => {
          const card = document.createElement('div')
          card.style.cssText = 'background:#fff; border:1px solid var(--ccb-neutral-200); border-radius:6px; padding:0.35rem 0.5rem; text-align:center; min-width:80px; box-shadow:var(--ccb-shadow);'
          card.innerHTML = `
            <span style="font-size:0.6rem; color:var(--ccb-neutral-600); display:block;">${key}</span>
            <strong style="font-size:0.9rem; color:var(--ccb-accent-dark);">${calculatedTotals[key].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>
          `
          totalsContainer.appendChild(card)
        })
      }

      if (calculatedData.length > 0) {
        const allColumns = Object.keys(calculatedData[0])
        
        let theadRow = '<tr>'
        allColumns.forEach(col => {
          theadRow += `<th style="padding:0.4rem; text-align:left; border-bottom:2px solid var(--ccb-neutral-200); border-right:1px solid var(--ccb-neutral-200);">${col}</th>`
        })
        theadRow += '</tr>'
        tableEl.querySelector('thead').innerHTML = theadRow

        let tbodyContent = ''
        calculatedData.forEach(row => {
          tbodyContent += '<tr>'
          allColumns.forEach(col => {
            const val = row[col]
            const isCalculated = !Object.keys(data[0]).includes(col)
            const cellStyle = isCalculated ? 'background-color:var(--ccb-primary-light); font-weight:600; border-right:1px solid var(--ccb-neutral-200);' : 'border-right:1px solid var(--ccb-neutral-200);'
            const dispClass = typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : val
            tbodyContent += `<td style="padding:0.35rem; border-bottom:1px solid var(--ccb-neutral-200); ${cellStyle}">${dispClass}</td>`
          })
          tbodyContent += '</tr>'
        })
        tableEl.querySelector('tbody').innerHTML = tbodyContent
      }

    } catch (e) {
      errorEl.textContent = e.message
      errorEl.style.display = 'block'
    }
  }

  runBtn.addEventListener('click', runEngine)
  setTimeout(() => {
    updateColumnsPills()
    runEngine()
  }, 0)

  return div
}

function createSandboxTool(helperId) {
  if (helperId === 'regex-tester') {
    return createRegexTesterTool()
  } else if (helperId === 'markdown-html-converter') {
    return createMarkdownHtmlTool()
  } else if (helperId === 'compare-json-lists') {
    return createCompareJsonListsTool()
  } else if (helperId === 'pricing-calculator') {
    return createPricingCalculatorTool()
  } else if (helperId === 'json-calculation-engine') {
    return createJsonCalculationEngineTool()
  } else if (helperId === 'business-rules-calculator') {
    const notice = document.createElement('div')
    notice.style.marginBottom = '1rem'
    notice.innerHTML = `<div class="notice notice--info" style="font-size:0.75rem; margin-bottom:0.75rem; padding:0.5rem 0.8rem; border-radius:4px;"><p style="margin:0;">This early combined builder exposes dual price/score logic. See its cleaner successor, the <strong>Pricing Calculator</strong>, for the fully active logic pipeline below.</p></div>`
    const wrapper = document.createElement('div')
    wrapper.appendChild(notice)
    wrapper.appendChild(createPricingCalculatorTool())
    return wrapper
  }
  
  const placeholder = document.createElement('div')
  placeholder.className = 'notice notice--info'
  placeholder.innerHTML = '<p style="margin:0; font-size:0.85rem;">This custom connector is executed fully at runtime via C# scripting. See files on the left to copy configuration files.</p>'
  return placeholder
}

// ── Routing & Main Implementation ──────────────────────────────

function renderConnectorPage(connector) {
  document.getElementById('connector-title').textContent = connector.title
  document.getElementById('connector-description').textContent = connector.description

  const container = document.getElementById('connector-markdown-content')
  
  // Parse markdown and build Table of Contents dynamically
  let htmlContent = ''
  if (window.marked) {
    htmlContent = window.marked.parse(connector.markdown)
  } else {
    htmlContent = `<pre style="white-space: pre-wrap;">${connector.markdown}</pre>`
  }

  // Create highly structured Table of Contents from h2 headers
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const h2Elements = tempDiv.querySelectorAll('h2')
  
  let navLinksHtml = `<p class="quick-jump-nav__title">Jump to:</p>`
  
  // Always include a link back to top/overview
  navLinksHtml += `<a href="#/connector/${connector.id}" class="quick-jump-nav__link"><i class="fas fa-file-alt"></i> Overview</a>`

  if (h2Elements.length > 0) {
    h2Elements.forEach((h2, idx) => {
      const titleText = h2.textContent
      const headerId = 'step-' + idx + '-' + titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      h2.id = headerId

      // Dynamically add key scroll links to our sticky scroll bar:
      // Show Swagger, C# code/script, or calculations specifically
      const lowerTitle = titleText.toLowerCase()
      if (lowerTitle.includes('swagger') || lowerTitle.includes('openapi')) {
        navLinksHtml += `<a href="#/connector/${connector.id}#${headerId}" class="quick-jump-nav__link"><i class="fas fa-project-diagram"></i> Swagger</a>`
      } else if (lowerTitle.includes('code') || lowerTitle.includes('script') || lowerTitle.includes('c#')) {
        navLinksHtml += `<a href="#/connector/${connector.id}#${headerId}" class="quick-jump-nav__link"><i class="fas fa-code"></i> C# Code</a>`
      }
    })
  }

  // Wrapping all code blocks in collapsible details tags (excluding mermaid)
  const preElements = tempDiv.querySelectorAll('pre')
  preElements.forEach((pre) => {
    const codeEl = pre.querySelector('code')
    if (codeEl && codeEl.classList.contains('language-mermaid')) {
      return
    }

    let title = 'Code Block'
    if (codeEl) {
      const classes = Array.from(codeEl.classList)
      const langClass = classes.find(c => c.startsWith('language-'))
      if (langClass) {
        const langName = langClass.replace('language-', '').toLowerCase()
        if (langName === 'json') {
          title = 'JSON Example Payload'
        } else if (langName === 'yaml' || langName === 'yml') {
          title = 'OpenAPI Swagger 2.0 Configuration (YAML)'
        } else if (langName === 'csharp' || langName === 'cs') {
          title = 'C# Custom Policy Script Code'
        } else if (langName === 'text') {
          title = 'Expression Logic Examples'
        } else {
          title = langName.charAt(0).toUpperCase() + langName.slice(1) + ' Code'
        }
      }
    }

    const details = document.createElement('details')
    details.className = 'connector-code-details'

    const summary = document.createElement('summary')
    summary.className = 'connector-code-summary'
    summary.innerHTML = `
      <span class="summary-icon"><i class="fas fa-code"></i></span>
      <span class="summary-text">${title}</span>
      <span class="summary-badge"></span>
    `

    pre.parentNode.insertBefore(details, pre)
    details.appendChild(summary)
    details.appendChild(pre)
  })

  // Always append sandbox to jump links
  navLinksHtml += `<a href="#/connector/${connector.id}#connector-sandbox-title" class="quick-jump-nav__link"><i class="fas fa-laptop-code"></i> Sandbox</a>`

  // Update sticky quick navigation links
  const quickNavContainer = document.getElementById('connector-quick-nav-links')
  if (quickNavContainer) {
    quickNavContainer.innerHTML = navLinksHtml
  }

  container.innerHTML = tempDiv.innerHTML

  if (window.mermaid) {
    const codeBlocks = container.querySelectorAll('code.language-mermaid')
    codeBlocks.forEach((codeBlock, idx) => {
      const parent = codeBlock.parentElement
      const div = document.createElement('div')
      div.className = 'mermaid'
      div.id = `mermaid-chart-${idx}`
      div.textContent = codeBlock.textContent
      parent.replaceWith(div)
    })
    try {
      if (window.mermaid.run) {
        window.mermaid.run({
          nodes: container.querySelectorAll('.mermaid')
        })
      } else {
        window.mermaid.init(undefined, container.querySelectorAll('.mermaid'))
      }
    } catch (err) {
      console.warn('Mermaid rendering issue:', err)
    }
  }

  const sandboxContainer = document.getElementById('connector-sandbox-container')
  sandboxContainer.innerHTML = ''
  
  // Set an ID on the interactive title so it matches our sandbox jump links target
  const sandboxHeader = document.querySelector('.interactive-card__title')
  if (sandboxHeader) {
    sandboxHeader.id = 'connector-sandbox-title'
  }

  const toolElement = createSandboxTool(connector.helperId)
  if (toolElement) {
    sandboxContainer.appendChild(toolElement)
  }
}

function handleNavigation() {
  const rawHash = window.location.hash
  const homeView = document.getElementById('home-view')
  const connectorView = document.getElementById('connector-view')

  // Check if hash matches a connector detail route
  // Supports formats like: #/connector/regex-tester or #/connector/regex-tester#step-0-description
  if (rawHash.startsWith('#/connector/')) {
    // Extract the connector ID from the hash segment preceding any nested sub-anchors
    const routeAndSubhash = rawHash.replace('#/connector/', '')
    const parts = routeAndSubhash.split('#')
    const connectorId = parts[0]
    const subHash = parts[1]

    const connector = CONNECTORS.find(c => c.id === connectorId || c.fileId === connectorId)

    if (connector) {
      if (homeView) homeView.classList.add('hidden-view')
      if (connectorView) connectorView.classList.remove('hidden-view')
      
      // Only re-render the page content if we are navigating to a DIFFERENT connector page,
      // avoiding redundant expensive renders when clicking inside the Table of Contents of the current active page
      const currentActiveTitle = document.getElementById('connector-title').textContent
      if (currentActiveTitle !== connector.title) {
        renderConnectorPage(connector)
      }

      // If a nested hash tag target identifier was specified, smoothly scroll to it within the connector view
      if (subHash) {
        const targetElement = document.getElementById(subHash)
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth' })
          }, 50)
        }
      } else {
        window.scrollTo(0, 0)
      }
      return
    }
  }

  // Fallback to home page view
  if (connectorView) connectorView.classList.add('hidden-view')
  if (homeView) homeView.classList.remove('hidden-view')

  if (rawHash && !rawHash.startsWith('#/')) {
    const targetElement = document.getElementById(rawHash.substring(1))
    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }
}

function initSampleConnectors() {
  const container = document.getElementById('connectors-grid')
  if (!container) return

  container.innerHTML = ''
  CONNECTORS.forEach(connector => {
    let tagsHtml = ''
    connector.tags.forEach(tag => {
      const recClass = tag === 'Recommended' ? 'connector-tag connector-tag--recommended' : 'connector-tag'
      tagsHtml += `<span class="${recClass}">${tag}</span>`
    })

    const card = document.createElement('article')
    card.className = 'example-card'
    card.innerHTML = `
      <div class="connector-card__meta">
        <span style="font-size: 1.6rem; line-height: 1;">${connector.icon}</span>
        <h3 class="example-card__title" style="margin: 0; font-size: 1.15rem;">${connector.title}</h3>
      </div>
      <div class="connector-card__tags">
        ${tagsHtml}
      </div>
      <p class="example-card__description">${connector.description}</p>
      <div class="example-card__actions" style="margin-top:auto;">
        <a href="#/connector/${connector.id}" class="btn btn--primary btn--sm" style="width: 100%; justify-content: center;">Explore Walkthrough & Sandbox</a>
      </div>
    `
    container.appendChild(card)
  })
}

// ── Initialise ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGptPromptBuilder()
  initSampleConnectors()
  handleNavigation()
  window.addEventListener('hashchange', handleNavigation)
})
