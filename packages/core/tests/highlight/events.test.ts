import { describe, expect, it } from 'vitest';
import type { QueryCapture } from 'web-tree-sitter';
import { generateEvents } from '@/highlight/events';
import type { HighlightEvent } from '@/types';

/**
 * Helper to create a mock QueryCapture for the events generator.
 */
function mockCapture(
  name: string,
  startIndex: number,
  endIndex: number,
): QueryCapture {
  return {
    name,
    patternIndex: 0,
    node: { id: startIndex, startIndex, endIndex } as any,
  };
}

/** Shorthand helpers for asserting events */
function lineStart(): HighlightEvent {
  return { type: 'line-start' };
}

function lineEnd(): HighlightEvent {
  return { type: 'line-end' };
}

function start(captureName: string): HighlightEvent {
  return { type: 'start', captureName };
}

function end(): HighlightEvent {
  return { type: 'end' };
}

function source(s: number, e: number): HighlightEvent {
  return { type: 'source', start: s, end: e };
}

describe('generateEvents — single line', () => {
  it('wraps empty source in a single empty line', () => {
    const events = generateEvents([], 0, '');
    expect(events).toEqual([lineStart(), lineEnd()]);
  });

  it('wraps unhighlighted source in a single line', () => {
    const src = 'hello world';
    const events = generateEvents([], src.length, src);
    expect(events).toEqual([lineStart(), source(0, 11), lineEnd()]);
  });

  it('wraps a single capture in a line', () => {
    // Source: "let x = 1"
    //          ^^^
    //          keyword (0-3)
    const src = 'let x = 1';
    const captures = [mockCapture('keyword', 0, 3)];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('keyword'),
      source(0, 3),
      end(),
      source(3, 9), // remaining unhighlighted text
      lineEnd(),
    ]);
  });

  it('emits unhighlighted text before, between, and after captures', () => {
    // Source: "  let  x  "
    //            ^^^  ^
    //            kw   var
    const src = '  let  x  ';
    const captures = [
      mockCapture('keyword', 2, 5),
      mockCapture('variable', 7, 8),
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 2), // leading whitespace
      start('keyword'),
      source(2, 5),
      end(),
      source(5, 7), // gap between captures
      start('variable'),
      source(7, 8),
      end(),
      source(8, 10), // trailing whitespace
      lineEnd(),
    ]);
  });

  it('handles adjacent captures with no gap', () => {
    // Source: "$x:"
    const src = '$x:';
    const captures = [
      mockCapture('variable', 0, 2),
      mockCapture('punctuation.delimiter', 2, 3),
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('variable'),
      source(0, 2),
      end(),
      start('punctuation.delimiter'),
      source(2, 3),
      end(),
      lineEnd(),
    ]);
  });

  it('handles nested captures (child inside parent)', () => {
    // Source: "16px"
    //          ^^^^  number (0-4)
    //            ^^  type (2-4)
    const src = '16px';
    const captures = [mockCapture('number', 0, 4), mockCapture('type', 2, 4)];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('number'),
      source(0, 2), // "16"
      start('type'),
      source(2, 4), // "px"
      end(), // close type
      end(), // close number
      lineEnd(),
    ]);
  });

  it('handles a capture that covers the entire source', () => {
    const src = '/* a comment */';
    const captures = [mockCapture('comment', 0, 15)];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('comment'),
      source(0, 15),
      end(),
      lineEnd(),
    ]);
  });

  it('skips zero-length captures', () => {
    const src = 'hello world';
    const captures = [
      mockCapture('empty', 5, 5), // zero-length
      mockCapture('keyword', 5, 10),
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 5),
      start('keyword'),
      source(5, 10),
      end(),
      source(10, 11),
      lineEnd(),
    ]);
  });

  it('handles multiple sequential captures covering the entire source', () => {
    // Full coverage, no gaps: "let x=1"
    const src = 'let x=1';
    const captures = [
      mockCapture('keyword', 0, 3),
      mockCapture('variable', 3, 5),
      mockCapture('operator', 5, 6),
      mockCapture('number', 6, 7),
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('keyword'),
      source(0, 3),
      end(),
      start('variable'),
      source(3, 5),
      end(),
      start('operator'),
      source(5, 6),
      end(),
      start('number'),
      source(6, 7),
      end(),
      lineEnd(),
    ]);
  });
});

describe('generateEvents — multi-line', () => {
  it('splits a simple two-line source into two lines', () => {
    // Source: "a\nb" (3 chars)
    const src = 'a\nb';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 1), // "a"
      lineEnd(),
      lineStart(),
      source(2, 3), // "b"
      lineEnd(),
    ]);
  });

  it('handles trailing newline (empty last line)', () => {
    // Source: "x\n" (2 chars)
    const src = 'x\n';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 1), // "x"
      lineEnd(),
      lineStart(),
      // empty line
      lineEnd(),
    ]);
  });

  it('handles consecutive newlines (empty lines)', () => {
    // Source: "a\n\nb" (4 chars)
    const src = 'a\n\nb';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 1), // "a"
      lineEnd(),
      lineStart(),
      // empty line
      lineEnd(),
      lineStart(),
      source(3, 4), // "b"
      lineEnd(),
    ]);
  });

  it('handles source that is just a newline', () => {
    const src = '\n';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([lineStart(), lineEnd(), lineStart(), lineEnd()]);
  });

  it('closes and re-opens highlights across line breaks', () => {
    // Source: "/*a\nb*/" — a multi-line comment
    // Capture: comment spans entire source (0-7)
    const src = '/*a\nb*/';
    const captures = [mockCapture('comment', 0, 7)];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('comment'),
      source(0, 3), // "/*a"
      end(), // close comment for line break
      lineEnd(),
      lineStart(),
      start('comment'), // re-open comment on new line
      source(4, 7), // "b*/"
      end(),
      lineEnd(),
    ]);
  });

  it('closes and re-opens nested highlights across line breaks', () => {
    // Outer: function (0-10), Inner: string (4-9)
    // Source: "fn(\"ab\ncde\")"  — but simplified:
    // Source: "ab\ncd" with outer(0-5) and inner(1-4)
    const src = 'ab\ncd';
    const captures = [mockCapture('outer', 0, 5), mockCapture('inner', 1, 4)];
    const events = generateEvents(captures, src.length, src);

    // Line 1: "ab" — outer starts, then inner starts at offset 1
    // At newline (offset 2): close inner, close outer, line-end, line-start, reopen outer, reopen inner
    // Line 2: "cd" — inner ends at offset 4, outer ends at offset 5
    expect(events).toEqual([
      lineStart(),
      start('outer'),
      source(0, 1), // "a"
      start('inner'),
      source(1, 2), // "b"
      end(), // close inner for line break
      end(), // close outer for line break
      lineEnd(),
      lineStart(),
      start('outer'), // re-open outer
      start('inner'), // re-open inner
      source(3, 4), // "c"
      end(), // close inner (ends at 4)
      source(4, 5), // "d"
      end(), // close outer (ends at 5)
      lineEnd(),
    ]);
  });

  it('handles captures on separate lines with no overlap', () => {
    // Source: "$a: 1;\n$b: 2;"
    const src = '$a: 1;\n$b: 2;';
    const captures = [
      mockCapture('variable', 0, 2), // "$a"
      mockCapture('number', 4, 5), // "1"
      mockCapture('variable', 7, 9), // "$b"
      mockCapture('number', 11, 12), // "2"
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('variable'),
      source(0, 2), // "$a"
      end(),
      source(2, 4), // ": "
      start('number'),
      source(4, 5), // "1"
      end(),
      source(5, 6), // ";"
      lineEnd(),
      lineStart(),
      start('variable'),
      source(7, 9), // "$b"
      end(),
      source(9, 11), // ": "
      start('number'),
      source(11, 12), // "2"
      end(),
      source(12, 13), // ";"
      lineEnd(),
    ]);
  });

  it('handles three lines with captures', () => {
    // Source: "a\nb\nc"
    const src = 'a\nb\nc';
    const captures = [
      mockCapture('x', 0, 1), // "a"
      mockCapture('y', 2, 3), // "b"
      mockCapture('z', 4, 5), // "c"
    ];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('x'),
      source(0, 1),
      end(),
      lineEnd(),
      lineStart(),
      start('y'),
      source(2, 3),
      end(),
      lineEnd(),
      lineStart(),
      start('z'),
      source(4, 5),
      end(),
      lineEnd(),
    ]);
  });

  it('strips \\r before \\n in source text', () => {
    // "ab\r\ncd" — the \r should be excluded from source events
    const src = 'ab\r\ncd';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 2), // "ab" — no \r
      lineEnd(),
      lineStart(),
      source(4, 6), // "cd"
      lineEnd(),
    ]);
  });

  it('strips \\r before \\n inside a highlight span', () => {
    // "ab\r\ncd" with a highlight covering the full range
    const src = 'ab\r\ncd';
    const captures = [mockCapture('keyword', 0, 6)];
    const events = generateEvents(captures, src.length, src);

    expect(events).toEqual([
      lineStart(),
      start('keyword'),
      source(0, 2), // "ab" — no \r
      end(),
      lineEnd(),
      lineStart(),
      start('keyword'),
      source(4, 6), // "cd"
      end(),
      lineEnd(),
    ]);
  });

  it('handles multiple \\r\\n line endings', () => {
    const src = 'a\r\nb\r\nc';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 1), // "a"
      lineEnd(),
      lineStart(),
      source(3, 4), // "b"
      lineEnd(),
      lineStart(),
      source(6, 7), // "c"
      lineEnd(),
    ]);
  });

  it('handles lone \\r without \\n (not stripped)', () => {
    // A bare \r (no following \n) is not a Windows line ending — keep it
    const src = 'ab\rcd';
    const events = generateEvents([], src.length, src);

    // No newline, so single line with \r included in the text
    expect(events).toEqual([
      lineStart(),
      source(0, 5), // "ab\rcd" — all one line
      lineEnd(),
    ]);
  });

  it('handles \\r\\n at the start of source', () => {
    const src = '\r\nab';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      // empty first line — \r stripped, no source before \n
      lineEnd(),
      lineStart(),
      source(2, 4), // "ab"
      lineEnd(),
    ]);
  });

  it('handles \\r\\n at the end of source', () => {
    const src = 'ab\r\n';
    const events = generateEvents([], src.length, src);

    expect(events).toEqual([
      lineStart(),
      source(0, 2), // "ab"
      lineEnd(),
      lineStart(),
      lineEnd(),
    ]);
  });
});
