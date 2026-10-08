import { Injectable, computed, inject, signal } from '@angular/core';
import { ENCRYPTED_KEYS, STORAGE_KEYS } from '../constants/storage-keys';
import {
  Envelope,
  deriveKey,
  isCryptoAvailable,
  normalizeRecoveryCode,
  randomRecoveryCode,
  randomSalt,
  seal,
  unseal,
} from '../security/crypto';
import { StorageService } from './storage.service';

/** O PIN cifrado sob a chave do código de recuperação. */
interface Recovery {
  salt: string;
  pin: Envelope;
}

interface SecurityConfig {
  salt: string;
  /** Envelope de um valor conhecido: decifra = PIN correto. */
  check: Envelope;
  recovery?: Recovery;
}

const CHECK_VALUE = 'meus-gastos';
export const PIN_LENGTH = 4;

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly storage = inject(StorageService);

  private readonly config = signal<SecurityConfig | null>(
    this.storage.get<SecurityConfig>(STORAGE_KEYS.SECURITY),
  );

  private failures = 0;

  readonly supported = isCryptoAvailable();
  readonly enabled = computed(() => this.config() !== null);
  readonly recoverable = computed(() => this.config()?.recovery !== undefined);

  private readonly _locked = signal(this.config() !== null);
  readonly locked = this._locked.asReadonly();

  async unlock(pin: string): Promise<boolean> {
    const config = this.config();
    if (!config) return true;

    const key = await this.open(pin, config);
    if (!key) {
      this.failures++;
      await delay(Math.min(2000, this.failures * 400));
      return false;
    }

    for (const storageKey of ENCRYPTED_KEYS) {
      const envelope = this.storage.envelope(storageKey);
      if (envelope) this.storage.hydrate(storageKey, await unseal(key, envelope));
    }

    this.failures = 0;
    this.storage.useEncryption(key);
    this._locked.set(false);
    return true;
  }

  /** Ativa ou troca o PIN; devolve um código de recuperação sempre novo. */
  async enable(pin: string): Promise<string> {
    const salt = randomSalt();
    const key = await deriveKey(pin, salt);

    await this.storage.enableEncryption(key);

    const code = randomRecoveryCode();
    this.save({
      salt,
      check: await seal(key, CHECK_VALUE),
      recovery: await this.sealPin(pin, code),
    });
    this._locked.set(false);
    return code;
  }

  /** Outro código, sem mexer no PIN nem na chave dos dados. */
  async reissue(pin: string): Promise<string | null> {
    const config = this.config();
    if (!config || !(await this.verify(pin))) return null;

    const code = randomRecoveryCode();
    this.save({ ...config, recovery: await this.sealPin(pin, code) });
    return code;
  }

  /** Devolve o PIN guardado sob o código. */
  async recover(code: string): Promise<string | null> {
    const recovery = this.config()?.recovery;
    if (!recovery || !this.supported) return null;

    try {
      const key = await deriveKey(normalizeRecoveryCode(code), recovery.salt);
      return await unseal<string>(key, recovery.pin);
    } catch {
      this.failures++;
      await delay(Math.min(2000, this.failures * 400));
      return null;
    }
  }

  async disable(pin: string): Promise<boolean> {
    if (!(await this.verify(pin))) return false;

    await this.storage.disableEncryption();
    this.storage.remove(STORAGE_KEYS.SECURITY);
    this.config.set(null);
    return true;
  }

  async verify(pin: string): Promise<boolean> {
    const config = this.config();
    return config === null || (await this.open(pin, config)) !== null;
  }

  /** Recarrega a página: é o que devolve o app ao estado cifrado. */
  lock(): void {
    location.reload();
  }

  private async sealPin(pin: string, code: string): Promise<Recovery> {
    const salt = randomSalt();
    const key = await deriveKey(normalizeRecoveryCode(code), salt);
    return { salt, pin: await seal(key, pin) };
  }

  private save(config: SecurityConfig): void {
    this.storage.set(STORAGE_KEYS.SECURITY, config);
    this.config.set(config);
  }

  private async open(pin: string, config: SecurityConfig): Promise<CryptoKey | null> {
    if (!this.supported) return null;

    try {
      const key = await deriveKey(pin, config.salt);
      await unseal(key, config.check);
      return key;
    } catch {
      return null;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
