import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalculatorComponent } from './calculator.component';

const PANEL_RECT = { left: 700, top: 400, right: 964, bottom: 740, width: 264, height: 340 };

function fakeMatchMedia(desktop: boolean): void {
  (globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({
    matches: desktop,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

function pointer(type: string, x: number, y: number): MouseEvent {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.assign(event, { pointerId: 1 });
  return event;
}

async function setup(desktop: boolean): Promise<ComponentFixture<CalculatorComponent>> {
  fakeMatchMedia(desktop);
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  const fixture = TestBed.createComponent(CalculatorComponent);
  fixture.componentInstance.toggle();
  await fixture.whenStable();

  return fixture;
}

const panelOf = (fixture: ComponentFixture<CalculatorComponent>): HTMLElement =>
  fixture.nativeElement.querySelector('.calc');

const entryOf = (fixture: ComponentFixture<CalculatorComponent>): HTMLInputElement =>
  fixture.nativeElement.querySelector('.calc__value');

function keyOf(fixture: ComponentFixture<CalculatorComponent>, label: string): HTMLButtonElement {
  const keys: HTMLButtonElement[] = Array.from(
    fixture.nativeElement.querySelectorAll('.calc__key'),
  );

  return keys.find((key) => key.textContent?.trim() === label) as HTMLButtonElement;
}

async function type(
  fixture: ComponentFixture<CalculatorComponent>,
  text: string,
  caret: number,
): Promise<HTMLInputElement> {
  const entry = entryOf(fixture);

  entry.focus();
  entry.value = text;
  entry.setSelectionRange(caret, caret);
  entry.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();

  return entry;
}

async function dragBy(
  fixture: ComponentFixture<CalculatorComponent>,
  dx: number,
  dy: number,
): Promise<void> {
  const bar = fixture.nativeElement.querySelector('.calc__bar') as HTMLElement;

  bar.dispatchEvent(pointer('pointerdown', 800, 500));
  bar.dispatchEvent(pointer('pointermove', 800 + dx, 500 + dy));
  bar.dispatchEvent(pointer('pointerup', 800 + dx, 500 + dy));
  await fixture.whenStable();
}

describe('CalculatorComponent', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.getBoundingClientRect = () => PANEL_RECT as DOMRect;
    Object.assign(window, { innerWidth: 1024, innerHeight: 768 });
  });

  it('abre e fecha', async () => {
    const fixture = await setup(true);
    expect(panelOf(fixture)).not.toBeNull();

    fixture.componentInstance.close();
    await fixture.whenStable();

    expect(panelOf(fixture)).toBeNull();
  });

  it('no desktop, arrasta junto com o ponteiro', async () => {
    const fixture = await setup(true);

    await dragBy(fixture, -100, -50);

    expect(panelOf(fixture).style.transform).toBe('translate(-100px, -50px)');
  });

  it('não deixa o painel sair da tela', async () => {
    const fixture = await setup(true);

    await dragBy(fixture, 500, 500);

    expect(panelOf(fixture).style.transform).toBe('translate(52px, 20px)');
  });

  it('volta à posição padrão ao fechar e abrir de novo', async () => {
    const fixture = await setup(true);
    await dragBy(fixture, -100, -50);

    fixture.componentInstance.close();
    await fixture.whenStable();
    fixture.componentInstance.toggle();
    await fixture.whenStable();

    expect(panelOf(fixture).style.transform).toBe('translate(0px, 0px)');
  });

  it('no desktop, clicar fora e Esc não fecham', async () => {
    const fixture = await setup(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(panelOf(fixture)).not.toBeNull();
  });

  it('no desktop, o X fecha', async () => {
    const fixture = await setup(true);

    (fixture.nativeElement.querySelector('.calc__bar button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(panelOf(fixture)).toBeNull();
  });

  it('no celular, clicar fora fecha', async () => {
    const fixture = await setup(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(panelOf(fixture)).toBeNull();
  });

  it('digita no meio do número sem o cursor pular para o fim', async () => {
    const fixture = await setup(true);
    await type(fixture, '122,45', 6);

    const entry = await type(fixture, '122,945', 5);

    expect(entry.value).toBe('122,945');
    expect(entry.selectionStart).toBe(5);
  });

  it('com separador de milhar, o cursor segue o dígito, não a posição', async () => {
    const fixture = await setup(true);
    await type(fixture, '1234', 4);

    const entry = await type(fixture, '1.2934', 4);

    expect(entry.value).toBe('12.934');
    expect(entry.selectionStart).toBe(4);
  });

  it('a tecla da calculadora entra na posição do cursor', async () => {
    const fixture = await setup(true);
    const entry = await type(fixture, '122,45', 4);

    keyOf(fixture, '9').click();
    await fixture.whenStable();

    expect(entry.value).toBe('122,945');
    expect(entry.selectionStart).toBe(5);
  });

  it('apagar tira o caractere antes do cursor, não o último', async () => {
    const fixture = await setup(true);
    const entry = await type(fixture, '122,45', 5);

    keyOf(fixture, '⌫').click();
    await fixture.whenStable();

    expect(entry.value).toBe('122,5');
    expect(entry.selectionStart).toBe(4);
  });

  it('depois de um operador, o dígito troca o número em vez de entrar nele', async () => {
    const fixture = await setup(true);
    await type(fixture, '12', 2);

    keyOf(fixture, '+').click();
    keyOf(fixture, '5').click();
    await fixture.whenStable();

    expect(entryOf(fixture).value).toBe('5');
  });

  it('com o cursor no visor, o teclado só intercepta a conta', async () => {
    const fixture = await setup(true);
    const entry = await type(fixture, '12', 2);

    entry.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
    await fixture.whenStable();
    expect(entry.value).toBe('12');

    entry.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.calc__pending').textContent.trim()).toBe('12 +');
  });

  it('no celular fica fixo: não arrasta', async () => {
    const fixture = await setup(false);

    await dragBy(fixture, -100, -50);

    expect(panelOf(fixture).style.transform).toBe('translate(0px, 0px)');
    expect(fixture.nativeElement.querySelector('.calc__grip')).toBeNull();
  });
});
