# @bagrajs/rehype

rehype plugin for tree-sitter syntax highlighting with [bagra](https://github.com/simeonoff/bagra).

## Install

```bash
npm install @bagrajs/core @bagrajs/themes @bagrajs/rehype unified
```

## Usage

```ts
import { createHighlighter } from '@bagrajs/web';
import { ayuLight, nord } from '@bagrajs/themes/base16';
import rehypeBagra from '@bagrajs/rehype';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

const hl = await createHighlighter({
  languages: {
    scss: {
      grammar: '/grammars/tree-sitter-scss.wasm',
      highlights: '/grammars/scss-highlights.scm',
    },
  },
  themes: [ayuLight, nord],
});

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeBagra, {
    highlighter: hl,
    themes: { light: 'ayu-light', dark: 'nord' },
  })
  .use(rehypeStringify)
  .process('```scss\n$color: red;\n```');

hl.dispose();
```

## Options

| Option         | Type                     | Required | Description                                                         |
|----------------|--------------------------|----------|---------------------------------------------------------------------|
| `highlighter`  | `Highlighter`            | Yes      | A pre-created bagra highlighter instance                            |
| `theme`        | `string`                 | No       | Single theme name, sets `data-theme` on the `<pre>` element         |
| `themes`       | `Record<string, string>` | No       | Multiple named themes (e.g. `{ light: 'ayu-light', dark: 'nord' }`) |
| `defaultColor` | `string \| false`        | No       | Which key from `themes` to use as the default `data-theme` value    |

## Behavior

- Finds `<pre><code class="language-xxx">` elements in the HAST tree
- Replaces them with highlighted output from the bagra highlighter
- Code blocks with unknown languages are left untouched
- Trailing newlines (added by `remark-rehype`) are stripped before highlighting
- When `theme` or `themes` is set, injects a `<style>` element at the top of the tree with the theme CSS custom properties
- With `themes: { light, dark }` and no `defaultColor`, generates `@media (prefers-color-scheme)` rules for automatic switching

## Roadmap

| Feature                                      | Status  |
|----------------------------------------------|---------|
| Fenced code block highlighting               | Done    |
| Theme support via `data-theme`               | Done    |
| Default language fallback                    | Planned |
| Inline code highlighting                     | Planned |
| Meta string parsing (e.g. line highlighting) | Planned |

## License

MIT
