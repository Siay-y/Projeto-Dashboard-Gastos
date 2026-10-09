import { Account } from '../domain/models';

const GROUP = {
  BANKS: 'Bancos',
  PAYMENT: 'Formas de Pagamento',
} as const;

export const ACCOUNTS: readonly Account[] = [
  { id: 'nubank', label: 'Nubank', group: GROUP.BANKS, color: '#820AD1', icon: { kind: 'brand', slug: 'nubank' } },
  { id: 'picpay', label: 'PicPay', group: GROUP.BANKS, color: '#21C25E', icon: { kind: 'brand', slug: 'picpay' } },
  { id: 'mercadopago', label: 'Mercado Pago', group: GROUP.BANKS, color: '#00B1EA', icon: { kind: 'brand', slug: 'mercadopago' } },
  { id: 'inter', label: 'Inter', group: GROUP.BANKS, color: '#FF7A00', icon: { kind: 'letter', text: 'In' } },
  { id: 'c6', label: 'C6 Bank', group: GROUP.BANKS, color: '#242424', icon: { kind: 'letter', text: 'C6' } },
  { id: 'neon', label: 'Neon', group: GROUP.BANKS, color: '#34D59A', icon: { kind: 'brand', slug: 'neon' } },
  { id: 'pagbank', label: 'PagBank', group: GROUP.BANKS, color: '#FFC801', icon: { kind: 'brand', slug: 'pagseguro' } },
  { id: 'paypal', label: 'PayPal', group: GROUP.BANKS, color: '#002991', icon: { kind: 'brand', slug: 'paypal' } },
  { id: 'itau', label: 'Itaú', group: GROUP.BANKS, color: '#EC7000', icon: { kind: 'letter', text: 'It' } },
  { id: 'bradesco', label: 'Bradesco', group: GROUP.BANKS, color: '#CC092F', icon: { kind: 'letter', text: 'Br' } },
  { id: 'santander', label: 'Santander', group: GROUP.BANKS, color: '#EC0000', icon: { kind: 'letter', text: 'Sa' } },
  { id: 'bb', label: 'Banco do Brasil', group: GROUP.BANKS, color: '#0038A8', icon: { kind: 'letter', text: 'BB' } },
  { id: 'caixa', label: 'Caixa', group: GROUP.BANKS, color: '#005CA9', icon: { kind: 'letter', text: 'Cx' } },
  { id: 'btg', label: 'BTG', group: GROUP.BANKS, color: '#001E62', icon: { kind: 'letter', text: 'BT' } },
  { id: 'xp', label: 'XP', group: GROUP.BANKS, color: '#000000', icon: { kind: 'letter', text: 'XP' } },

  { id: 'pix', label: 'Pix', group: GROUP.PAYMENT, color: '#77B6A8', icon: { kind: 'brand', slug: 'pix' } },
  { id: 'cash', label: 'Dinheiro', group: GROUP.PAYMENT, color: '#1e7a4a', icon: { kind: 'symbol', name: 'payments' } },
  { id: 'credit', label: 'Cartão de crédito', group: GROUP.PAYMENT, color: '#6d28d9', icon: { kind: 'symbol', name: 'credit_card' } },
  { id: 'debit', label: 'Cartão de débito', group: GROUP.PAYMENT, color: '#0369a1', icon: { kind: 'symbol', name: 'account_balance' } },
  { id: 'boleto', label: 'Boleto', group: GROUP.PAYMENT, color: '#44403c', icon: { kind: 'symbol', name: 'receipt_long' } },
  { id: 'other', label: 'Outros', group: GROUP.PAYMENT, color: '#6b7280', icon: { kind: 'symbol', name: 'more_horiz' } },
];

const ACCOUNT_MAP = new Map(ACCOUNTS.map((a) => [a.id, a]));

export function findAccount(id: string | null | undefined): Account | undefined {
  return id ? ACCOUNT_MAP.get(id) : undefined;
}

export function accountGroups(): { label: string; items: Account[] }[] {
  return Object.values(GROUP).map((label) => ({
    label,
    items: ACCOUNTS.filter((a) => a.group === label),
  }));
}
