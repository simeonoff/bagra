import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHighlighter as createFromCore } from '@bagrajs/core';
import { wasmBinary } from '@bagrajs/wasm';
import { createHighlighter as createFromWeb } from '@bagrajs/web';
import { describe, expect, it } from 'vitest';

const FIXTURES = resolve(__dirname, '../internal/test-utils/fixtures');
const GRAMMAR_PATH = resolve(FIXTURES, 'tree-sitter-scss.wasm');
const HIGHLIGHTS_PATH = resolve(FIXTURES, 'scss-highlights.scm');

describe('web entry point (@bagrajs/web)', () => {
  it('exports createHighlighter that works with highlights as a path', async () => {
    const hl = await createFromWeb({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('bagra-variable');
    expect(html).toContain('$x');

    hl.dispose();
  });

  it('does not accept wasmBinary option (Omit type)', async () => {
    // The web entry point signature omits wasmBinary — it's auto-provided.
    // This is a compile-time check; at runtime, we just verify it works.
    const hl = await createFromWeb();
    expect(hl.getLanguages()).toEqual([]);
    hl.dispose();
  });
});

describe('core entry point (@bagrajs/core)', () => {
  it('works when wasmBinary is provided as a Buffer (Node.js)', async () => {
    const wasmBuffer = await readFile(
      resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    );

    const hl = await createFromCore({
      wasmBinary: wasmBuffer,
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('bagra-variable');

    hl.dispose();
  });

  it('works when wasmBinary is provided as an ArrayBuffer', async () => {
    const buffer = await readFile(
      resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    );

    const hl = await createFromCore({
      wasmBinary: buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('bagra-variable');

    hl.dispose();
  });
});

describe('wasm entry point (@bagrajs/wasm)', () => {
  it('exports wasmBinary as a Uint8Array', () => {
    expect(wasmBinary).toBeInstanceOf(Uint8Array);
    // The WASM binary should be non-trivially sized (~192KB)
    expect(wasmBinary.length).toBeGreaterThan(100_000);
  });

  it('contains a valid WASM magic number', () => {
    // WASM files start with \0asm (0x00 0x61 0x73 0x6d)
    expect(wasmBinary[0]).toBe(0x00);
    expect(wasmBinary[1]).toBe(0x61);
    expect(wasmBinary[2]).toBe(0x73);
    expect(wasmBinary[3]).toBe(0x6d);
  });

  it('can be used with the core entry point', async () => {
    const hl = await createFromCore({
      wasmBinary,
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('bagra-variable');

    hl.dispose();
  });
});

describe('output consistency across entry points', () => {
  it('web and core entry points produce identical HTML output', async () => {
    const code = '$primary: #333;\n.container { color: $primary; }';

    const hlWeb = await createFromWeb({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const hlCore = await createFromCore({
      wasmBinary,
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const htmlWeb = hlWeb.codeToHtml('scss', code);
    const htmlCore = hlCore.codeToHtml('scss', code);

    expect(htmlWeb).toBe(htmlCore);

    hlWeb.dispose();
    hlCore.dispose();
  });

  it('web and core entry points produce identical tokens', async () => {
    const code = '$x: 1;';

    const hlWeb = await createFromWeb({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const hlCore = await createFromCore({
      wasmBinary,
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    const tokensWeb = hlWeb.codeToTokens('scss', code);
    const tokensCore = hlCore.codeToTokens('scss', code);

    expect(tokensWeb).toEqual(tokensCore);

    hlWeb.dispose();
    hlCore.dispose();
  });
});
