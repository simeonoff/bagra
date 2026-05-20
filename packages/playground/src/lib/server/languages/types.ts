import type { LanguageDefinition } from '@bagrajs/web';

export interface LanguageSample {
  /** Unique identifier for this sample within the language. */
  id: string;
  /** Human-readable label shown in the sample selector. */
  label: string;
  /** The raw source code for this sample. */
  code: string;
}

export interface LanguageEntry {
  /** Unique identifier matching the tree-sitter grammar name (e.g. `"scss"`). */
  id: string;
  /** Human-readable name shown in the language selector. */
  displayName: string;
  /** File extension associated with this language (e.g. `"scss"`). */
  extension: string;
  /**
   * Tree-sitter language definition forwarded to `highlighter.loadLanguage()`.
   *
   * - `grammar` should be imported with `?url` so Vite resolves the correct
   *   path without eagerly loading the WASM binary.
   * - Queries should be imported with `?raw` so they are inlined as strings
   *   and wrapped in `{ content }` objects.
   */
  definition: LanguageDefinition;
  /** One or more code samples to display in the playground. */
  samples: LanguageSample[];
  /**
   * When `true`, this language is an injection / supporting language only
   * and will not appear in the UI language selector.
   */
  hidden?: boolean;
}

/** Lightweight metadata exposed to the UI — no code blobs, no wasm paths. */
export interface LanguageMeta {
  id: string;
  displayName: string;
  samples: Pick<LanguageSample, 'id' | 'label'>[];
}
