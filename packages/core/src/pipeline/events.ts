import type { QueryCapture } from 'web-tree-sitter';
import type { HighlightEvent } from '../types';

interface ActiveHighlight {
  captureName: string;
  endIndex: number;
}

/**
 * Convert deduplicated captures into a properly-nested, line-wrapped event stream.
 *
 * The event stream guarantees that:
 * 1. Highlight spans never cross — they are always properly nested
 * 2. Every line is wrapped in `line-start` / `line-end` events
 * 3. Highlights that span multiple lines are closed before `line-end` and
 *    re-opened after `line-start` on the next line
 * 4. Newline characters (`\n`) are NOT included in `source` events
 *
 * Internally this uses a two-phase approach:
 * - Phase 1: Generate flat events (capture-based, no line awareness)
 * - Phase 2: Walk flat events, split source at `\n`, manage highlight stack
 *   across line boundaries
 *
 * @param captures - Deduplicated, position-sorted captures
 * @param sourceLength - Total length of the source code in bytes
 * @param source - The original source code string (needed for newline detection)
 */
export function generateEvents(
  captures: QueryCapture[],
  sourceLength: number,
  source: string,
): HighlightEvent[] {
  const flat = generateFlatEvents(captures, sourceLength);
  return wrapWithLines(flat, source);
}

// ---------------------------------------------------------------------------
// Phase 1: Flat event generation (no line awareness)
// ---------------------------------------------------------------------------

/**
 * Generate a flat event stream from deduplicated captures.
 *
 * This is the original algorithm — it produces properly-nested highlight events
 * without any line awareness.
 */
function generateFlatEvents(
  captures: QueryCapture[],
  sourceLength: number,
): HighlightEvent[] {
  const events: HighlightEvent[] = [];
  const stack: ActiveHighlight[] = [];
  let cursor = 0;

  for (const capture of captures) {
    const start = capture.node.startIndex;
    const end = capture.node.endIndex;

    // Skip zero-length captures
    if (start >= end) continue;

    // Skip captures that start before the cursor (overlapping with a
    // previously emitted higher-priority capture at the same position)
    if (start < cursor) {
      // TODO: handle partial overlap for advanced injection scenarios
      continue;
    }

    // Close any active highlights that end at or before this capture's start
    while (stack.length > 0 && stack[stack.length - 1].endIndex <= start) {
      emitSourceUpTo(events, cursor, stack[stack.length - 1].endIndex);
      cursor = stack[stack.length - 1].endIndex;
      stack.pop();
      events.push({ type: 'end' });
    }

    // Emit any unhighlighted source text between the cursor and this capture
    emitSourceUpTo(events, cursor, start);
    cursor = start;

    // Open the new highlight (nesting inside any active parent)
    stack.push({ captureName: capture.name, endIndex: end });
    events.push({ type: 'start', captureName: capture.name });
  }

  // Close all remaining active highlights
  while (stack.length > 0) {
    emitSourceUpTo(events, cursor, stack[stack.length - 1].endIndex);
    cursor = stack[stack.length - 1].endIndex;
    stack.pop();
    events.push({ type: 'end' });
  }

  // Emit any trailing unhighlighted source text
  emitSourceUpTo(events, cursor, sourceLength);

  return events;
}

/**
 * Emit a Source event if there's any text between `from` and `to`.
 */
function emitSourceUpTo(
  events: HighlightEvent[],
  from: number,
  to: number,
): void {
  if (to > from) {
    events.push({ type: 'source', start: from, end: to });
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Line wrapping
// ---------------------------------------------------------------------------

/**
 * Transform a flat event stream into a line-wrapped event stream.
 *
 * Walks the flat events and:
 * 1. Opens the first line (`line-start`)
 * 2. For each `source` event, scans the text for `\n` characters. At each
 *    newline: emits source up to `\n`, closes all active highlights, emits
 *    `line-end`, emits `line-start`, re-opens all highlights, then continues
 *    with text after `\n`.
 * 3. Closes the last line (`line-end`)
 */
function wrapWithLines(
  flatEvents: HighlightEvent[],
  source: string,
): HighlightEvent[] {
  const events: HighlightEvent[] = [];

  // Track active highlight spans so we can close/reopen across line breaks
  const highlightStack: string[] = [];

  // Open the first line
  events.push({ type: 'line-start' });

  for (const event of flatEvents) {
    switch (event.type) {
      case 'start':
        highlightStack.push(event.captureName);
        events.push(event);
        break;

      case 'end':
        highlightStack.pop();
        events.push(event);
        break;

      case 'source': {
        // Scan the source text for newline characters
        const text = source.slice(event.start, event.end);
        let offset = 0;

        for (let i = 0; i < text.length; i++) {
          if (text[i] === '\n') {
            // Emit any source text before this newline
            if (i > offset) {
              events.push({
                type: 'source',
                start: event.start + offset,
                end: event.start + i,
              });
            }

            // Close all active highlights (innermost first)
            for (let h = highlightStack.length - 1; h >= 0; h--) {
              events.push({ type: 'end' });
            }

            // End current line, start new line
            events.push({ type: 'line-end' });
            events.push({ type: 'line-start' });

            // Re-open all highlights (outermost first)
            for (let h = 0; h < highlightStack.length; h++) {
              events.push({ type: 'start', captureName: highlightStack[h] });
            }

            offset = i + 1; // skip past the \n
          }
        }

        // Emit any remaining source text after the last newline
        if (offset < text.length) {
          events.push({
            type: 'source',
            start: event.start + offset,
            end: event.end,
          });
        }
        break;
      }
    }
  }

  // Close the last line
  events.push({ type: 'line-end' });

  return events;
}
