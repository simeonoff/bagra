import { goto, replaceState } from '$app/navigation';
import { navigating } from '$app/state';
import type { LanguageMeta } from '$lib/server/languages/types';
import type { ThemeMeta } from '$lib/server/themes';

interface PageData {
  lang: string;
  sample: string;
  theme: string;
  html: string;
  stats: { loadMs: number; renderMs: number; totalMs: number };
}

interface LayoutData {
  languages: LanguageMeta[];
  themes: ThemeMeta[];
}

type Data = PageData & LayoutData;

interface SelectOption {
  value: string;
  label: string;
}

export interface ThemeGroup {
  label: string;
  themes: ThemeMeta[];
}

export class PlaygroundState {
  #data!: () => Data;
  #themeOverride = $state<string | null>(null);

  constructor(getData: () => Data) {
    this.#data = getData;
  }

  get language(): string {
    return this.#data().lang;
  }

  get sample(): string {
    return this.#data().sample;
  }

  theme = $derived.by(() => this.#themeOverride ?? this.#data().theme);

  get html(): string {
    return this.#data().html;
  }

  get stats() {
    return this.#data().stats;
  }

  loading = $derived(!!navigating.to);

  languageOptions: SelectOption[] = $derived(
    this.#data().languages.map((l) => ({ value: l.id, label: l.displayName })),
  );

  sampleOptions: SelectOption[] = $derived(
    (
      this.#data().languages.find((l) => l.id === this.language)?.samples ?? []
    ).map((s) => ({ value: s.id, label: s.label })),
  );

  themeGroups: ThemeGroup[] = $derived(
    (['dark', 'light'] as const).flatMap((variant) => {
      const themes = this.#data().themes.filter((t) => t.variant === variant);
      return themes.length
        ? [{ label: variant === 'dark' ? 'Dark' : 'Light', themes }]
        : [];
    }),
  );

  setLanguage(id: string) {
    const first =
      this.#data()
        .languages.find((l) => l.id === id)
        ?.samples.at(0)?.id ?? '';
    this.#navigate({ lang: id, sample: first });
  }

  setSample(id: string) {
    this.#navigate({ sample: id });
  }

  setTheme(name: string) {
    this.#themeOverride = name;
    const params = new URLSearchParams({
      lang: this.language,
      sample: this.sample,
      theme: name,
    });
    replaceState(`?${params}`, {});
  }

  #navigate(overrides: { lang?: string; sample?: string; theme?: string }) {
    const params = new URLSearchParams({
      lang: overrides.lang ?? this.language,
      sample: overrides.sample ?? this.sample,
      theme: overrides.theme ?? this.theme,
    });
    goto(`?${params}`, { keepFocus: true, noScroll: true });
  }
}
