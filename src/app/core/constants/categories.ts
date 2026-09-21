import { Category } from '../domain/models';

const GROUP = {
  ESSENTIALS: 'Essenciais',
  LIFESTYLE: 'Estilo de vida',
  SUBSCRIPTIONS: 'Assinaturas',
  INCOME: 'Ganhos',
  OTHER: 'Outros',
} as const;

/**
 * Catálogo de categorias. Ícones de marca vêm da `simple-icons`
 * (ver `shared/icons/brand-icons.ts`); marcas sem ícone livre usam monograma.
 */
export const CATEGORIES: readonly Category[] = [
  // ---- Gastos: essenciais ----
  { id: 'food', label: 'Alimentação', type: 'expense', group: GROUP.ESSENTIALS, color: '#c2410c', icon: { kind: 'symbol', name: 'restaurant' } },
  { id: 'groceries', label: 'Mercado', type: 'expense', group: GROUP.ESSENTIALS, color: '#15803d', icon: { kind: 'symbol', name: 'shopping_cart' } },
  { id: 'housing', label: 'Moradia', type: 'expense', group: GROUP.ESSENTIALS, color: '#4f46e5', icon: { kind: 'symbol', name: 'home' } },
  { id: 'utilities', label: 'Contas', type: 'expense', group: GROUP.ESSENTIALS, color: '#0369a1', icon: { kind: 'symbol', name: 'receipt_long' } },
  { id: 'transport', label: 'Transporte', type: 'expense', group: GROUP.ESSENTIALS, color: '#374151', icon: { kind: 'symbol', name: 'directions_car' } },
  { id: 'health', label: 'Saúde', type: 'expense', group: GROUP.ESSENTIALS, color: '#be123c', icon: { kind: 'symbol', name: 'medical_services' } },
  { id: 'education', label: 'Educação', type: 'expense', group: GROUP.ESSENTIALS, color: '#7c3aed', icon: { kind: 'symbol', name: 'school' } },

  // ---- Gastos: estilo de vida ----
  { id: 'shopping', label: 'Compras', type: 'expense', group: GROUP.LIFESTYLE, color: '#db2777', icon: { kind: 'symbol', name: 'shopping_bag' } },
  { id: 'leisure', label: 'Lazer', type: 'expense', group: GROUP.LIFESTYLE, color: '#ca8a04', icon: { kind: 'symbol', name: 'confirmation_number' } },
  { id: 'travel', label: 'Viagem', type: 'expense', group: GROUP.LIFESTYLE, color: '#0891b2', icon: { kind: 'symbol', name: 'flight' } },
  { id: 'pets', label: 'Pets', type: 'expense', group: GROUP.LIFESTYLE, color: '#a16207', icon: { kind: 'symbol', name: 'pets' } },
  { id: 'gifts', label: 'Presentes', type: 'expense', group: GROUP.LIFESTYLE, color: '#e11d48', icon: { kind: 'symbol', name: 'featured_seasonal_and_gifts' } },
  { id: 'ifood', label: 'iFood', type: 'expense', group: GROUP.LIFESTYLE, color: '#EA1D2C', icon: { kind: 'brand', slug: 'ifood' } },
  { id: 'uber', label: 'Uber', type: 'expense', group: GROUP.LIFESTYLE, color: '#000000', icon: { kind: 'brand', slug: 'uber' } },

  // ---- Gastos: assinaturas ----
  { id: 'netflix', label: 'Netflix', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#E50914', icon: { kind: 'brand', slug: 'netflix' } },
  { id: 'spotify', label: 'Spotify', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#1ED760', icon: { kind: 'brand', slug: 'spotify' } },
  { id: 'disneyplus', label: 'Disney+', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#113CCF', icon: { kind: 'letter', text: 'D+' } },
  { id: 'amazonprime', label: 'Amazon Prime', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#00A8E1', icon: { kind: 'letter', text: 'Pr' } },
  { id: 'max', label: 'Max', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#002BE7', icon: { kind: 'brand', slug: 'max' } },
  { id: 'youtube', label: 'YouTube Premium', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#FF0000', icon: { kind: 'brand', slug: 'youtube' } },
  { id: 'discord', label: 'Discord Nitro', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#5865F2', icon: { kind: 'brand', slug: 'discord' } },
  { id: 'twitch', label: 'Twitch', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#9146FF', icon: { kind: 'brand', slug: 'twitch' } },
  { id: 'crunchyroll', label: 'Crunchyroll', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#FF5E00', icon: { kind: 'brand', slug: 'crunchyroll' } },
  { id: 'steam', label: 'Steam', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#1B2838', icon: { kind: 'brand', slug: 'steam' } },
  { id: 'playstation', label: 'PlayStation', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#0070D1', icon: { kind: 'brand', slug: 'playstation' } },
  { id: 'xbox', label: 'Xbox Game Pass', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#107C10', icon: { kind: 'letter', text: 'X' } },
  { id: 'apple', label: 'Apple', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#000000', icon: { kind: 'brand', slug: 'apple' } },
  { id: 'google', label: 'Google One', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#4285F4', icon: { kind: 'brand', slug: 'google' } },
  { id: 'claude', label: 'Claude', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#D97757', icon: { kind: 'brand', slug: 'claude' } },
  { id: 'chatgpt', label: 'ChatGPT', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#10A37F', icon: { kind: 'letter', text: 'G' } },
  { id: 'subscription', label: 'Outra assinatura', type: 'expense', group: GROUP.SUBSCRIPTIONS, color: '#6b7280', icon: { kind: 'symbol', name: 'subscriptions' } },

  // ---- Ganhos ----
  { id: 'salary', label: 'Salário', type: 'income', group: GROUP.INCOME, color: '#1e5e4b', icon: { kind: 'symbol', name: 'payments' } },
  { id: 'freelance', label: 'Freelance', type: 'income', group: GROUP.INCOME, color: '#0f766e', icon: { kind: 'symbol', name: 'work' } },
  { id: 'investments', label: 'Investimentos', type: 'income', group: GROUP.INCOME, color: '#15803d', icon: { kind: 'symbol', name: 'trending_up' } },
  { id: 'sales', label: 'Vendas', type: 'income', group: GROUP.INCOME, color: '#0369a1', icon: { kind: 'symbol', name: 'storefront' } },
  { id: 'gift-received', label: 'Presente', type: 'income', group: GROUP.INCOME, color: '#db2777', icon: { kind: 'symbol', name: 'redeem' } },
  { id: 'refund', label: 'Reembolso', type: 'income', group: GROUP.INCOME, color: '#4f46e5', icon: { kind: 'symbol', name: 'undo' } },

  // ---- Ambos ----
  { id: 'other', label: 'Outros', type: 'both', group: GROUP.OTHER, color: '#6b7280', icon: { kind: 'symbol', name: 'more_horiz' } },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Categoria de fallback para ids desconhecidos (ex.: dados antigos). */
export const FALLBACK_CATEGORY = CATEGORY_MAP.get('other')!;

export function findCategory(id: string): Category {
  return CATEGORY_MAP.get(id) ?? FALLBACK_CATEGORY;
}

export function categoriesFor(type: 'income' | 'expense'): Category[] {
  return CATEGORIES.filter((c) => c.type === type || c.type === 'both');
}
