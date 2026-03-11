import { describe, expect, it } from 'vitest';
import { renderTokens } from '../../src/renderers/tokens';
import type { HighlightEvent } from '../../src/types';

describe('renderTokens', () => {
  it('returns a single empty line for empty events with just line markers', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, '');
    expect(lines).toEqual([[]]);
  });

  it('returns a single plain token in a single line', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, 'hello');

    expect(lines).toEqual([
      [{ text: 'hello', captures: [], start: 0, end: 5 }],
    ]);
  });

  it('returns a token with captures for highlighted text', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, 'let');

    expect(lines).toEqual([
      [{ text: 'let', captures: ['keyword'], start: 0, end: 3 }],
    ]);
  });

  it('tracks nested captures in order from outermost to innermost', () => {
    // "16px": number wraps all, type wraps "px" inside
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'number' },
      { type: 'source', start: 0, end: 2 }, // "16"
      { type: 'start', captureName: 'type' },
      { type: 'source', start: 2, end: 4 }, // "px"
      { type: 'end' },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, '16px');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(2);
    expect(lines[0][0]).toEqual({
      text: '16',
      captures: ['number'],
      start: 0,
      end: 2,
    });
    expect(lines[0][1]).toEqual({
      text: 'px',
      captures: ['number', 'type'],
      start: 2,
      end: 4,
    });
  });

  it('produces tokens for mixed highlighted and plain text', () => {
    // "$x: 1"
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'variable' },
      { type: 'source', start: 0, end: 2 },
      { type: 'end' },
      { type: 'source', start: 2, end: 4 }, // ": "
      { type: 'start', captureName: 'number' },
      { type: 'source', start: 4, end: 5 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, '$x: 1');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(3);
    expect(lines[0][0].captures).toEqual(['variable']);
    expect(lines[0][1].captures).toEqual([]); // plain ": "
    expect(lines[0][2].captures).toEqual(['number']);
  });

  it('does not share capture arrays between tokens', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'start', captureName: 'variable' },
      { type: 'source', start: 4, end: 5 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, 'let x');

    // Mutating one token's captures shouldn't affect the other
    lines[0][0].captures.push('modified');
    expect(lines[0][1].captures).toEqual(['variable']);
  });

  it('returns multiple lines for multi-line input', () => {
    // Two lines: "ab" and "cd" with highlights closing/reopening across lines
    const source = 'ab\ncd';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 2 },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'source', start: 3, end: 5 },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, source);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual([{ text: 'ab', captures: [], start: 0, end: 2 }]);
    expect(lines[1]).toEqual([{ text: 'cd', captures: [], start: 3, end: 5 }]);
  });

  it('returns empty arrays for empty lines', () => {
    // Source: "a\n\nb"
    const source = 'a\n\nb';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 1 },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'source', start: 3, end: 4 },
      { type: 'line-end' },
    ];
    const lines = renderTokens(events, source);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveLength(1);
    expect(lines[1]).toEqual([]); // empty line
    expect(lines[2]).toHaveLength(1);
  });
});
