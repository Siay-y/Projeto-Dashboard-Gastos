import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { UserProfile } from '../domain/models';
import { StorageService } from './storage.service';

/**
 * Estado do usuário identificado localmente.
 * Fonte única de verdade para o nome exibido no painel.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly storage = inject(StorageService);

  private readonly _profile = signal<UserProfile | null>(
    this.storage.get<UserProfile>(STORAGE_KEYS.USER_PROFILE),
  );

  /** Perfil completo (somente leitura). */
  readonly profile = this._profile.asReadonly();

  /** Nome do usuário ou string vazia. */
  readonly name = computed(() => this._profile()?.name ?? '');

  /** Verdadeiro quando o usuário já se identificou. */
  readonly isIdentified = computed(() => this._profile() !== null);

  /** Salva o nome informado na tela inicial. */
  identify(rawName: string): void {
    const name = rawName.trim();
    if (!name) return;

    const profile: UserProfile = {
      name,
      createdAt: this._profile()?.createdAt ?? new Date().toISOString(),
    };

    this._profile.set(profile);
    this.storage.set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  /** Esquece o usuário (útil para "trocar de nome" / reset). */
  forget(): void {
    this._profile.set(null);
    this.storage.remove(STORAGE_KEYS.USER_PROFILE);
  }
}
