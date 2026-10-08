import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Alert, AlertAction } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-alert-list',
  templateUrl: './alert-list.component.html',
  styleUrl: './alert-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertListComponent {
  readonly alerts = input.required<Alert[]>();
  readonly action = output<AlertAction>();
}
