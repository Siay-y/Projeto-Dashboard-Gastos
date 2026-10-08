import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'filled' | 'tonal' | 'text' | 'danger';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.block]': 'block()',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('filled');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input<string>();
  readonly block = input(false);
}
