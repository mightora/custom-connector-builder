---
name: design-system
applyTo: "src/**/*.{html,css,js}"
description: "Rules for UI styling, branding, logos, headers, footers, and design tokens of Mightora."
---

# Design & Branding System Guidelines

Follow these guidelines strictly when writing or modifying UI files (`.html`, `.css`, `.js`) in this project to preserve brand alignment and correct visual layouts.

## 1. Branding & Assets

### Logo Rules
- **Mightora Logo**: Always use the correct, full Mightora brand logo image. Do not use the square/profile `main-logo.png` logo or TechTweedie logo in any primary header position.
- **Header logo light / dark values**:
  - `logo-light="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"`
  - `logo-dark="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"`

### Shared UI Libraries
The site pulls in shared mightora assets from the `mightora/shared-ui` package via jsDelivr CDN at runtime:
1. Stylesheet: `https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/shared.css`
2. Elements bootstrap: `https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/components.js`

---

## 2. Shared Web Components

### A. Title/Header Element (`<mightora-header>`)
The header is built dynamically as a Web Component to keep consistency across various Mightora resources. It features a built-in interactive hamburger menu button for tablet/mobile screen widths automatically.
- Must have `site-name`, `site-url`, `logo-light`, `logo-dark` attributes defined.
- Example structure:
  ```html
  <mightora-header
    site-name="Custom Connector Builder"
    site-url="/"
    logo-light="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"
    logo-dark="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"
    nav-links='[
      {"label":"How It Works","url":"/#how-it-works"},
      {"label":"Prompt Builder","url":"/#gpt-prompt"},
      {"label":"Sample Connectors","url":"/#sample-connectors"},
      {"label":"Mightora.io ↗","url":"https://mightora.io","ext":true}
    ]'>
  </mightora-header>
  ```

### AA. Quick Navigation Bar (`<nav class="quick-jump-nav">`)
To optimize the scanning experience and reduce long scroll times, we feature a sticky quick-jump bar directly beneath the dynamic header on the home view screen, plus an automated dynamic Table of Contents (`<nav class="connector-toc">`) injected at the top of detail document pages.
- The sticky navigation bar links must use structural hash values with corresponding sections (`#how-it-works`, `#gpt-prompt`, `#sample-connectors`).
- Ensure `scroll-margin-top` holds height accommodations so headers do not collide behind the sticky navigation bar in views.

### B. Title/Footer Element (`<mightora-footer>`)
We must use the `<mightora-footer>` web component instead of a raw static HTML footer. This ensures column lists and brand card buttons render dynamically.
- **Dependency**: The footer component requires the `js-yaml` parser library loaded *before* `components.js` in execution order.
- **Indentation Interception**: To circumvent a known remote indentation syntax error inside the CDM's `footer.yaml` file, an inline fetch monkey-patch has been added in the `<head>` of the entry document. Do not remove or alter this patch as it is required for `js-yaml` parsing.
- Example structure at the base of the page:
  ```html
  <mightora-footer>
    <div class="container">
      <div class="footer-bottom">
        <div class="footer-copy">
          Custom Connector Builder by <a href="https://mightora.io" target="_blank" rel="noopener noreferrer">Mightora</a>.
          Open source on <a href="https://github.com/mightora/custom-connector-builder" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </div>
        <div class="footer-bottom-links">
          <span class="site-footer__note">Not affiliated with Microsoft. Power Platform is a trademark of Microsoft Corporation.</span>
        </div>
      </div>
    </div>
  </mightora-footer>
  ```

### C. Biography / Author Section Element (`<mightora-author>`)
We must display the biographical block detailing the creator right above the footer element.
- **Static Fallback Pattern**: Since there is no dynamic JSON profile configurator inside the repository, the structural metadata is served as inline content inside the component, which relies on the component catch fallback logic.
- **Component HTML Definition**:
  ```html
  <mightora-author>
    <div class="author-section-overlay">
      <div class="author-section-inner">
        <div class="author-photos">
          <img src="https://techtweedie.github.io/images/author/ian-tweedie-sq2_hu_a380911c6f4726de.png" alt="Ian Tweedie" class="author-avatar" />
          <img src="https://raw.githubusercontent.com/TechTweedie/techtweedie.github.io/v2/assets/images/site/main-logo.png" alt="TechTweedie" class="author-blog-logo" />
        </div>
        <div class="author-text">
          <h2 class="author-heading">Built by TechTweedie</h2>
          <p class="author-bio">
            Custom Connector Builder is a free tool created by <strong>Ian Tweedie</strong> — also known online as <strong>TechTweedie</strong>. Ian is a technology consultant and developer based in North East England with a background in enterprise IT, cloud infrastructure, and developer tooling. He builds free, practical tools and writes about technology on his blog.
          </p>
          <div class="author-links">
            <a href="https://techtweedie.github.io" target="_blank" rel="noopener" class="author-link">
              <i class="fas fa-blog"></i> Blog
            </a>
            <a href="https://github.com/itweedie" target="_blank" rel="noopener" class="author-link">
              <i class="fab fa-github"></i> GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </mightora-author>
  ```

---

## 3. Styling Codes & Tokens
- **Theme Variables**: Always complement variables defined by the main sheet. Base styles should utilize CSS Custom Properties defined inside `styles.css`.
- **Primary Colors**: Use `--ccb-primary` and `--ccb-accent` for custom connector layouts.
- **Interactive Element Rules**: Hover/Active states must preserve high contrast rules.
- **Focus Indicators (Accessibility)**: Ensure keyboard navigability (focus states) uses:
  ```css
  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline: 3px solid var(--ccb-accent);
    outline-offset: 2px;
  }
  ```
