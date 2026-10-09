import { Injectable } from '@angular/core';
import { ENCRYPTED_KEYS, StorageKey } from '../constants/storage-keys';
import { Envelope, isEnvelope, seal } from '../security/crypto';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage: Storage | null = this.resolveStorage();

  // Com PIN ativo é a única forma de ler: o disco guarda apenas envelopes.
  private readonly cache = new Map<StorageKey, unknown>();
  private readonly writes = new Map<StorageKey, Promise<void>>();

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

  private write(key: StorageKey, value: unknown): void {
    if (!this.storage) return;

    if (!this.cryptoKey || !ENCRYPTED_KEYS.includes(key)) {
      this.writePlain(key, value);
      return;
    }

    // Encadeia por chave: gravações rápidas não chegam fora de ordem.
    const previous = this.writes.get(key) ?? Promise.resolve();
    const next = previous
      .then(async () => {
        const sealed = await seal(this.cryptoKey!, value);
        this.writePlain(key, sealed);
      })
      .catch((error) => console.warn(`[StorageService] Falha ao cifrar "${key}"`, error));

    this.writes.set(key, next);
  }

  private writePlain(key: StorageKey, value: unknown): void {
    try {
      this.storage?.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[StorageService] Falha ao salvar "${key}"`, error);
    }
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
      console.warn('[StorageService] LocalStorage indisponível; dados não serão persistidos.');
      return null;
    }
  }
}
