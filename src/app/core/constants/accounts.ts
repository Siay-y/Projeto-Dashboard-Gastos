import { Account } from '../domain/models';

/**
 * Catálogo de contas/cartões/carteiras. Marcas sem ícone livre usam monograma.
 * Para adicionar uma marca com logo: registre em `shared/icons/brand-icons.ts`.
 */
export const ACCOUNTS: readonly Account[] = [
  // ---- Bancos digitais / carteiras ----
  { id: 'nubank', label: 'Nubank', color: '#820AD1', icon: { kind: 'brand', slug: 'nubank' } },
  { id: 'picpay', label: 'PicPay', color: '#21C25E', icon: { kind: 'brand', slug: 'picpay' } },
  { id: 'mercadopago', label: 'Mercado Pago', color: '#00B1EA', icon: { kind: 'brand', slug: 'mercadopago' } },
  { id: 'inter', label: 'Inter', color: '#FF7A00', icon: { kind: 'letter', text: 'In' } },
  { id: 'c6', label: 'C6 Bank', color: '#242424', icon: { kind: 'letter', text: 'C6' } },
  { id: 'neon', label: 'Neon', color: '#34D59A', icon: { kind: 'brand', slug: 'neon' } },
  { id: 'pagbank', label: 'PagBank', color: '#FFC801', icon: { kind: 'brand', slug: 'pagseguro' } },
  { id: 'paypal', label: 'PayPal', color: '#002991', icon: { kind: 'brand', slug: 'paypal' } },

  // ---- Bancos tradicionais ----
  { id: 'itau', label: 'Itaú', color: '#EC7000', icon: { kind: 'letter', text: 'It' } },
  { id: 'bradesco', label: 'Bradesco', color: '#CC092F', icon: { kind: 'letter', text: 'Br' } },
  { id: 'santander', label: 'Santander', color: '#EC0000', icon: { kind: 'letter', text: 'Sa' } },
  { id: 'bb', label: 'Banco do Brasil', color: '#0038A8', icon: { kind: 'letter', text: 'BB' } },
  { id: 'caixa', label: 'Caixa', color: '#005CA9', icon: { kind: 'letter', text: 'Cx' } },
  { id: 'btg', label: 'BTG', color: '#001E62', icon: { kind: 'letter', text: 'BT' } },
  { id: 'xp', label: 'XP', color: '#000000', icon: { kind: 'letter', text: 'XP' } },

  // ---- Outros ----
  { id: 'pix', label: 'Pix', color: '#77B6A8', icon: { kind: 'brand', slug: 'pix' } },
  { id: 'cash', label: 'Dinheiro', color: '#1e7a4a', icon: { kind: 'symbol', name: 'payments' } },
  { id: 'other', label: 'Outro', color: '#6b7280', icon: { kind: 'symbol', name: 'credit_card' } },
];

const ACCOUNT_MAP = new Map(ACCOUNTS.map((a) => [a.id, a]));

/** `undefined` quando a transação não tem conta informada. */
export function findAccount(id: string | null | undefined): Account | undefined {
  return id ? ACCOUNT_MAP.get(id) : undefined;
}
