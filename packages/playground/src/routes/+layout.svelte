<script lang="ts">
  import '@bagrajs/web/styles.css';
  import favicon from '$lib/assets/favicon.svg';

  let { data, children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!--
    Inject CSS for all 300+ themes once. Each block is scoped to
    `.bagra[data-theme="<name>"]` so switching is a zero-cost attribute swap.
  -->
  <svelte:element this={'style'}>
    {data.themeCSS}
  </svelte:element>
</svelte:head>

{@render children()}
