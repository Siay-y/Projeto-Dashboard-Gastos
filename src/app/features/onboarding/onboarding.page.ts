import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes';
import { UserService } from '../../core/services/user.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import { ButtonComponent, CardComponent, InputComponent } from '../../shared/ui';
import { getGreeting } from '../../shared/utils/greeting';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 30;

/**
 * Tela inicial: pergunta o nome do usuário e o salva localmente.
 * Mostra uma prévia ao vivo de como o painel vai saudá-lo.
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [FormsModule, CardComponent, InputComponent, ButtonComponent, FadeInUpDirective],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly user = inject(UserService);
  private readonly router = inject(Router);

  protected readonly maxLength = MAX_NAME_LENGTH;
  protected readonly greeting = getGreeting();

  protected readonly name = signal('');
  protected readonly submitted = signal(false);

  protected readonly trimmedName = computed(() => this.name().trim());
  protected readonly isValid = computed(() => this.trimmedName().length >= MIN_NAME_LENGTH);

  /** Inicial do nome, exibida no avatar da prévia. */
  protected readonly initial = computed(() => this.trimmedName().charAt(0).toUpperCase());

  /** Só mostra erro depois da primeira tentativa de envio. */
  protected readonly errorMessage = computed(() =>
    this.submitted() && !this.isValid()
      ? `Use pelo menos ${MIN_NAME_LENGTH} caracteres.`
      : undefined,
  );

  protected submit(): void {
    this.submitted.set(true);
    if (!this.isValid()) return;

    this.user.identify(this.name());
    void this.router.navigateByUrl(APP_ROUTES.DASHBOARD);
  }
}
