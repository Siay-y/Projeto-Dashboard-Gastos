import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

interface UiPreferences {
  /** Seções recolhíveis: id → aberta? */
  expanded: Record<string, boolean>;
}

/**
 * Preferências de interface que valem a pena lembrar entre visitas
 * (ex.: quais seções o usuário deixou abertas).
 */
@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly storage = inject(StorageService);

  private readonly _prefs = signal<UiPreferences>({
    expanded: {},
    ...this.storage.get<Partial<UiPreferences>>(STORAGE_KEYS.UI_PREFERENCES),
  });

  private readonly expandedMap = computed(() => this._prefs().expanded);

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
}
