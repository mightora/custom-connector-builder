# Custom Connector Builder

A free, open-source, browser-based tool for designing Power Platform custom connector C# prompts, exploring reference connectors and inspecting scripts in Connector Studio.

![Build and deployment](https://github.com/mightora/custom-connector-builder/actions/workflows/pages.yml/badge.svg)
![CodeQL](https://github.com/mightora/custom-connector-builder/actions/workflows/codeql.yml/badge.svg)

Built and maintained by [Mightora](https://mightora.io). Deployed to GitHub Pages. [MIT licence](LICENSE).

## Connector Studio (browser IDE beta)

Visit the **Connector Studio** navigation entry (`#/studio`) to access:

- A Monaco/VS Code-style editor with C#, YAML and JSON file tabs.
- Starter projects for local transformations and external API proxies.
- Basic C# structural diagnostics and Swagger 2.0 YAML checks.
- A deliberately constrained **local mock preview**, limited to familiar `JObject` output patterns with string extraction, trimming, changing case and interpolation; it rejects unsupported control flow and backend calls rather than reporting fabricated passes.
- An **experimental in-browser C# run** using the Roslyn compiler and .NET WebAssembly via [WasmSharp](https://github.com/JakeYallop/WasmSharp). The first run downloads the runtime, and execution happens on the visitor's device in a web worker, without submitting code to a compiler API.
- Editable request and expected-response JSON fixtures with an output comparison and trace.
- Optional direct HTTPS API requests, subject to browser CORS restrictions and a per-request confirmation.
- Browser-local autosave, import of `.csx`, `.cs`, `.yaml`, `.json` and recognised project ZIPs, and project ZIP export.
- Direct transfer of generated C# baselines and reference connector code into Studio.

### Important C# execution limitations

Connector Studio has **two separate test engines**:

1. **Run mock test** uses a deliberately limited JavaScript interpreter. It does not compile or execute C#.
2. **Compile & run C#** runs actual C# with Roslyn and .NET WebAssembly. To make scripts compile without a Power Platform connection, it provides a *partial local shim* for `ScriptBase`, `ScriptContext`, `Context.SendAsync` and basic `Newtonsoft.Json.Linq.JObject` syntax. This is not the official Microsoft connector library or the actual connector host. `Context.SendAsync` echoes the outgoing request body and does not call an API; other runtime features or Newtonsoft constructs may not compile. Passing a fixture test does not certify the connector, its authentication or backend interactions. Run a genuine integration test in a Power Platform development environment before deployment.

Experimental C# execution has not yet been verified across every supported browser and script pattern. The runtime may require modern WebAssembly features and downloads roughly 40 MB of assets. Browser workers improve responsiveness but **do not provide a security boundary**: execute only scripts you trust and never paste credentials. WebAssembly execution is not automatically killed after a deadline; reload the page if a script loops or hangs. See [Microsoft custom connector C# guidance](https://learn.microsoft.com/en-us/connectors/custom-connectors/write-code).

All editing, diagnostics, mock previews and C# browser compilation run on the visitor's device. An optional live API request contacts the chosen endpoint directly and requires CORS. The C# runtime may have access to browser networking APIs, so it should not be treated as an isolated sandbox. The online site also loads shared Mightora resources, the editor bundle, and production-only Cloudflare analytics. No embedded credential broker or hosted code-execution service is supplied. Do not include secrets in exported or persisted source code.

**Offline note:** the current Monaco + .NET WebAssembly edition is a multi-file static application that requires HTTPS or localhost hosting and currently does not have a fully self-contained `file://` distribution. All compiler assets are published with the application so, once cached by a browser, they do not rely on an external C# service. Do not infer full offline availability from local autosave.

Third-party runtime: [@wasmsharp/core](https://www.npmjs.com/package/@wasmsharp/core) is Apache-2.0 licensed. Its licence is included with the published `runtime/` files. [Comlink](https://github.com/GoogleChromeLabs/comlink) is Apache-2.0 licensed and also shipped locally. The site itself remains MIT licensed.

### Validate changes

```bash
npm ci
npm test
npm audit --audit-level=high
npm run build
```

The GitHub Pages workflow runs tests, dependency audit and build on each push. CodeQL runs on pushes, pull requests and weekly. Workflow badges represent actual execution status and do not constitute independent security certification.

---

## What Is This?

Power Platform custom connectors are configured using two files:

1. **OpenAPI 2.0 (Swagger) YAML** – describes the API, its actions, parameters, and responses.
2. **C# policy template script** – optional code that transforms requests and responses inside the connector runtime.

The site provides a guided GPT prompt builder, six documented sample connector designs with JavaScript-based demonstrations, and Connector Studio for editing and experimenting with C# transformation scripts.

---

## Who Is It For?

- Power Platform makers who want to connect to an API not already in the connector catalogue
- Developers building calculation-only connectors (no external API)
- Anyone wanting to learn how custom connectors are structured

---

## Features

- **Prompt builder** – configure values, a connector mode, processing rules and example JSON; copy a structured prompt with a generated C# baseline.
- **Six connector reference walkthroughs** – architecture, C# and Swagger examples with local JavaScript simulations of representative logic.
- **Connector Studio** – edit C#, Swagger and fixtures; validate, preview supported transformations and export a ZIP.
- **Local-first application** – static GitHub Pages hosting, no application backend; optional direct API testing only with user confirmation.

---

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) 22 or later
- npm (bundled with Node.js)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/mightora/custom-connector-builder.git
cd custom-connector-builder

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
``` 

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Building for Production

```bash
npm run build
```

The compiled static files are written to `dist/`. You can preview the production build with:

```bash
npm run preview
```

---

## GitHub Pages Deployment

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that automatically builds and deploys the site to GitHub Pages on every push to the `main` branch.

To enable this for your own fork:

1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Source**, select **GitHub Actions**.
3. Push a commit to `main` – the workflow will build and deploy automatically.

The deployed URL will be `https://<your-username>.github.io/custom-connector-builder/`.

---

## Project Structure

```
custom-connector-builder/
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Pages deployment workflow
├── src/
│   ├── index.html             # Single-page application entry point
│   ├── main.js                # Application bootstrap and state management
│   ├── styles.css             # Custom styles (complements Mightora shared UI)
│   ├── builders/
│   │   ├── yaml-builder.js    # Generates OpenAPI 2.0 YAML
│   │   ├── csharp-builder.js  # Generates C# policy template code
│   │   └── block-builder.js   # Visual block builder logic
│   ├── data/
│   │   └── blocks.js          # Block definitions for the visual builder
│   └── examples/
│       ├── dad-jokes.js       # Dad Jokes connector example
│       └── calculation-only.js # VAT Calculation connector example
├── dist/                      # Built output (generated, not committed)
├── vite.config.js             # Vite build configuration
├── package.json
└── README.md
```

---

## Adding New Examples

1. Create a new file in `src/examples/`, e.g. `src/examples/my-connector.js`.
2. Export a named object with this shape:

```js
import { buildYaml } from '../builders/yaml-builder.js'

export const myConnectorExample = {
  name: 'My Connector',
  description: 'What this connector does.',
  config: {
    connectorName: 'My Connector',
    description: '...',
    host: 'api.example.com',
    basePath: '/',
    authType: 'none', // 'none' | 'apikey' | 'basic' | 'oauth2'
    actions: [
      {
        operationId: 'DoSomething',
        summary: 'Do something',
        description: 'A longer description.',
        method: 'get',
        path: '/something',
        parameters: [],
        responses: {
          '200': {
            description: 'Success',
            schema: { type: 'object', properties: { result: { type: 'string' } } }
          }
        }
      }
    ]
  },
  generateYaml() { return buildYaml(this.config) },
  generateCSharp() { return '// Your C# here' }
}
```

3. Import the example in `src/main.js` and add a button + event listener in `initExamples()`.
4. Add an `<article class="example-card">` in the Examples section of `src/index.html`.

---

## Adding New Block Types

1. Open `src/data/blocks.js`.
2. Add a new entry to the `BLOCKS` array:

```js
{
  id: 'my-block',           // Unique identifier (kebab-case)
  name: 'My Block',          // Display name in the palette
  description: 'What it does',
  category: 'Operations',    // 'Inputs' | 'Validation' | 'Operations' | 'Output'
  codeTemplate: 'var {varName} = doSomething({inputParam});'
  // Placeholders wrapped in {curly braces} become editable input fields in the canvas
}
```

The `codeTemplate` supports `{placeholderName}` tokens. Each unique placeholder becomes an input field in the canvas block. The block builder replaces them with the values the user enters when generating code.

---

## Known Limitations

- **Single action C# generation** – the C# builder currently uses the first action's parameters when generating the policy template. For multi-action connectors, manually merge the generated snippets.
- **No import** – you cannot import an existing YAML file to edit it. You must rebuild from scratch.
- **OAuth configuration** – the OAuth 2.0 option generates a standard Azure AD template. Custom OAuth providers require manual editing of the YAML.
- **No syntax highlighting** – the output panels display plain text. Copy the code into your editor for syntax highlighting.
- **Local storage not used** – progress is not saved between page refreshes.

---

## Future Ideas

- Import existing YAML to pre-populate the builder
- Syntax highlighting in output panels (using a lightweight library)
- Local storage persistence so work-in-progress is saved between refreshes
- Multi-action C# generation
- Swagger validation before download
- Export as `.zip` containing the YAML and C# files
- Dark mode support

---

## Licence

MIT © [Mightora](https://mightora.io)
