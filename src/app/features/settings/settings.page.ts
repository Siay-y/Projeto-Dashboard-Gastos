import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BudgetService } from '../../core/services/budget.service';
import { SecurityService } from '../../core/services/security.service';
import { StorageService } from '../../core/services/storage.service';
import { THEME_OPTIONS, ThemeService } from '../../core/services/theme.service';
import { UserService } from '../../core/services/user.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import {
  ButtonComponent,
  CardComponent,
  DeleteButtonComponent,
  DialogComponent,
  InputComponent,
  TabItem,
  TabsComponent,
  TileIconComponent,
} from '../../shared/ui';
import { BudgetDialogComponent, BudgetLimit } from './components/budget-dialog/budget-dialog.component';
import { PinDialogComponent } from './components/pin-dialog/pin-dialog.component';

/** O que fazer quando o PIN atual for confirmado; `null` = criar. */
type PendingAction = 'disable' | 'change' | 'reissue' | null;

const TABS: readonly TabItem[] = [
  { id: 'geral', label: 'Geral', icon: 'tune' },
  { id: 'orcamento', label: 'Orçamento', icon: 'savings' },
  { id: 'seguranca', label: 'Segurança', icon: 'lock' },
  { id: 'dados', label: 'Dados', icon: 'database' },
];

@Component({
  selector: 'app-settings-page',
  imports: [
    CurrencyPipe,
    ButtonComponent,
    CardComponent,
    DeleteButtonComponent,
    DialogComponent,
    InputComponent,
    TileIconComponent,
    TabsComponent,
    ReactiveFormsModule,
    BudgetDialogComponent,
    PinDialogComponent,
    FadeInUpDirective,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly storage = inject(StorageService);
  protected readonly user = inject(UserService);
  protected readonly security = inject(SecurityService);
  protected readonly budget = inject(BudgetService);
  protected readonly theme = inject(ThemeService);

  /** Permite chegar direto numa aba, como em `/configuracoes?aba=orcamento`. */
  readonly aba = input<string>();

  protected readonly tabs = TABS;
  protected readonly themeOptions = THEME_OPTIONS;

  protected readonly tab = linkedSignal(() => {
    const requested = this.aba();
    return TABS.some((t) => t.id === requested) ? requested! : TABS[0].id;
  });

  private readonly pinDialog = viewChild.required(PinDialogComponent);
  private readonly budgetDialog = viewChild.required(BudgetDialogComponent);
  private readonly wipeDialog = viewChild.required('wipeDialog', { read: DialogComponent });
  private readonly codeDialog = viewChild.required('codeDialog', { read: DialogComponent });

  protected readonly nameControl = new FormControl(this.user.name(), { nonNullable: true });
  protected readonly name = toSignal(this.nameControl.valueChanges, {
    initialValue: this.nameControl.value,
  });
  protected readonly nameSaved = signal(false);
  protected readonly recoveryCode = signal('');
  protected readonly codeCopied = signal(false);

  private pending: PendingAction = null;

  // Evento nativo: sem `[formGroup]`, nada forneceria `(ngSubmit)`.
  protected saveName(event: Event): void {
    event.preventDefault();

    const value = this.nameControl.value.trim();
    if (value.length < 2) return;

    this.user.identify(value);
    this.nameSaved.set(true);
    setTimeout(() => this.nameSaved.set(false), 2500);
  }

  protected addLimit(): void {
    this.budgetDialog().open();
  }

  protected editLimit(categoryId: string, limit: number): void {
    this.budgetDialog().open(categoryId, limit);
  }

  protected saveLimit({ categoryId, limit }: BudgetLimit): void {
    this.budget.setLimit(categoryId, limit);
  }

  protected togglePin(enabled: boolean): void {
    if (enabled === this.security.enabled()) return;

    if (enabled) {
      this.pending = null;
      this.pinDialog().open('create');
    } else {
      this.pending = 'disable';
      this.pinDialog().open('verify');
    }
  }

  protected changePin(): void {
    this.pending = 'change';
    this.pinDialog().open('verify');
  }

  protected reissueCode(): void {
    this.pending = 'reissue';
    this.pinDialog().open('verify');
  }

  protected async onPin(pin: string): Promise<void> {
    const dialog = this.pinDialog();

    if (this.pending === null) {
      const code = await this.security.enable(pin);
      dialog.close();
      this.showCode(code);
      return;
    }

    if (!(await this.security.verify(pin))) {
      dialog.fail('PIN incorreto');
      return;
    }

    const action = this.pending;
    this.pending = null;

    if (action === 'disable') {
      await this.security.disable(pin);
      dialog.close();
      return;
    }

    if (action === 'reissue') {
      const code = await this.security.reissue(pin);
      dialog.close();
      if (code) this.showCode(code);
      return;
    }

    dialog.open('create');
  }

  protected async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.recoveryCode());
      this.codeCopied.set(true);
    } catch {
      // Sem permissão: o código está na tela para copiar à mão.
    }
  }

  protected lockNow(): void {
    this.security.lock();
  }

  protected openWipe(): void {
    this.wipeDialog().open();
  }

  protected wipe(): void {
    this.storage.clear();
    location.reload();
  }

  private showCode(code: string): void {
    this.recoveryCode.set(code);
    this.codeCopied.set(false);
    this.codeDialog().open();
  }
}
