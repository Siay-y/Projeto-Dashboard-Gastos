import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { StorageFailureReason, StorageService } from '../../../core/services/storage.service';

const MESSAGE: Record<StorageFailureReason, string> = {
  quota: 'O armazenamento deste navegador está cheio, e o último dado não foi salvo.',
  unavailable:
    'Este navegador está bloqueando o armazenamento local, então nada será salvo neste aparelho.',
  unknown: 'Não foi possível salvar os dados neste aparelho.',
};

@Component({
  selector: 'app-storage-alert',
  templateUrl: './storage-alert.component.html',
  styleUrl: './storage-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageAlertComponent {
  private readonly storage = inject(StorageService);

  private readonly dismissedSeq = signal(0);

  protected readonly failure = computed(() => {
    const failure = this.storage.failure();
    return failure && failure.seq > this.dismissedSeq() ? failure : null;
  });

  protected readonly message = computed(() => {
    const failure = this.failure();
    return failure ? MESSAGE[failure.reason] : '';
  });

  protected readonly retryable = computed(() => this.failure()?.reason !== 'unavailable');

  protected retry(): void {
    this.storage.retry();
  }

  protected dismiss(): void {
    this.dismissedSeq.set(this.storage.failure()?.seq ?? 0);
  }
}
