import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { findCategory } from '../../../../core/constants/categories';
import { Transaction } from '../../../../core/domain/models';
import { TransactionService } from '../../../../core/services/transaction.service';
import {
  ButtonComponent,
  DialogComponent,
  InputComponent,
  TileIconComponent,
} from '../../../../shared/ui';

const LIMIT = 40;

@Component({
  selector: 'app-transaction-picker',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    DialogComponent,
    InputComponent,
    ButtonComponent,
    TileIconComponent,
  ],
  templateUrl: './transaction-picker.component.html',
  styleUrl: './transaction-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionPickerComponent {
  readonly picked = output<string | null>();

  private readonly service = inject(TransactionService);
  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const term = this.query().trim().toLowerCase();
    const all = this.service.transactions();

    return (term ? all.filter((t) => t.description.toLowerCase().includes(term)) : all).slice(
      0,
      LIMIT,
    );
  });

  protected readonly hasMore = computed(() => this.service.transactions().length > LIMIT);

  open(): void {
    this.query.set('');
    this.dialog().open();
  }

  protected categoryOf(transaction: Transaction) {
    return findCategory(transaction.categoryId);
  }

  protected choose(id: string | null): void {
    this.picked.emit(id);
    this.dialog().close();
  }
}
