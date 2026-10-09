import {
  CalculatorKey,
  CalculatorState,
  INITIAL,
  display,
  pending,
  press,
} from './calculator-engine';

const KEYS: Record<string, CalculatorKey> = {
  '+': { kind: 'operator', value: '+' },
  '-': { kind: 'operator', value: '-' },
  '*': { kind: 'operator', value: '*' },
  '/': { kind: 'operator', value: '/' },
  '=': { kind: 'equals' },
  ',': { kind: 'decimal' },
  C: { kind: 'clear' },
  B: { kind: 'backspace' },
  S: { kind: 'sign' },
  '%': { kind: 'percent' },
};

/** Digita uma sequência: "12+3=" vira as teclas correspondentes. */
function type(sequence: string): CalculatorState {
  return [...sequence].reduce(
    (state, char) => press(state, KEYS[char] ?? { kind: 'digit', value: char }),
    INITIAL,
  );
}

const shown = (sequence: string) => display(type(sequence));

describe('calculadora', () => {
  it('soma, subtrai, multiplica e divide', () => {
    expect(shown('12+3=')).toBe('15');
    expect(shown('12-3=')).toBe('9');
    expect(shown('12*3=')).toBe('36');
    expect(shown('12/3=')).toBe('4');
  });

  it('encadeia operações como a calculadora do Windows', () => {
    // Cada operador fecha a conta anterior antes de começar a próxima.
    expect(shown('2+3*4=')).toBe('20');
    expect(shown('10-2-3=')).toBe('5');
  });

  it('troca o operador quando dois são digitados em sequência', () => {
    expect(shown('8+*2=')).toBe('16');
  });

  it('mostra a conta pendente acima do visor', () => {
    expect(pending(type('12+'))).toBe('12 +');
    expect(pending(type('12+3='))).toBe('');
  });

  it('formata em pt-BR e aceita decimais', () => {
    expect(shown('1234567')).toBe('1.234.567');
    expect(shown('1,5+2,25=')).toBe('3,75');
    expect(shown(',5')).toBe('0,5');
    expect(shown('1,,5')).toBe('1,5');
  });

  it('corta o ruído de ponto flutuante', () => {
    expect(shown('0,1+0,2=')).toBe('0,3');
  });

  it('recusa divisão por zero e só sai do erro com C', () => {
    const divided = type('5/0=');

    expect(display(divided)).toBe('Não dá para dividir por zero');
    expect(display(press(divided, { kind: 'digit', value: '7' }))).toBe(
      'Não dá para dividir por zero',
    );
    expect(display(press(divided, KEYS['C']))).toBe('0');
  });

  it('apaga o último dígito sem apagar a conta', () => {
    expect(shown('123B')).toBe('12');
    expect(shown('1B')).toBe('0');
    expect(shown('5+12B')).toBe('1');
  });

  it('inverte o sinal e aplica porcentagem', () => {
    expect(shown('25S')).toBe('-25');
    expect(shown('25SS')).toBe('25');
    expect(shown('0S')).toBe('0');
    expect(shown('50%')).toBe('0,5');
  });

  it('começa um número novo depois do resultado', () => {
    expect(shown('2+2=7')).toBe('7');
  });

  it('não deixa o número crescer sem limite', () => {
    expect(shown('1'.repeat(20)).replace(/\./g, '')).toHaveLength(14);
  });
});
