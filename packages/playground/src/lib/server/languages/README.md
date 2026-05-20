# Adding a Language to the Playground

Each language lives in its own self-contained folder under `src/lib/server/languages/`.
The auto-discovery system picks up new folders automatically — **no edits to any other file required**.

## Folder structure

```
src/lib/server/languages/<id>/
├── index.ts                     # LanguageEntry definition
├── tree-sitter-<id>.wasm        # Tree-sitter grammar binary
├── highlights.scm               # Highlights query
├── injections.scm               # Injections query (optional)
└── samples/
    ├── basic.<ext>              # At least one sample file
    └── advanced.<ext>           # Additional samples (optional)
```

## Step-by-step

### 1. Create the folder

```bash
mkdir -p src/lib/server/languages/python/samples
```

### 2. Add the grammar and queries

Copy or download the tree-sitter WASM grammar and query `.scm` files:

```bash
cp path/to/tree-sitter-python.wasm src/lib/server/languages/python/
cp path/to/python/highlights.scm   src/lib/server/languages/python/
cp path/to/python/injections.scm   src/lib/server/languages/python/   # optional
```

### 3. Add sample files

Create one or more sample source files:

```bash
cat > src/lib/server/languages/python/samples/basic.py << 'EOF'
def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"

class Counter:
    def __init__(self, start: int = 0):
        self._count = start

    def increment(self) -> int:
        self._count += 1
        return self._count
EOF
```

### 4. Create the entry module

The grammar is imported as a bare `.wasm` file — the `wasmInlinePlugin` in `vite.config.ts`
transforms it into an inlined `Uint8Array` at build time. Queries and samples use Vite's `?raw`
suffix to inline their content as strings.

```ts
// src/lib/server/languages/python/index.ts
import type { LanguageEntry } from '../types';
import grammar from './tree-sitter-python.wasm';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';   // omit if no injections
import basicSample from './samples/basic.py?raw';

const python: LanguageEntry = {
  id: 'python',
  displayName: 'Python',
  extension: 'py',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },  // omit if no injections
    },
  },
  samples: [
    { id: 'basic', label: 'Basic', code: basicSample },
  ],
};

export default python;
```

### 5. Add a type declaration (if needed)

If your sample file extension isn't already declared in `src/vite-imports.d.ts`,
add a module declaration:

```ts
declare module '*.py?raw' {
  const content: string;
  export default content;
}
```

### 6. Done!

Restart the server. Your language will appear in the dropdown automatically.

## How it works

- `import.meta.glob('./*/index.ts', { eager: true })` in the registry discovers all language folders at build time.
- `.wasm` imports are transformed by the `wasmInlinePlugin` into base64-encoded `Uint8Array` exports, so grammars are embedded in the server bundle and work in both dev and production.
- `?raw` imports inline query and sample files as strings at bundle time.
- All languages are passed to `createHighlighter({ languages })` at startup, so the core resolves query inheritance (`; inherits: ecma`) and injection languages automatically.

## Multiple samples

Add more sample files and reference them in the `samples` array:

```ts
samples: [
  { id: 'basic',    label: 'Basic',         code: basicSample },
  { id: 'advanced', label: 'Advanced',      code: advancedSample },
  { id: 'async',    label: 'Async Patterns', code: asyncSample },
],
```

The sample selector only appears when a language has more than one sample.

## Hidden languages

Set `hidden: true` on a `LanguageEntry` to exclude it from the UI dropdown.
Use this for injection-only languages (e.g. `comment`) and shared query sets
(e.g. `ecma`) that support other languages but aren't meaningful to select standalone.

## Injection languages

If your language uses injections (e.g., HTML injecting CSS and JavaScript), make sure
the injected languages are also registered as their own folders. The core resolves
injections automatically at init time because all languages are loaded together via
`createHighlighter({ languages })`. Missing injection languages produce a warning
but don't crash.
