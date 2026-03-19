/**
 * rehype plugin for tree-sitter syntax highlighting with bagra.
 *
 * Walks the HAST tree looking for `<pre><code class="language-xxx">` elements
 * (the standard structure produced by `remark-rehype` from fenced code blocks)
 * and replaces them with highlighted output from a bagra {@link Highlighter}.
 *
 * When themes are loaded in the highlighter and configured via the `theme` or
 * `themes` option, the plugin injects a `<style>` element at the top of the
 * document containing the Base16 CSS custom property declarations.
 *
 * Code blocks whose language is not loaded in the highlighter are left untouched.
 * Trailing newlines added by `remark-rehype` are stripped before highlighting.
 *
 * @example Single theme
 * ```ts
 * const hl = await createHighlighter({
 *   themes: [nord],
 *   languages: { ... },
 * });
 *
 * const file = await unified()
 *   .use(remarkParse)
 *   .use(remarkRehype)
 *   .use(rehypeBagra, { highlighter: hl, theme: 'nord' })
 *   .use(rehypeStringify)
 *   .process('```scss\n$color: red;\n```');
 * ```
 *
 * @example Automatic light/dark switching
 * ```ts
 * const hl = await createHighlighter({
 *   themes: [ayuLight, nord],
 *   languages: { ... },
 * });
 *
 * const file = await unified()
 *   .use(remarkParse)
 *   .use(remarkRehype)
 *   .use(rehypeBagra, {
 *     highlighter: hl,
 *     themes: { light: 'ayu-light', dark: 'nord' },
 *   })
 *   .use(rehypeStringify)
 *   .process('```scss\n$color: red;\n```');
 * ```
 *
 * @module
 */
import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  buildCodeOptions,
  createStyleElement,
  generateThemeStyles,
} from './theme-styles';
import type { RehypeBagraOptions } from './types';

/**
 * rehype plugin for tree-sitter syntax highlighting with bagra.
 *
 * @param options - Plugin options including a pre-created Highlighter instance.
 * @returns A HAST transformer that highlights code blocks in place.
 */
const rehypeBagra: Plugin<[RehypeBagraOptions], Root> = (
  options: RehypeBagraOptions,
) => {
  const { highlighter } = options;
  const codeOptions = buildCodeOptions(options);

  return (tree: Root) => {
    let styleInjected = false;

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre') return;
      if (parent === null || index === undefined) return;

      const codeChild = node.children.find(
        (child) => child.type === 'element' && child.tagName === 'code',
      );
      if (!codeChild || codeChild.type !== 'element') return;

      const classes = Array.isArray(codeChild.properties?.className)
        ? codeChild.properties.className
        : [];

      const langClass = classes.find(
        (cls) => typeof cls === 'string' && cls.startsWith('language-'),
      );
      if (!langClass || typeof langClass !== 'string') return;

      const lang = langClass.slice('language-'.length);

      if (!highlighter.hasLanguage(lang)) return;

      if (!styleInjected) {
        const css = generateThemeStyles(highlighter, options);

        if (css) {
          tree.children.unshift(createStyleElement(css));
        }

        styleInjected = true;
      }

      let code = '';

      for (const child of codeChild.children) {
        if (child.type === 'text') {
          code += child.value;
        }
      }

      if (code.endsWith('\n')) {
        code = code.slice(0, -1);
      }

      const result = highlighter.codeToHast(lang, code, codeOptions);
      const highlighted = result.children[0];

      if (highlighted) {
        const currentIndex = parent!.children.indexOf(node);
        parent!.children[currentIndex] = highlighted;
      }

      return 'skip';
    });
  };
};

export default rehypeBagra;
export type { RehypeBagraOptions };
