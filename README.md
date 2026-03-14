# bagra

Syntax highlighting for the web using tree-sitter WASM grammars. Uses the actual parser grammar for tokenization instead of regex approximations.

> This project is in early development. APIs will change.

## Packages

- `@bagra/core` — core highlighter (bring your own WASM binary)
- `@bagra/web` — batteries-included entry point with inlined WASM
- `@bagra/wasm` — inlined `web-tree-sitter` binary
- `@bagra/markdown-it` — markdown-it plugin (not yet implemented)
- `@bagra/rehype` — rehype plugin (not yet implemented)

## License

MIT
