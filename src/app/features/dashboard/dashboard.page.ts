import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes';
import { UserService } from '../../core/services/user.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import { ButtonComponent, CardComponent } from '../../shared/ui';

/**
 * Placeholder do painel — será substituído na Sessão 2.
 * Existe apenas para validar o fluxo onboarding → dashboard.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [CardComponent, ButtonComponent, FadeInUpDirective],
  template: `
    <main class="container placeholder">
      <app-card appFadeInUp>
        <span class="overline">Painel</span>
        <h2>Olá, {{ user.name() }}</h2>
        <p class="text-secondary">O painel será construído na Sessão 2.</p>
        <app-button variant="tonal" icon="logout" (click)="reset()">Trocar nome</app-button>
      </app-card>
    </main>
  `,
  styles: `
    .placeholder {
      padding-block: var(--space-10);
    }
    app-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
      max-width: 440px;
    }
    app-button {
      margin-top: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly user = inject(UserService);
  private readonly router = inject(Router);

  protected reset(): void {
    this.user.forget();
    void this.router.navigateByUrl(APP_ROUTES.ONBOARDING);
  }
}
