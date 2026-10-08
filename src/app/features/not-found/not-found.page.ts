import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import { ButtonComponent, CardComponent } from '../../shared/ui';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ButtonComponent, CardComponent, FadeInUpDirective],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected readonly routes = APP_ROUTES;

  protected readonly path = this.router.url.split('?')[0];

  protected goBack(): void {
    if (history.length > 1) this.location.back();
    else void this.router.navigateByUrl(this.routes.DASHBOARD);
  }
}
