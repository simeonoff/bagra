import type { Base16Scheme } from '@/theme/scheme';

export interface BagraTheme {
  name: string;
  displayName?: string;
  variant?: 'light' | 'dark' | string;
  author?: string;
  colors: Base16Scheme;
}
