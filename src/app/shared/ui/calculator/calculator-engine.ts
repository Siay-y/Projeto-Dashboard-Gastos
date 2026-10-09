export type Operator = '+' | '-' | '*' | '/';

export type CalculatorKey =
  | { kind: 'digit'; value: string }
  | { kind: 'decimal' }
  | { kind: 'operator'; value: Operator }
  | { kind: 'equals' }
  | { kind: 'clear' }
  | { kind: 'backspace' }
  | { kind: 'sign' }
  | { kind: 'percent' };

export interface CalculatorState {
  entry: string;
  accumulator: number | null;
  operator: Operator | null;
  /** A próxima tecla começa um número novo em vez de concatenar. */
  replacing: boolean;
  error: boolean;
}

export const INITIAL: CalculatorState = {
  entry: '0',
  accumulator: null,
  operator: null,
  replacing: true,
  error: false,
};

const MAX_DIGITS = 14;
const OPERATOR_LABEL: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export function press(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (state.error && key.kind !== 'clear') return state;

  switch (key.kind) {
    case 'digit':
      return { ...state, entry: addDigit(state, key.value), replacing: false };

    case 'decimal':
      if (state.replacing) return { ...state, entry: '0.', replacing: false };
      return state.entry.includes('.') ? state : { ...state, entry: `${state.entry}.` };

    case 'operator':
      return { ...resolve(state), operator: key.value, replacing: true };

    case 'equals': {
      const next = resolve(state);
      return { ...next, accumulator: null, operator: null, replacing: true };
    }

    case 'clear':
      return INITIAL;

    case 'backspace': {
      if (state.replacing) return state;
      const trimmed = state.entry.slice(0, -1);
      return { ...state, entry: trimmed === '' || trimmed === '-' ? '0' : trimmed };
    }

    case 'sign':
      if (state.entry === '0') return state;
      return {
        ...state,
        entry: state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`,
      };

    case 'percent':
      return { ...state, entry: toEntry(Number(state.entry) / 100), replacing: true };
  }
}

export function display(state: CalculatorState): string {
  if (state.error) return 'Não dá para dividir por zero';
  return format(state.entry);
}

export function pending(state: CalculatorState): string {
  if (state.error || state.accumulator === null || !state.operator) return '';
  return `${format(String(state.accumulator))} ${OPERATOR_LABEL[state.operator]}`;
}

function addDigit(state: CalculatorState, digit: string): string {
  if (state.replacing) return digit;
  if (state.entry === '0') return digit;
  if (state.entry === '-0') return `-${digit}`;

  return digitCount(state.entry) >= MAX_DIGITS ? state.entry : state.entry + digit;
}

/** Fecha a operação pendente, se houver, deixando o resultado no visor. */
function resolve(state: CalculatorState): CalculatorState {
  const current = Number(state.entry);

  if (state.accumulator === null || state.operator === null) {
    return { ...state, accumulator: current };
  }

  // Operador logo após outro operador: só troca o operador, não recalcula.
  if (state.replacing) return state;

  if (state.operator === '/' && current === 0) {
    return { ...INITIAL, error: true };
  }

  const result = apply(state.accumulator, state.operator, current);
  if (!Number.isFinite(result)) return { ...INITIAL, error: true };

  return { ...state, entry: toEntry(result), accumulator: result };
}

function apply(left: number, operator: Operator, right: number): number {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
  }
}

function toEntry(value: number): string {
  // Corta o ruído de ponto flutuante: 0.1 + 0.2 vira 0.3, não 0.30000000000000004.
  return String(Number(value.toFixed(10)));
}

function digitCount(entry: string): number {
  return entry.replace(/[-.]/g, '').length;
}

function format(entry: string): string {
  if (entry.includes('e')) return entry;

  const negative = entry.startsWith('-');
  const [integer, fraction] = (negative ? entry.slice(1) : entry).split('.');
  const grouped = Number(integer || '0').toLocaleString('pt-BR');
  const decimals = entry.includes('.') ? `,${fraction ?? ''}` : '';

  return `${negative ? '-' : ''}${grouped}${decimals}`;
}
