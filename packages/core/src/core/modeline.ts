/**
 * Parsed modeline directives from a tree-sitter query file.
 *
 * Modelines are comment lines at the top of `.scm` files that control
 * query loading behavior. This is a Neovim convention adopted by
 * nvim-treesitter for cross-language query sharing.
 *
 * @example
 * ```scheme
 * ;; inherits: ecma,jsx
 * ;; extends
 *
 * (identifier) @variable
 * ```
 */
export interface QueryModeline {
  /**
   * Languages whose queries should be prepended to this one.
   *
   * Parenthesized languages are optional — they are only included
   * when the file is loaded directly, not when it's being inherited by another language.
   *
   * @example `; inherits: ecma,(jsx)` → `[{ language: 'ecma', optional: false }, { language: 'jsx', optional: true }]`
   */
  inherits: InheritedLanguage[];

  /**
   * When `true`, this query should be appended to (rather than replace) the base query for the language.
   *
   * This is primarily a Neovim user/plugin layering mechanism.
   */
  extends: boolean;
}

export interface InheritedLanguage {
  /** The language name to inherit from. */
  language: string;
  /**
   * Whether this inheritance is optional.
   *
   * Optional languages (wrapped in parentheses) are only included
   * when the query is loaded directly, not when it's being pulled
   * in via another language's `inherits` directive.
   */
  optional: boolean;
}

/**
 * Regex matching a modeline comment line.
 *
 * Supports one or more semicolons, optional whitespace, and both
 * `; inherits: langs` and `; inherits langs` (colon is optional).
 *
 * @see https://neovim.io/doc/user/treesitter.html#treesitter-query-modeline
 */
const INHERITS_RE = /^;+\s*inherits\s*:?\s*([a-z_,() ]+)\s*$/;
const EXTENDS_RE = /^;+\s*extends\s*$/;

/**
 * Parse modeline directives from the top of a tree-sitter query string.
 *
 * Only lines starting with `;` at the very top of the file are considered.
 * Parsing stops at the first non-comment, non-empty line.
 *
 * @param content - The raw `.scm` query file content.
 * @returns The parsed modeline directives. If no modelines are found,
 *   returns `{ inherits: [], extends: false }`.
 */
export function parseModeline(content: string): QueryModeline {
  const result: QueryModeline = { inherits: [], extends: false };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Stop at first non-comment, non-empty line
    if (trimmed !== '' && !trimmed.startsWith(';')) {
      break;
    }

    // Skip empty lines and bare comment lines (`;` or `;;` with nothing after)
    if (trimmed === '' || /^;+\s*$/.test(trimmed)) {
      continue;
    }

    const inheritsMatch = trimmed.match(INHERITS_RE);

    if (inheritsMatch) {
      const langs = inheritsMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const lang of langs) {
        if (lang.startsWith('(') && lang.endsWith(')')) {
          result.inherits.push({
            language: lang.slice(1, -1),
            optional: true,
          });
        } else {
          result.inherits.push({ language: lang, optional: false });
        }
      }

      continue;
    }

    if (EXTENDS_RE.test(trimmed)) {
      result.extends = true;
    }
  }

  return result;
}

/**
 * Strip modeline comments from the top of a query string.
 *
 * Returns the query content with all leading modeline comment lines removed,
 * preserving everything else (including non-modeline comments later in the file).
 */
export function stripModeline(content: string): string {
  const lines = content.split('\n');
  let startIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith(';')) {
      startIdx++;
      continue;
    }

    break;
  }

  return lines.slice(startIdx).join('\n');
}
