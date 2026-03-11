import type { Node, Query, QueryCapture } from 'web-tree-sitter';

/**
 * Run the highlights query against the root node and return all captures
 * sorted by their position in the source code.
 *
 * The captures are returned in the order produced by `query.captures()`,
 * which is sorted by start position (byte offset), then by pattern index
 * for captures at the same position.
 */
export function captureNodes(query: Query, rootNode: Node): QueryCapture[] {
  return query.captures(rootNode);
}
