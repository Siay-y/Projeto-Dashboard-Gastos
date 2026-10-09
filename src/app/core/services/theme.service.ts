import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_OPTIONS: readonly { id: ThemeChoice; label: string; icon: string }[] = [
  { id: 'light', label: 'Claro', icon: 'light_mode' },
  { id: 'dark', label: 'Escuro', icon: 'dark_mode' },
  { id: 'system', label: 'Sistema', icon: 'contrast' },
];

const DARK_QUERY = '(prefers-color-scheme: dark)';
const BACKGROUND: Record<Theme, string> = { light: '#f5f4f0', dark: '#131311' };

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);

  private readonly query = typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null;
  private readonly systemDark = signal(this.query?.matches ?? false);

  private readonly _choice = signal<ThemeChoice>(
    normalize(this.storage.get<string>(STORAGE_KEYS.THEME)),
  );

  readonly choice = this._choice.asReadonly();

  readonly theme = computed<Theme>(() => {
    const choice = this._choice();
    if (choice !== 'system') return choice;
    return this.systemDark() ? 'dark' : 'light';
  });

  constructor() {
    this.query?.addEventListener('change', (event) => this.systemDark.set(event.matches));

    effect(() => {
      apply(this.theme());
      this.storage.set(STORAGE_KEYS.THEME, this._choice());
    });
  }

  set(choice: ThemeChoice): void {
    this._choice.set(choice);
  }
}

function normalize(value: string | null): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BACKGROUND[theme]);
}
