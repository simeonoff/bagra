import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import rehypeBagra from '../src/index';
import { createMockHighlighter } from './fixtures';

const mockHighlighter = createMockHighlighter();

describe('rehypeBagra (integration)', () => {
  it('highlights a fenced code block through the full unified pipeline', async () => {
    const markdown = '```scss\n$color: red;\n```';

    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeBagra, { highlighter: mockHighlighter })
      .use(rehypeStringify)
      .process(markdown);

    const html = String(file);

    expect(html).toContain('class="bagra"');
    expect(html).toContain('class="line"');
    expect(html).toContain('$color: red;');
  });

  it('leaves unknown language blocks as-is through the pipeline', async () => {
    const markdown = '```python\nprint("hello")\n```';

    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeBagra, { highlighter: mockHighlighter })
      .use(rehypeStringify)
      .process(markdown);

    const html = String(file);

    expect(html).not.toContain('class="bagra"');
    expect(html).toContain('language-python');
    expect(html).toContain('print("hello")');
  });
});
