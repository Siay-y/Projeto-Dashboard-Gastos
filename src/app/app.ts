import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SecurityService } from './core/services/security.service';
import { ThemeService } from './core/services/theme.service';
import { LockComponent } from './features/lock/lock.component';
import { StorageAlertComponent } from './shared/ui/storage-alert/storage-alert.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LockComponent, StorageAlertComponent],
  template: `
    <app-storage-alert />

    @if (security.locked()) {
      <app-lock />
    } @else {
      <router-outlet />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly security = inject(SecurityService);
  private readonly router = inject(Router);
  private started = false;

  // Instanciado na raiz: o tema vale também para a tela de bloqueio.
  private readonly theme = inject(ThemeService);

  constructor() {
    // Navegação inicial desativada no config: só começa com os dados legíveis.
    effect(() => {
      if (this.security.locked() || this.started) return;
      this.started = true;
      this.router.initialNavigation();
    });
  }
}
