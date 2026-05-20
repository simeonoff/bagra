<script lang="ts">
  import Select from '$lib/components/Select.svelte';
  import CodePreview from '$lib/components/CodePreview.svelte';
  import { PlaygroundState } from '$lib/state/playground.svelte';

  let { data } = $props();
  const pg = new PlaygroundState(() => data);
</script>

<div class="playground">
  <header class="toolbar">
    <h1 class="wordmark">bagra <span>playground</span></h1>

    <div class="selectors">
      <Select
        label="Language"
        value={pg.language}
        onchange={(v) => pg.setLanguage(v)}
        options={pg.languageOptions} />

      <Select
        label="Sample"
        value={pg.sample}
        onchange={(v) => pg.setSample(v)}
        options={pg.sampleOptions}
        visible={pg.sampleOptions.length > 1}
        minWidth="8rem" />

      <Select
        label="Theme"
        value={pg.theme}
        onchange={(v) => pg.setTheme(v)}
        minWidth="12rem">
        {#each pg.themeGroups as group (group.label)}
          <optgroup label={group.label}>
            {#each group.themes as theme (theme.name)}
              <option value={theme.name}>{theme.displayName}</option>
            {/each}
          </optgroup>
        {/each}
      </Select>
    </div>
  </header>

  <main class="preview">
    <CodePreview html={pg.html} theme={pg.theme} loading={pg.loading} />
  </main>

  <footer class="stats">
    {#if pg.stats.loadMs > 0.1}
      <span
        class="stat"
        title="Time to load the WASM grammar (first request only)">
        ⏱ Load: {pg.stats.loadMs}ms
      </span>
    {/if}

    <span class="stat" title="Time to parse and render to HTML">
      ⚡ Render: {pg.stats.renderMs}ms
    </span>

    <span class="stat" title="Total server-side time">
      Σ Total: {pg.stats.totalMs}ms
    </span>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100dvh;
  }

  .playground {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  .toolbar {
    --background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    border-block-end: 1px solid oklch(from var(--background) .8 c h / 8%);
    background: oklch(from var(--background) l c h / 48%);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .wordmark {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.02em;

    span {
      opacity: 0.45;
      font-weight: 400;
    }
  }

  .selectors {
    display: flex;
    align-items: flex-end;
    gap: 0.875rem;
    flex-wrap: wrap;
  }

  .preview {
    flex: 1;
    padding: 1.5rem;
    overflow: auto;
  }

  .stats {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1.25rem;
    border-top: 1px solid rgb(255 255 255 / 8%);
    font-size: 0.75rem;
    font-family: ui-monospace, 'Menlo', monospace;
    color: rgb(255 255 255 / 40%);
  }

  .stat {
    cursor: default;
  }
</style>
