import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'filled' | 'tonal' | 'text';

/**
 * Botão base do sistema.
 *
 * Sem degradê: cor sólida + elevação suave. No hover o botão "vem para
 * frente" (translateY + sombra) e no press volta ao plano — nada exagerado.
 */
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
  /** Nome de um Material Symbol exibido antes do texto. */
  readonly icon = input<string>();
  /** Ocupa 100% da largura do container. */
  readonly block = input(false);
}
