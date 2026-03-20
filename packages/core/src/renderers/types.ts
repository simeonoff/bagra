export type { Element, Root, RootContent, Text } from 'hast';

export interface Token {
  /** The text content of this token. */
  text: string;

  /**
   * The capture names that apply to this token, from outermost to innermost.
   *
   * For example, `['function', 'function.call']` means this token is inside
   * a `@function` capture and directly matched by `@function.call`.
   *
   * An empty array means the token is plain, unhighlighted source text.
   */
  captures: string[];

  /** The start byte offset in the source code. */
  start: number;

  /** The end byte offset in the source code. */
  end: number;
}
