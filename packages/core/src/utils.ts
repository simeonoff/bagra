/**
 * Convert a capture name to a CSS class name.
 *
 * The convention follows the `bagra-` prefix with dots replaced by dashes:
 * - `keyword` -> `bagra-keyword`
 * - `keyword.function` -> `bagra-keyword-function`
 * - `variable.builtin` -> `bagra-variable-builtin`
 */
export function captureNameToClass(captureName: string): string {
  return `bagra-${captureName.replace(/\./g, '-')}`;
}
