import { Injectable } from '@angular/core';
import { sealBytes, unsealBytes } from '../security/crypto';

const DB_NAME = 'gastos';
const DB_VERSION = 1;
const STORE = 'attachments';

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

interface StoredAttachment {
  id: string;
  type: string;
  data: ArrayBuffer;
  /** `null` quando o anexo está em claro, ou seja, sem PIN ativo. */
  iv: string | null;
}

/**
 * Comprovante é binário e grande: fica no IndexedDB, não no `localStorage`, que
 * tem poucos megabytes para o app inteiro. Com PIN ativo os bytes são cifrados
 * com a mesma chave dos outros dados.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentStore {
  readonly supported = typeof indexedDB !== 'undefined';

  private cryptoKey: CryptoKey | null = null;
  private db: Promise<IDBDatabase | null> | null = null;

  useEncryption(key: CryptoKey): void {
    this.cryptoKey = key;
  }

  /** Ao ligar o PIN, o que já estava em claro é cifrado. */
  async enableEncryption(key: CryptoKey): Promise<void> {
    this.cryptoKey = key;

    for (const record of await this.all()) {
      if (record.iv) continue;
      await this.write({ ...record, ...(await sealBytes(key, record.data)) });
    }
  }

  /** Ao desligar o PIN, volta tudo para claro, senão os anexos ficariam ilegíveis. */
  async disableEncryption(): Promise<void> {
    const key = this.cryptoKey;
    this.cryptoKey = null;
    if (!key) return;

    for (const record of await this.all()) {
      if (!record.iv) continue;
      const data = await unsealBytes(key, { iv: record.iv, data: record.data });
      await this.write({ id: record.id, type: record.type, data, iv: null });
    }
  }

  async put(id: string, file: Blob): Promise<boolean> {
    const plain = await file.arrayBuffer();

    const record: StoredAttachment = this.cryptoKey
      ? { id, type: file.type, ...(await sealBytes(this.cryptoKey, plain)) }
      : { id, type: file.type, data: plain, iv: null };

    return this.write(record);
  }

  async get(id: string): Promise<Blob | null> {
    const record = await this.request<StoredAttachment | undefined>('readonly', (store) =>
      store.get(id),
    );
    if (!record) return null;

    if (!record.iv) return new Blob([record.data], { type: record.type });
    if (!this.cryptoKey) return null;

    try {
      const data = await unsealBytes(this.cryptoKey, { iv: record.iv, data: record.data });
      return new Blob([data], { type: record.type });
    } catch {
      return null;
    }
  }

  async remove(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      await this.request('readwrite', (store) => store.delete(id));
    }
  }

  async clear(): Promise<void> {
    await this.request('readwrite', (store) => store.clear());
  }

  private async all(): Promise<StoredAttachment[]> {
    return (await this.request<StoredAttachment[]>('readonly', (store) => store.getAll())) ?? [];
  }

  private async write(record: StoredAttachment): Promise<boolean> {
    const done = await this.request('readwrite', (store) => store.put(record));
    return done !== null;
  }

  private request<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T | null> {
    return this.open().then(
      (db) =>
        new Promise<T | null>((resolve) => {
          if (!db) {
            resolve(null);
            return;
          }

          try {
            const request = work(db.transaction(STORE, mode).objectStore(STORE));
            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        }),
    );
  }

  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise<IDBDatabase | null>((resolve) => {
      if (!this.supported) {
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });

    return this.db;
  }
}
