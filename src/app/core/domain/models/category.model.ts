import { TransactionType } from './transaction.model';

/** Referência de ícone: Material Symbol, logo de marca (SVG) ou monograma. */
export type IconRef =
  | { kind: 'symbol'; name: string }
  | { kind: 'brand'; slug: string }
  | { kind: 'letter'; text: string };

export interface Category {
  id: string;
  label: string;
  /** A quais tipos de transação a categoria se aplica. */
  type: TransactionType | 'both';
  icon: IconRef;
  /** Cor de referência (hex) — usada nos gráficos. */
  color: string;
  /** Agrupamento no seletor (ex.: "Assinaturas"). */
  group: string;
}
