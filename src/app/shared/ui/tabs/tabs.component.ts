import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  readonly items = input.required<readonly TabItem[]>();
  readonly value = model.required<string>();

  /** Prefixo dos ids: o painel correspondente fica no pai. */
  readonly name = input.required<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  tabId(id: string): string {
    return `${this.name()}-tab-${id}`;
  }

  panelId(id: string): string {
    return `${this.name()}-panel-${id}`;
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const last = this.items().length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];

    if (target === undefined) return;

    event.preventDefault();
    this.value.set(this.items()[target].id);
    this.buttons()[target]?.nativeElement.focus();
  }
}
