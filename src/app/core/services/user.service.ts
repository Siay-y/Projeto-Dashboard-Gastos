import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { UserProfile } from '../domain/models';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly storage = inject(StorageService);

  private readonly _profile = signal<UserProfile | null>(
    this.storage.get<UserProfile>(STORAGE_KEYS.USER_PROFILE),
  );

  readonly profile = this._profile.asReadonly();

  readonly name = computed(() => this._profile()?.name ?? '');

  readonly isIdentified = computed(() => this._profile() !== null);

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

  forget(): void {
    this._profile.set(null);
    this.storage.remove(STORAGE_KEYS.USER_PROFILE);
  }
}
