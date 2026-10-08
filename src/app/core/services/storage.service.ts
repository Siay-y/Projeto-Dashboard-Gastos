import { Injectable } from '@angular/core';
import { StorageKey } from '../constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage: Storage | null = this.resolveStorage();

  get<T>(key: StorageKey): T | null {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      // JSON inválido: descarta em vez de derrubar o app.
      this.remove(key);
      return null;
    }
  }

  set<T>(key: StorageKey, value: T): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[StorageService] Falha ao salvar "${key}"`, error);
    }
  }

  remove(key: StorageKey): void {
    this.storage?.removeItem(key);
  }

  clear(): void {
    this.storage?.clear();
  }

  private resolveStorage(): Storage | null {
    try {
      const probe = '__storage_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      console.warn('[StorageService] LocalStorage indisponível; dados não serão persistidos.');
      return null;
    }
  }
}
