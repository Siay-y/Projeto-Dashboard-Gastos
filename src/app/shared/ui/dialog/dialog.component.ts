import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

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

  protected handleClose(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.close();
  }
}
