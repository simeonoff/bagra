import { describe, expect, it } from 'vitest';
import { resolveTheme } from '@/theme/resolve';

describe('resolveTheme', () => {
  it('returns undefined when no options provided', () => {
    expect(resolveTheme()).toBeUndefined();
    expect(resolveTheme(undefined)).toBeUndefined();
  });

  it('returns undefined when options is empty', () => {
    expect(resolveTheme({})).toBeUndefined();
  });

  it('returns theme name from the theme option', () => {
    expect(resolveTheme({ theme: 'nord' })).toBe('nord');
  });

  it('theme takes priority over themes', () => {
    expect(
      resolveTheme({
        theme: 'nord',
        themes: { light: 'ayu-light', dark: 'dracula' },
      }),
    ).toBe('nord');
  });

  it('returns the theme for the specified defaultColor key', () => {
    expect(
      resolveTheme({
        themes: { light: 'ayu-light', dark: 'nord' },
        defaultColor: 'dark',
      }),
    ).toBe('nord');
  });

  it('returns the theme for a custom defaultColor key', () => {
    expect(
      resolveTheme({
        themes: { light: 'ayu-light', dark: 'nord', dim: 'github-dimmed' },
        defaultColor: 'dim',
      }),
    ).toBe('github-dimmed');
  });

  it('returns undefined when defaultColor key does not exist in themes', () => {
    expect(
      resolveTheme({
        themes: { light: 'ayu-light', dark: 'nord' },
        defaultColor: 'missing',
      }),
    ).toBeUndefined();
  });

  it('falls back to first theme key when no defaultColor', () => {
    expect(
      resolveTheme({
        themes: { light: 'ayu-light', dark: 'nord' },
      }),
    ).toBe('ayu-light');
  });

  it('returns undefined for empty themes object', () => {
    expect(resolveTheme({ themes: {} })).toBeUndefined();
  });

  it('returns undefined when defaultColor is false', () => {
    expect(
      resolveTheme({
        themes: { light: 'ayu-light', dark: 'nord' },
        defaultColor: false,
      }),
    ).toBeUndefined();
  });
});
