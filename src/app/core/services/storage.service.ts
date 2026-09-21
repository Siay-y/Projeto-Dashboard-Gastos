import { Injectable } from '@angular/core';
import { StorageKey } from '../constants/storage-keys';

/**
 * Abstração tipada sobre o LocalStorage.
 *
 * Único ponto do sistema que fala diretamente com `localStorage`. Os demais
 * serviços dependem desta classe, o que permite trocar o mecanismo de
 * persistência (IndexedDB, cookies, API…) sem tocar nas regras de negócio.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage: Storage | null = this.resolveStorage();

  /** Lê e desserializa um valor. Retorna `null` se ausente ou corrompido. */
  get<T>(key: StorageKey): T | null {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      // JSON inválido — trata como ausente e limpa para não repetir o erro.
      this.remove(key);
      return null;
    }
  }

  /** Serializa e persiste um valor. */
  set<T>(key: StorageKey, value: T): void {
    if (!this.storage) return;

    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Quota excedida ou modo privado restritivo — não deve derrubar o app.
      console.warn(`[StorageService] Falha ao salvar "${key}"`, error);
    }
  }

  remove(key: StorageKey): void {
    this.storage?.removeItem(key);
  }

  clear(): void {
    this.storage?.clear();
  }

  /**
   * Garante que o storage está acessível. Alguns navegadores lançam exceção
   * apenas ao tocar em `localStorage` (ex.: cookies bloqueados).
   */
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
