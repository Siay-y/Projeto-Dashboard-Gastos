import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { APP_ROUTES } from '../../core/constants/routes';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { UserService } from '../../core/services/user.service';
import { CalculatorComponent } from '../../shared/ui/calculator/calculator.component';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { BOTTOM_NAV_ITEMS, MORE_NAV_ITEMS, NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CalculatorComponent, DialogComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly prefs = inject(UiPreferencesService);
  protected readonly user = inject(UserService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly bottomNavItems = BOTTOM_NAV_ITEMS;
  protected readonly moreItems = MORE_NAV_ITEMS;

  protected readonly initial = computed(() => this.user.name().charAt(0).toUpperCase());

  // Abaixo de 1024px a barra lateral não existe: o CSS ignora este estado.
  protected readonly collapsed = this.prefs.sidebarCollapsed;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly moreActive = computed(() =>
    this.moreItems.some((item) => this.url().startsWith(item.path)),
  );

  protected toggleSidebar(): void {
    this.prefs.toggleSidebar();
  }

  protected switchUser(): void {
    this.user.forget();
    void this.router.navigateByUrl(APP_ROUTES.ONBOARDING);
  }
}
