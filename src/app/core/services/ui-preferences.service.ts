import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

interface UiPreferences {
  expanded: Record<string, boolean>;
  /** Só vale no desktop: abaixo de 1024px a barra lateral nem é desenhada. */
  sidebarCollapsed: boolean;
}

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly storage = inject(StorageService);

  private readonly _prefs = signal<UiPreferences>(
    migrate(this.storage.get<Partial<UiPreferences>>(STORAGE_KEYS.UI_PREFERENCES)),
  );

  private readonly expandedMap = computed(() => this._prefs().expanded);

  readonly sidebarCollapsed = computed(() => this._prefs().sidebarCollapsed);

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEYS.UI_PREFERENCES, this._prefs());
    });
  }

  isExpanded(id: string, fallback: boolean): boolean {
    return this.expandedMap()[id] ?? fallback;
  }

  setExpanded(id: string, expanded: boolean): void {
    this._prefs.update((p) => ({ ...p, expanded: { ...p.expanded, [id]: expanded } }));
  }

  toggleSidebar(): void {
    this._prefs.update((p) => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }));
  }
}

function migrate(raw: Partial<UiPreferences> | null): UiPreferences {
  return {
    expanded: raw?.expanded ?? {},
    sidebarCollapsed: raw?.sidebarCollapsed === true,
  };
}
