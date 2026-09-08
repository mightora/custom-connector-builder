# Copilot Instructions - Custom Connector Builder

This project is a entirely static, single-page web application (SPA) designed to help Power Platform developers build custom connectors with modern, visual tooling.

## 1. High-Level Architecture & Workflow
The site is built as a lightweight, framework-free single-page application using modern ES Modules, HTML5, and CSS3.
- **Frontend Source**: Located entirely inside the [src/](src) directory.
- **Entry point**: The browser loads [src/index.html](src/index.html), which pulls in [src/main.js](src/main.js) and [src/styles.css](src/styles.css).
- **Core logic**: Code generation strategies, visual block assembly, and builders live in [src/builders/](src/builders) and [src/data/](src/data).
- **Static Output**: Build tools bundle the assets and write everything into the [dist/](dist) folder, which is populated only at build-time.

## 2. Dev Environment and Build Pipeline
- **Bundler / Dev Server**: [Vite](https://vite.dev/) is used to serve and build the application.
- **Vite Configuration**: Defined in [vite.config.js](vite.config.js).
  - `root: 'src'` redirects Vite to look inside the [src/](src) directory as the source root.
  - `base: './'` ensures all asset references (JS, CSS, assets) are relative. This is critical for hosting under sub-domains such as GitHub Pages.
  - `build.outDir: '../dist'` places build artifacts in [dist/](dist) at the project root root directory.
  - `build.emptyOutDir: true` cleans the output folder before rebuilding.
- **Scripts**:
  - `npm run dev`: Starts the local development environment using Vite.
  - `npm run build`: Compiles the application into production-ready static assets in [dist/](dist).
  - `npm run preview`: Previews the compiled bundle locally.

## 3. Deployment and Distribution
Deployments are fully automated via GitHub Pages using GitHub Actions.
- **Workflow File**: Located at [.github/workflows/pages.yml](.github/workflows/pages.yml).
- **Job Trigger**: Runs on every push to the `main` branch, or when triggered manually via `workflow_dispatch`.
- **Concurrency**: Grouped under `pages` with `cancel-in-progress: true` to prevent concurrent deployments.
- **Permissions**: Requires write access for `pages` and `id-token` to authenticate with GitHub Pages without using hardcoded tokens.
- **Deployment Process**:
  1. **Build Job**:
     - Checks out the repository code.
     - Automatically installs Node.js 20 and caches dependencies (`npm` cache).
     - Installs dependencies using `npm ci`.
     - Compiles the site into production-ready static files in [dist/](dist) via `npm run build`.
     - Uploads the [dist/](dist) directory to GitHub Actions artifacts storage using `actions/upload-pages-artifact@v3`.
  2. **Deploy Job**:
     - Runs in the `github-pages` environment.
     - Downloads the build artifact and deploys it to the public GitHub Pages URL via `actions/deploy-pages@v4`.
