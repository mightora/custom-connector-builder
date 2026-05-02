# Custom Connector Builder

A free, open-source web tool that helps Power Platform developers create custom connectors without writing YAML or C# from scratch.

Built and maintained by [Mightora](https://mightora.io). Deployed to GitHub Pages.

---

## What Is This?

Power Platform custom connectors are configured using two files:

1. **OpenAPI 2.0 (Swagger) YAML** – describes the API, its actions, parameters, and responses.
2. **C# policy template script** – optional code that transforms requests and responses inside the connector runtime.

Writing these files by hand is error-prone and time-consuming. This tool guides you through a 10-step wizard and generates both files for you.

---

## Who Is It For?

- Power Platform makers who want to connect to an API not already in the connector catalogue
- Developers building calculation-only connectors (no external API)
- Anyone wanting to learn how custom connectors are structured

---

## Features

- **10-step guided builder** – define connector type, name, authentication, actions, parameters, and responses
- **Visual block builder** – assemble C# logic using pre-built code blocks (inputs, validation, operations, outputs)
- **Live output panels** – YAML and C# update as you configure the connector
- **Authentication patterns** – no auth, API key, Basic Auth, OAuth 2.0
- **Working examples** – Dad Jokes (external API) and VAT Calculator (calculation-only)
- **Copy to clipboard** – one-click copying of generated files
- **Entirely static** – no backend, no data sent anywhere, runs in the browser

---

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
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
