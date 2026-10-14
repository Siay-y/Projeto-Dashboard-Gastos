import { isBank, isMethod } from '../constants/accounts';

export interface AccountSlots {
  bankId: string | null;
  methodId: string | null;
}

/** Registro como está no disco, que pode ser de antes da separação dos campos. */
type StoredSlots = Partial<AccountSlots> & { accountId?: string | null };

/**
 * Até a separação, cada registro guardava um só `accountId`, que podia ser banco
 * ou forma de pagamento. O valor antigo é lido aqui e cai no campo do grupo a
 * que pertence; id que não existe mais vira nulo em vez de ficar pendurado.
 */
export function readAccountSlots(raw: StoredSlots): AccountSlots {
  const legacy = raw.accountId ?? null;

  return {
    bankId: keep(raw.bankId ?? (isBank(legacy) ? legacy : null), isBank),
    methodId: keep(raw.methodId ?? (isMethod(legacy) ? legacy : null), isMethod),
  };
}

/** O mesmo, já tirando o campo antigo para ele não voltar ao disco. */
export function withAccountSlots<T extends StoredSlots>(
  raw: T,
): Omit<T, 'accountId'> & AccountSlots {
  const slots = readAccountSlots(raw);
  const { accountId, ...rest } = raw;

  return { ...rest, ...slots };
}

function keep(
  id: string | null | undefined,
  belongs: (id: string | null) => boolean,
): string | null {
  return id && belongs(id) ? id : null;
}
