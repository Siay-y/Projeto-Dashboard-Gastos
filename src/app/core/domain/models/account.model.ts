import { IconRef } from './category.model';

/** Conta, cartão ou carteira por onde o dinheiro passou (Nubank, Itaú, PicPay…). */
export interface Account {
  id: string;
  label: string;
  icon: IconRef;
  /** Cor da marca (hex). */
  color: string;
}
