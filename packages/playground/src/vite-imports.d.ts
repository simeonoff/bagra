// Vite import types for non-standard file extensions.
// This file must be a script (no import/export) for ambient
// wildcard module declarations to work with relative imports.

// wasmInlinePlugin transforms .wasm imports into inlined Uint8Array exports
declare module '*.wasm' {
  const binary: Uint8Array;
  export default binary;
}

declare module '*.scm?raw' {
  const content: string;
  export default content;
}

declare module '*.scss?raw' {
  const content: string;
  export default content;
}

declare module '*.ts?raw' {
  const content: string;
  export default content;
}

declare module '*.rs?raw' {
  const content: string;
  export default content;
}

declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module '*.js?raw' {
  const content: string;
  export default content;
}
