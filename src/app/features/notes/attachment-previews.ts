import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NoteAttachment } from '../../core/domain/models';
import { AttachmentStore } from '../../core/services/attachment.store';

/**
 * Object URL de cada anexo, para miniatura e download. Fica em signal porque as
 * leituras do IndexedDB chegam depois do render: um Map comum não avisaria a
 * tela. Cada componente provê a sua instância e solta as URLs ao sair.
 */
@Injectable()
export class AttachmentPreviews {
  private readonly store = inject(AttachmentStore);
  private readonly urls = signal<ReadonlyMap<string, string>>(new Map());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseAll());
  }

  urlOf(id: string): string | null {
    return this.urls().get(id) ?? null;
  }

  /** Arquivo escolhido agora, que ainda não foi para o IndexedDB. */
  hold(id: string, file: Blob): void {
    this.set(id, URL.createObjectURL(file));
  }

  async load(attachments: readonly NoteAttachment[]): Promise<void> {
    for (const attachment of attachments) {
      if (this.urls().has(attachment.id)) continue;

      const blob = await this.store.get(attachment.id);
      if (blob) this.set(attachment.id, URL.createObjectURL(blob));
    }
  }

  release(id: string): void {
    const url = this.urls().get(id);
    if (!url) return;

    URL.revokeObjectURL(url);
    this.urls.update((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  releaseAll(): void {
    for (const id of [...this.urls().keys()]) this.release(id);
  }

  private set(id: string, url: string): void {
    this.urls.update((current) => new Map(current).set(id, url));
  }
}
