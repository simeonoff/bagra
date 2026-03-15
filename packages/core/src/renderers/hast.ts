import type { HastElement, HastNode, HastRoot, HighlightEvent } from '../types';
import { captureNameToClass } from '../utils';

/**
 * Render a highlight event stream into a HAST (Hypertext Abstract Syntax Tree).
 *
 * The output is a `root` node containing a `<pre class="bagra">` element with
 * a `<code>` element inside. Each line is a `<span class="line">` element,
 * and each highlighted region is a `<span>` element with the appropriate
 * CSS class.
 *
 * Lines are separated by `\n` text nodes between line spans in the `<code>`
 * element, matching the HTML renderer's behavior.
 *
 * This output can be used directly in unified/rehype pipelines.
 *
 * @param events - The line-wrapped event stream from `generateEvents()`
 * @param source - The original source code string
 * @param theme - Optional theme name, sets `data-theme` attribute on the `<pre>` element
 * @returns A {@link HastRoot} node representing the highlighted code block.
 */
export function renderHast(
  events: HighlightEvent[],
  source: string,
  theme?: string,
): HastRoot {
  const codeChildren: HastNode[] = [];

  // The current line span element (set on line-start, pushed to codeChildren on line-end)
  let currentLine: HastElement | null = null;

  // Stack of parent element child arrays. The top is the current container
  // for new children (either the line span's children or a nested span's children).
  let stack: HastNode[][] = [];

  let isFirstLine = true;

  for (const event of events) {
    switch (event.type) {
      case 'line-start': {
        // Emit \n text node between lines (not before the first)
        if (!isFirstLine) {
          codeChildren.push({ type: 'text', value: '\n' });
        }
        isFirstLine = false;

        currentLine = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['line'] },
          children: [],
        };
        stack = [currentLine.children];
        break;
      }

      case 'line-end': {
        if (currentLine) {
          codeChildren.push(currentLine);
          currentLine = null;
        }
        stack = [];
        break;
      }

      case 'start': {
        const current = stack[stack.length - 1];
        const span: HastElement = {
          type: 'element',
          tagName: 'span',
          properties: { className: [captureNameToClass(event.captureName)] },
          children: [],
        };
        current.push(span);
        stack.push(span.children);
        break;
      }

      case 'end':
        stack.pop();
        break;

      case 'source': {
        const current = stack[stack.length - 1];
        current.push({
          type: 'text',
          value: source.slice(event.start, event.end),
        });
        break;
      }
    }
  }

  const code: HastElement = {
    type: 'element',
    tagName: 'code',
    properties: {},
    children: codeChildren,
  };

  const preProperties: Record<string, string | number | boolean | string[]> = {
    className: ['bagra'],
  };

  if (theme) {
    preProperties.dataTheme = theme;
  }

  const pre: HastElement = {
    type: 'element',
    tagName: 'pre',
    properties: preProperties,
    children: [code],
  };

  return {
    type: 'root',
    children: [pre],
  };
}
