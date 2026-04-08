<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value: string;
    onchange: (value: string) => void;
    minWidth?: string;
    visible?: boolean;
    children?: Snippet;
    options?: { value: string; label: string }[];
  }

  let {
    label,
    value,
    onchange,
    minWidth = '10rem',
    visible = true,
    children,
    options = [],
  }: Props = $props();
</script>

{#if visible}
  <label style:--min-w={minWidth}>
    <span>{label}</span>

    <select
      {value}
      onchange={(e) => onchange((e.currentTarget as HTMLSelectElement).value)}>
      {#if children}
        {@render children()}
      {:else}
        {#each options as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      {/if}
    </select>
  </label>
{/if}

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    span {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }

    select {
      padding: 0.375rem 0.625rem;
      border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 0.375rem;
      background: transparent;
      color: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      min-width: var(--min-w);

      &:focus {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
    }
  }
</style>
