import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface MenuItem {
  id: string;
  label: string;
  /** Material Symbol exibido antes do rótulo. */
  icon?: string;
  disabled?: boolean;
}

/**
 * Menu de ações secundárias: botão de três pontos que abre um painel.
 * Fecha ao escolher um item, clicar fora ou pressionar Esc.
 *
 *   <app-menu [items]="[{ id: 'export', label: 'Exportar', icon: 'download' }]" (select)="…" />
 */
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class MenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly items = input.required<MenuItem[]>();
  /** Rótulo acessível do botão de três pontos. */
  readonly label = input('Mais opções');

  readonly select = output<string>();

  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected pick(item: MenuItem): void {
    if (item.disabled) return;
    this.select.emit(item.id);
    this.close();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
