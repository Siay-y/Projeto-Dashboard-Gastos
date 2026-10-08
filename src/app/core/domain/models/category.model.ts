import { TransactionType } from './transaction.model';

export type IconRef =
  | { kind: 'symbol'; name: string }
  | { kind: 'brand'; slug: string }
  | { kind: 'letter'; text: string };

export interface Category {
  id: string;
  label: string;
  type: TransactionType | 'both';
  icon: IconRef;
  color: string;
  group: string;
}
