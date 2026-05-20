# bagra

Parser-accurate syntax highlighting for the web, powered by tree-sitter WASM grammars. Uses the actual parser grammar for tokenization instead of regex approximations.

> This project is in early development. APIs may change.

## Packages

| Package                                        | Description                                       | Status    |
| ---------------------------------------------- | ------------------------------------------------- | --------- |
| [`@bagrajs/core`](packages/core)               | Core highlighter (bring your own WASM binary)     | Available |
| [`@bagrajs/web`](packages/web)                 | Batteries-included entry point with inlined WASM  | Available |
| [`@bagrajs/wasm`](packages/wasm)               | Inlined `web-tree-sitter` binary                  | Available |
| [`@bagrajs/themes`](packages/themes)           | 300+ Base16 color schemes (JS + CSS)              | Available |
| [`@bagrajs/rehype`](packages/rehype)           | rehype plugin for unified/Astro pipelines         | Available |
| [`@bagrajs/markdown-it`](packages/markdown-it) | markdown-it plugin for VitePress                  | Planned   |
| [`@bagrajs/playground`](packages/playground)   | Interactive playground for testing and showcasing | Available |

## Playground

The playground lets you test syntax highlighting across languages and all included themes interactively:

```bash
npm run playground
```

See [`packages/playground`](packages/playground) for details.

## License

MIT
