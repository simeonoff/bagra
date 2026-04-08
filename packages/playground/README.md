# @bagrajs/playground

Interactive playground for testing **bagra**'s syntax highlighting, theme switching, and language injections.

## Quick start

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## What it demonstrates

| Feature                   | How it works                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Syntax highlighting**   | All registered grammars are loaded at startup via `createHighlighter({ languages })`. The core resolves query inheritance and injection languages automatically.                   |
| **Theme switching**       | All 300+ base16 themes are pre-generated as CSS and injected into the page once. Switching themes is a zero-cost `data-theme` attribute swap — no server call, no re-highlighting. |
| **Language injections**   | HTML injects CSS and JavaScript. SCSS and Rust inject comment. TypeScript inherits from ecma. All resolved by the core at init time.                                               |
| **Server-side rendering** | `codeToHtml()` runs in the SvelteKit server `load` function. The client receives fully-rendered HTML.                                                                              |
| **Code samples**          | Each language bundles one or more sample files. Samples are inlined at build time via Vite's `?raw` import.                                                                        |
| **Performance stats**     | The footer shows grammar load time, render time, and total server-side time in milliseconds.                                                                                       |

## Architecture

```
src/
├── lib/
│   ├── components/              # Svelte 5 UI components
│   │   ├── LanguageSelect       # Language dropdown
│   │   ├── ThemeSelect          # Theme dropdown (dark/light groups)
│   │   ├── SampleSelect         # Sample picker (hidden if only 1)
│   │   └── CodePreview          # Highlighted output + theme binding
│   └── server/
│       ├── highlighter.ts       # Singleton highlighter + ensureLanguage()
│       ├── themes.ts            # All themes + pre-generated CSS
│       └── languages/
│           ├── index.ts         # Auto-discovery via import.meta.glob
│           ├── types.ts         # LanguageEntry contract
│           ├── README.md        # How to add a new language
│           ├── scss/            # User-facing languages
│           ├── typescript/
│           ├── rust/
│           ├── html/
│           ├── css/
│           ├── javascript/
│           ├── ecma/            # Hidden: shared queries for TS inheritance
│           └── comment/         # Hidden: injection language for comments
└── routes/
    ├── +layout.server.ts        # Language list, theme list, theme CSS
    ├── +layout.svelte           # Global styles + theme CSS injection
    ├── +page.server.ts          # Loads language, highlights code
    └── +page.svelte             # Composes selectors + preview
```

## Adding a new language

See [`src/lib/server/languages/README.md`](src/lib/server/languages/README.md) for the step-by-step guide. In short: drop a folder, restart the dev server — done.
