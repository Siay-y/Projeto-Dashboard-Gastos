import { Injectable, signal } from '@angular/core';
import { ENCRYPTED_KEYS, StorageKey } from '../constants/storage-keys';
import { Envelope, isEnvelope, seal } from '../security/crypto';

export type StorageFailureReason = 'quota' | 'unavailable' | 'unknown';

export interface StorageFailure {
  reason: StorageFailureReason;
  /** Sobe a cada falha nova: é o que distingue uma falha de outra já dispensada. */
  seq: number;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  readonly failure = signal<StorageFailure | null>(null);

  // Declarado antes de `storage`: `resolveStorage` já reporta falha.
  private readonly storage: Storage | null = this.resolveStorage();

  // Com PIN ativo é a única forma de ler: o disco guarda apenas envelopes.
  private readonly cache = new Map<StorageKey, unknown>();
  private readonly writes = new Map<StorageKey, Promise<void>>();

  private readonly failed = new Map<StorageKey, unknown>();

  private cryptoKey: CryptoKey | null = null;

  get<T>(key: StorageKey): T | null {
    if (this.cache.has(key)) return this.cache.get(key) as T;

    const value = this.readRaw(key);
    if (value === null || isEnvelope(value)) return null;

    this.cache.set(key, value);
    return value as T;
  }

  set<T>(key: StorageKey, value: T): void {
    this.cache.set(key, value);
    this.write(key, value);
  }

  remove(key: StorageKey): void {
    this.cache.delete(key);
    this.storage?.removeItem(key);
  }

  clear(): void {
    this.cache.clear();
    this.storage?.clear();
  }

  snapshot(key: StorageKey): unknown {
    if (this.cache.has(key)) return this.cache.get(key);
    const value = this.readRaw(key);
    return value === null || isEnvelope(value) ? null : value;
  }

  envelope(key: StorageKey): Envelope | null {
    const value = this.readRaw(key);
    return isEnvelope(value) ? value : null;
  }

  hydrate(key: StorageKey, value: unknown): void {
    this.cache.set(key, value);
  }

  /** Cifra só as próximas escritas, sem reescrever o disco. */
  useEncryption(cryptoKey: CryptoKey): void {
    this.cryptoKey = cryptoKey;
  }

  async enableEncryption(cryptoKey: CryptoKey): Promise<void> {
    this.cryptoKey = cryptoKey;

    for (const key of ENCRYPTED_KEYS) {
      const value = this.snapshot(key);
      if (value === null) continue;

      // Cacheia antes de cifrar: é o que permite voltar a texto claro depois.
      this.cache.set(key, value);
      this.write(key, value);
    }
    await this.flush();
  }

  async disableEncryption(): Promise<void> {
    this.cryptoKey = null;
    await this.flush();

    for (const key of ENCRYPTED_KEYS) {
      // Sem valor em memória o envelope fica como está: apagá-lo perderia os dados.
      if (this.cache.has(key)) this.write(key, this.cache.get(key));
    }
  }

  async flush(): Promise<void> {
    await Promise.all([...this.writes.values()]);
  }

  retry(): void {
    if (!this.storage) return;

    const pending = [...this.failed];
    this.failed.clear();
    this.failure.set(null);

    for (const [key, value] of pending) this.write(key, value);
  }

  private write(key: StorageKey, value: unknown): void {
    if (!this.storage) return;

    if (!this.cryptoKey || !ENCRYPTED_KEYS.includes(key)) {
      this.commit(key, value, value);
      return;
    }

    // Encadeia por chave: gravações rápidas não chegam fora de ordem.
    const previous = this.writes.get(key) ?? Promise.resolve();
    const next = previous
      .then(async () => {
        const sealed = await seal(this.cryptoKey!, value);
        this.commit(key, value, sealed);
      })
      .catch((error) => {
        console.warn(`[StorageService] Falha ao cifrar "${key}"`, error);
        this.report(key, value, 'unknown');
      });

    this.writes.set(key, next);
  }

  /** `raw` é o valor em claro, que a retentativa reusa; `payload` é o que vai ao disco. */
  private commit(key: StorageKey, raw: unknown, payload: unknown): void {
    try {
      this.storage?.setItem(key, JSON.stringify(payload));
      this.failed.delete(key);
      if (this.failed.size === 0 && this.failure()?.reason !== 'unavailable') {
        this.failure.set(null);
      }
    } catch (error) {
      this.report(key, raw, isQuotaError(error) ? 'quota' : 'unknown');
    }
  }

  private report(key: StorageKey, raw: unknown, reason: StorageFailureReason): void {
    this.failed.set(key, raw);
    this.failure.update((current) => ({ reason, seq: (current?.seq ?? 0) + 1 }));
  }

  private readRaw(key: StorageKey): unknown {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      // JSON inválido: descarta em vez de derrubar o app.
      this.storage.removeItem(key);
      return null;
    }
  }

  private resolveStorage(): Storage | null {
    try {
      const probe = '__storage_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      this.failure.set({ reason: 'unavailable', seq: 1 });
      return null;
    }
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}
