; Base: paint entire document as doc comment so /// markers and all
; uncaptured regions get a consistent doc comment color.
; More specific patterns below will override for semantic elements.
(document) @comment.documentation @spell

; Tag keywords
[
  "@param"
  "@parameter"
  "@arg"
  "@argument"
  "@return"
  "@returns"
  "@access"
  "@alias"
  "@author"
  "@content"
  "@deprecated"
  "@group"
  "@ignore"
  "@link"
  "@source"
  "@name"
  "@output"
  "@outputs"
  "@package"
  "@property"
  "@prop"
  "@since"
  "@throw"
  "@throws"
  "@exception"
  "@todo"
  "@type"
  "@see"
  "@example"
  "@require"
  "@requires"
] @keyword @nospell

; Access modifiers
(tag_access
  ["public" "private"] @keyword.modifier @nospell)

; Reference types
(reference) @type @nospell

; Type names
(type_name) @type @nospell

; Variable names
(variable_name) @variable @nospell

; Version numbers
(version) @number @nospell

; Description text
(description) @comment.documentation
(line_description) @comment.documentation

; Example language identifier
(example_language) @label @nospell

; Code blocks and lines - use @comment.documentation as fallback,
; injection will override with language-specific highlights
(code_block) @comment.documentation @nospell
(code_line) @comment.documentation @nospell

; See references
(see_reference) @function @nospell

; Group names
(group_name) @module @nospell

; Alias names
(alias_name) @function @nospell

; Package names
(package_name) @module @nospell

; Property names
(property_name) @property @nospell

; URLs
(url) @string.special.url @nospell

; Link captions
(link_caption) @comment.documentation

; Custom names
(custom_name) @string @nospell

; Default values
(default_value) @string.special @nospell

; Punctuation
[
  "{"
  "}"
] @punctuation.bracket @nospell

"|" @punctuation.delimiter @nospell

(tag_description
  "-" @punctuation.delimiter @nospell)

; Paints ERROR nodes and all their named children uniformly as
; doc comment text, preventing fragmented coloring from misrecovered
; nodes (e.g. example_language, inner ERROR) inside parse errors
(ERROR) @comment.documentation @nospell
(ERROR
  (example_language) @comment.documentation @nospell)
(ERROR
  (ERROR) @comment.documentation @nospell)
(ERROR
  "{" @comment.documentation @nospell)
(ERROR
  "}" @comment.documentation @nospell)
