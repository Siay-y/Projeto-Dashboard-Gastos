import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes';
import { UserService } from '../../core/services/user.service';
import { NAV_ITEMS } from '../nav-items';

/**
 * Estrutura do painel.
 * Desktop: sidebar fixa à esquerda. Mobile: top bar + navegação inferior.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  protected readonly user = inject(UserService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly initial = computed(() => this.user.name().charAt(0).toUpperCase());

  protected switchUser(): void {
    this.user.forget();
    void this.router.navigateByUrl(APP_ROUTES.ONBOARDING);
  }
}
