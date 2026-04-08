<script lang="ts">
  interface Props {
    /** Raw HTML string produced by `hl.codeToHtml()`. */
    html: string;
    /** The active theme name — maps to `data-theme` on the `.bagra` pre element. */
    theme: string;
    /** Show a loading overlay while a language is being fetched. */
    loading?: boolean;
  }

  let { html, theme, loading = false }: Props = $props();

  /**
   * Svelte action: once the wrapper `<div>` is in the DOM, find the inner
   * `.bagra` `<pre>` element and keep its `data-theme` attribute in sync
   * with the `theme` prop.  Theme changes are instant — no server call.
   */
  function applyTheme(node: HTMLElement, themeName: string) {
    const pre = node.querySelector<HTMLElement>('.bagra');
    if (pre) pre.dataset.theme = themeName;

    return {
      update(next: string) {
        const p = node.querySelector<HTMLElement>('.bagra');
        if (p) p.dataset.theme = next;
      },
    };
  }
</script>

<div class="preview-wrapper" class:loading>
  {#if loading}
    <div
      class="loading-overlay"
      aria-busy="true"
      aria-label="Loading language…">
      <span class="spinner"></span>
      <span>Loading…</span>
    </div>
  {/if}

  <!-- use:applyTheme syncs data-theme without re-rendering -->
  <div class="preview-html" use:applyTheme={theme}>
    {@html html}
  </div>
</div>

<style>
  .preview-wrapper {
    position: relative;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: opacity 150ms ease;

    &.loading {
      opacity: 0.4;
      pointer-events: none;
    }
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    z-index: 10;
    background: rgb(0 0 0 / 30%);
    color: white;
  }

  .spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .preview-html :global(.bagra) {
    margin: 0;
    padding: 1.25rem 1.5rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.6;
  }
</style>
