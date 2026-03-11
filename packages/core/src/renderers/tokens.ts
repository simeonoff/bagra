import type { HighlightEvent, Token } from '../types';

/**
 * Render a highlight event stream into an array of lines, each containing
 * an array of tokens.
 *
 * Each token contains the text, its byte range, and the list of capture names
 * that apply to it (from outermost to innermost).
 *
 * Newline characters are NOT included in tokens — they are line separators.
 *
 * Useful for custom renderers (React components, terminal output, Canvas, etc.).
 *
 * @param events - The line-wrapped event stream from `generateEvents()`
 * @param source - The original source code string
 */
export function renderTokens(
  events: HighlightEvent[],
  source: string,
): Token[][] {
  const lines: Token[][] = [];
  let currentLine: Token[] = [];
  const captureStack: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'line-start':
        currentLine = [];
        break;
      case 'line-end':
        lines.push(currentLine);
        break;
      case 'start':
        captureStack.push(event.captureName);
        break;
      case 'end':
        captureStack.pop();
        break;
      case 'source':
        currentLine.push({
          text: source.slice(event.start, event.end),
          captures: [...captureStack],
          start: event.start,
          end: event.end,
        });
        break;
    }
  }

  return lines;
}
