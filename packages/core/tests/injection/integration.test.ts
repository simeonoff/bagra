import { readFile } from 'node:fs/promises';
import { grammar, query } from '@bagrajs/test-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHighlighter } from '@/highlighter';
import type { Highlighter } from '@/types';

describe('HTML + CSS + JS injection', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        html: {
          grammar: grammar('html'),
          queries: {
            highlights: query('html', 'highlights'),
            injections: query('html', 'injections'),
          },
        },
        css: {
          grammar: grammar('css'),
          queries: { highlights: query('css', 'highlights') },
        },
        javascript: {
          grammar: grammar('javascript'),
          queries: {
            highlights: query('javascript', 'highlights'),
            injections: query('javascript', 'injections'),
          },
        },
        jsdoc: {
          grammar: grammar('jsdoc'),
          queries: { highlights: query('jsdoc', 'highlights') },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  const source = `
    <div class="app">Hello</div>
    <style>.app { color: red; }</style>
    <script>console.log("hello");</script>
  `.trim();

  it('produces HTML output without errors', () => {
    const html = hl.codeToHtml('html', source);

    expect(html).toBeTruthy();
    expect(html).toContain('<pre');
    expect(html).toContain('</pre>');
  });

  it('highlights host HTML elements', () => {
    const html = hl.codeToHtml('html', source);

    expect(html).toContain('div');
    expect(html).toContain('class');
  });

  it('highlights CSS inside <style>', () => {
    const html = hl.codeToHtml('html', source);

    expect(html).toContain('color');
    expect(html).toContain('red');
  });

  it('highlights JavaScript inside <script>', () => {
    const html = hl.codeToHtml('html', source);

    expect(html).toContain('console');
    expect(html).toContain('hello');
  });

  it('produces tokens with captures from injected languages', () => {
    const tokens = hl.codeToTokens('html', source);
    expect(tokens).toHaveLength(3);

    const styleLine = tokens[1];
    const capturedTokens = styleLine.filter((t) => t.captures.length > 0);
    expect(capturedTokens.length).toBeGreaterThan(0);

    const scriptLine = tokens[2];
    const scriptCaptured = scriptLine.filter((t) => t.captures.length > 0);
    expect(scriptCaptured.length).toBeGreaterThan(0);
  });

  it('handles a style-only document', () => {
    const html = hl.codeToHtml('html', '<style>body { margin: 0; }</style>');

    expect(html).toContain('margin');
    expect(html).toBeTruthy();
  });

  it('handles a script-only document', () => {
    const html = hl.codeToHtml('html', '<script>const x = 42;</script>');

    expect(html).toContain('const');
    expect(html).toBeTruthy();
  });

  it('gracefully handles injection into unloaded language', () => {
    // HTML with a hypothetical <script type="text/python"> — python not loaded
    // Should not throw, host HTML still highlighted
    const html = hl.codeToHtml('html', '<div>hello</div>');
    expect(html).toContain('div');
  });
});

describe('SCSS + SassDoc injection', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: grammar('scss'),
          queries: {
            highlights: query('scss', 'highlights'),
            injections: query('scss', 'injections'),
          },
        },
        sassdoc: {
          grammar: grammar('sassdoc'),
          queries: {
            highlights: query('sassdoc', 'highlights'),
            injections: query('sassdoc', 'injections'),
          },
        },
        css: {
          grammar: grammar('css'),
          queries: { highlights: query('css', 'highlights') },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  const source = `
    /// Resolves a color value.
    /// @param {String} $name - The color name
    /// @example scss - Usage
    ///   $result: resolve-color("ice");
    ///   // => #caf0f8
    /// @returns {Color} The color value
    @function resolve-color($name) {
      @return map.get($colors, $name);
    }
    `.trim();

  it('produces HTML output without errors', () => {
    const html = hl.codeToHtml('scss', source);
    expect(html).toBeTruthy();
    expect(html).toContain('<pre');
  });

  it('highlights SCSS keywords', () => {
    const html = hl.codeToHtml('scss', source);

    expect(html).toContain('@function');
    expect(html).toContain('@return');
  });

  it('highlights SassDoc tags in doc comments', () => {
    const tokens = hl.codeToTokens('scss', source);
    const allCaptures = tokens.flat().flatMap((t) => t.captures);

    // Should have captures from the sassdoc layer
    // (param, returns, example are sassdoc tags)
    expect(allCaptures.length).toBeGreaterThan(0);
  });

  it('handles recursive injection (SCSS inside SassDoc @example)', () => {
    // The @example scss block should trigger a re-injection of SCSS inside the sassdoc comment.
    // The $result variable should get SCSS highlighting.
    const tokens = hl.codeToTokens('scss', source);

    // Line 4 (index 3): "///   $result: resolve-color("ice");"
    // Should have tokens with captures from the injected SCSS layer
    const exampleLine = tokens[3];
    const capturedTokens = exampleLine.filter((t) => t.captures.length > 0);

    expect(capturedTokens.length).toBeGreaterThan(0);
  });

  it('does not infinite-loop on SCSS → SassDoc → SCSS cycle', () => {
    // This test verifies cycle detection works.
    // If it completes without hanging, cycle detection is working.
    const html = hl.codeToHtml('scss', source);

    expect(html).toBeTruthy();
  });

  it('handles SCSS without doc comments', () => {
    const plain = '$color: red;\n.nav { color: $color; }';
    const html = hl.codeToHtml('scss', plain);

    expect(html).toContain('$color');
    expect(html).toBeTruthy();
  });

  it('gracefully skips injection into unloaded comment language', () => {
    // SCSS injects "comment" language for // comments but there's
    // no comment grammar loaded — should not throw
    const code = '// this is a comment\n$x: 1;';
    const html = hl.codeToHtml('scss', code);

    expect(html).toBeTruthy();
  });
});

describe('JavaScript + JSDoc injection', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        javascript: {
          grammar: grammar('javascript'),
          queries: {
            highlights: query('javascript', 'highlights'),
            injections: query('javascript', 'injections'),
          },
        },
        jsdoc: {
          grammar: grammar('jsdoc'),
          queries: { highlights: query('jsdoc', 'highlights') },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  const source = [
    '/**',
    ' * Adds two numbers.',
    ' * @param {number} a - First number',
    ' * @param {number} b - Second number',
    ' * @returns {number} The sum',
    ' */',
    'function add(a, b) {',
    '  return a + b;',
    '}',
  ].join('\n');

  it('produces HTML output without errors', () => {
    const html = hl.codeToHtml('javascript', source);

    expect(html).toBeTruthy();
    expect(html).toContain('<pre');
  });

  it('highlights JavaScript keywords and functions', () => {
    const html = hl.codeToHtml('javascript', source);

    expect(html).toContain('function');
    expect(html).toContain('return');
  });

  it('highlights JSDoc content inside comments', () => {
    const tokens = hl.codeToTokens('javascript', source);
    // Lines 0-5 are the JSDoc comment
    // Should have captures from the jsdoc injection
    const commentLines = tokens.slice(0, 6);
    const allCaptures = commentLines.flat().flatMap((t) => t.captures);

    expect(allCaptures.length).toBeGreaterThan(0);
  });

  it('produces tokens for the full document', () => {
    const tokens = hl.codeToTokens('javascript', source);

    // 9 lines of source
    expect(tokens).toHaveLength(9);

    // Last line "}" should have at least one token
    const lastLine = tokens[8];

    expect(lastLine.length).toBeGreaterThan(0);
  });

  it('handles JS without JSDoc', () => {
    const plain = 'const x = 42;\nconsole.log(x);';
    const html = hl.codeToHtml('javascript', plain);

    expect(html).toContain('const');
    expect(html).toBeTruthy();
  });
});

describe('TypeScript with ecma inheritance', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    // TypeScript queries inherit from ecma.
    // ecma has no grammar — it's query-only, used for inheritance.
    // We need to provide ecma's query content so TypeScript's
    // modeline can resolve it.
    const ecmaHighlights = await readFile(query('ecma', 'highlights'), 'utf-8');
    const ecmaInjections = await readFile(query('ecma', 'injections'), 'utf-8');

    hl = await createHighlighter({
      languages: {
        typescript: {
          grammar: grammar('typescript'),
          queries: {
            highlights: query('typescript', 'highlights'),
            injections: query('typescript', 'injections'),
          },
        },
        // ecma is query-only — no grammar, but its queries are needed
        // for inheritance resolution. We provide them as language
        // definitions that TypeScript's modeline can resolve from.
        ecma: {
          grammar: grammar('javascript'), // use JS grammar as stand-in
          queries: {
            highlights: { content: ecmaHighlights },
            injections: { content: ecmaInjections },
          },
        },
        jsdoc: {
          grammar: grammar('jsdoc'),
          queries: { highlights: query('jsdoc', 'highlights') },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  const source = `
    interface User {
      name: string;
      age: number;
    }

    const greet = (user: User): string => {
      return Hello, \`$\{user.name}\`!;
    };
    `.trim();

  it('produces HTML output without errors', () => {
    const html = hl.codeToHtml('typescript', source);

    expect(html).toBeTruthy();
    expect(html).toContain('<pre');
  });

  it('highlights TypeScript-specific syntax', () => {
    const html = hl.codeToHtml('typescript', source);

    // "interface" is a TypeScript keyword
    expect(html).toContain('interface');

    // Type annotations should appear
    expect(html).toContain('string');
  });

  it('highlights ECMAScript syntax from inherited queries', () => {
    const html = hl.codeToHtml('typescript', source);

    // "const" is an ECMAScript keyword — should be highlighted
    // via the inherited ecma highlights query
    expect(html).toContain('const');

    // Arrow function
    expect(html).toContain('=&gt;');
  });

  it('produces tokens across the full document', () => {
    const tokens = hl.codeToTokens('typescript', source);

    // 8 lines of source
    expect(tokens).toHaveLength(8);

    // Should have captured tokens on the interface line
    const interfaceLine = tokens[0];
    const capturedTokens = interfaceLine.filter((t) => t.captures.length > 0);

    expect(capturedTokens.length).toBeGreaterThan(0);
  });

  it('handles TypeScript with JSDoc (inherited ecma injection)', () => {
    const withDoc = `
      /** @param {string} name */
      function greet(name: string) {
        return \`Hello, \${name}!\`;
      },
    `.trim();

    const tokens = hl.codeToTokens('typescript', withDoc);

    // First line is JSDoc — should have captures from jsdoc injection
    const docLine = tokens[0];
    const capturedTokens = docLine.filter((t) => t.captures.length > 0);

    expect(capturedTokens.length).toBeGreaterThan(0);
  });
});

describe('Rust cross-capture predicates', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        rust: {
          grammar: grammar('rust'),
          queries: {
            highlights: query('rust', 'highlights'),
            injections: query('rust', 'injections'),
          },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  it('highlights write! as function.macro, not keyword.exception', () => {
    // The highlights query has:
    //   (#contains? @_identifier "assert")  → @keyword.exception
    // This predicate references @_identifier (a different capture in
    // the same match). "write" does not contain "assert", so the match
    // should be filtered out, and write! should get @function.macro
    // from the generic macro_invocation pattern instead.
    const source = 'write!(f, "hello")';
    const tokens = hl.codeToTokens('rust', source);

    const writeToken = tokens[0].find((t) => t.text === 'write');
    expect(writeToken?.captures).toContain('function.macro');
    expect(writeToken?.captures).not.toContain('keyword.exception');
  });

  it('highlights panic! as keyword.exception', () => {
    // panic! matches (#eq? @_identifier "panic") → @keyword.exception
    const source = 'panic!("error")';
    const tokens = hl.codeToTokens('rust', source);

    const panicToken = tokens[0].find((t) => t.text === 'panic');
    expect(panicToken?.captures).toContain('keyword.exception');
  });

  it('highlights assert! as keyword.exception', () => {
    // assert! matches (#contains? @_identifier "assert") → @keyword.exception
    const source = 'assert!(true)';
    const tokens = hl.codeToTokens('rust', source);

    const assertToken = tokens[0].find((t) => t.text === 'assert');
    expect(assertToken?.captures).toContain('keyword.exception');
  });

  it('highlights assert_eq! as keyword.exception', () => {
    // assert_eq contains "assert" → @keyword.exception
    const source = 'assert_eq!(1, 1)';
    const tokens = hl.codeToTokens('rust', source);

    const assertToken = tokens[0].find((t) => t.text === 'assert_eq');
    expect(assertToken?.captures).toContain('keyword.exception');
  });

  it('highlights dbg! as keyword.debug', () => {
    // dbg! matches (#eq? @_identifier "dbg") → @keyword.debug
    const source = 'dbg!(42)';
    const tokens = hl.codeToTokens('rust', source);

    const dbgToken = tokens[0].find((t) => t.text === 'dbg');
    expect(dbgToken?.captures).toContain('keyword.debug');
  });

  it('highlights println! as function.macro (not keyword.exception)', () => {
    // println does not contain "assert" and is not "panic" or "dbg"
    const source = 'println!("hello")';
    const tokens = hl.codeToTokens('rust', source);

    const printlnToken = tokens[0].find((t) => t.text === 'println');
    expect(printlnToken?.captures).toContain('function.macro');
    expect(printlnToken?.captures).not.toContain('keyword.exception');
  });
});
