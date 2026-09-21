import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Modal sobre o elemento nativo `<dialog>`: foco preso, Esc fecha, backdrop.
 * Desktop: caixa centralizada. Mobile: bottom sheet.
 *
 * Uso:
 *   <app-dialog #dlg title="Nova transação" (closed)="…">…</app-dialog>
 *   dlg.open() / dlg.close()
 */
@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size()',
  },
})
export class DialogComponent {
  readonly title = input.required<string>();
  /** Largura máxima no desktop: `md` 520px, `lg` 720px. */
  readonly size = input<'md' | 'lg'>('md');
  readonly closed = output<void>();

  protected readonly isOpen = signal(false);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    const el = this.dialogRef().nativeElement;
    if (el.open) return;
    el.showModal();
    this.isOpen.set(true);
  }

  close(): void {
    const el = this.dialogRef().nativeElement;
    if (el.open) el.close();
  }

  /** Disparado pelo evento nativo `close` (Esc, `close()` ou botão). */
  protected handleClose(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  /** Clique fora do painel (no backdrop) fecha o diálogo. */
  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.close();
  }
}
