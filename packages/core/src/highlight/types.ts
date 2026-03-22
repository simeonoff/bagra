import type { QueryCapture } from 'web-tree-sitter';

/**
 * A capture tagged with its injection depth.
 *
 * Depth 0 is the host layer. Each level of injection increments depth.
 * At the same byte range, deeper layers take priority.
 */
export interface LayeredCapture {
  capture: QueryCapture;
  depth: number;
}

/**
 * Event types in the highlight event stream.
 *
 * The event stream is an intermediate representation between raw query captures
 * and rendered output. It guarantees proper nesting (no crossing spans) and
 * is consumed by renderers to produce HTML, HAST, or tokens.
 *
 * The stream is organized into lines:
 * - Every line starts with `line-start` and ends with `line-end`
 * - Highlight spans (`start`/`end`) and source text (`source`) appear within lines
 * - If a highlight span crosses a newline, it is closed before `line-end` and
 *   re-opened after `line-start` on the next line
 * - Newline characters (`\n`) are NOT included in `source` events — they are
 *   implicit between `line-end` and the next `line-start`
 */
export type HighlightEvent =
  | { type: 'line-start' }
  | { type: 'line-end' }
  | { type: 'start'; captureName: string }
  | { type: 'end' }
  | { type: 'source'; start: number; end: number };
