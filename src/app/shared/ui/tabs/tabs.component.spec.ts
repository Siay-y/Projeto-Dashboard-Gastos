import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabItem, TabsComponent } from './tabs.component';

const ITEMS: TabItem[] = [
  { id: 'a', label: 'Primeira' },
  { id: 'b', label: 'Segunda' },
  { id: 'c', label: 'Terceira' },
];

async function setup(): Promise<ComponentFixture<TabsComponent>> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  const fixture = TestBed.createComponent(TabsComponent);
  fixture.componentRef.setInput('items', ITEMS);
  fixture.componentRef.setInput('value', 'a');
  fixture.componentRef.setInput('name', 'teste');
  await fixture.whenStable();

  return fixture;
}

const tabs = (fixture: ComponentFixture<TabsComponent>): HTMLButtonElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));

describe('TabsComponent', () => {
  it('marca a aba ativa e tira as outras da ordem de tabulação', async () => {
    const fixture = await setup();
    const [first, second] = tabs(fixture);

    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(second.getAttribute('aria-selected')).toBe('false');
    expect(second.getAttribute('tabindex')).toBe('-1');
  });

  it('liga cada aba ao painel correspondente', async () => {
    const fixture = await setup();
    const [first] = tabs(fixture);

    expect(first.id).toBe('teste-tab-a');
    expect(first.getAttribute('aria-controls')).toBe('teste-panel-a');
  });

  it('seleciona ao clicar', async () => {
    const fixture = await setup();

    tabs(fixture)[2].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('c');
  });

  it('navega pelo teclado e dá a volta nas pontas', async () => {
    const fixture = await setup();
    const press = async (key: string) => {
      tabs(fixture)
        .find((tab) => tab.getAttribute('aria-selected') === 'true')!
        .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };

    await press('ArrowRight');
    expect(fixture.componentInstance.value()).toBe('b');

    await press('ArrowLeft');
    await press('ArrowLeft');
    expect(fixture.componentInstance.value()).toBe('c');

    await press('Home');
    expect(fixture.componentInstance.value()).toBe('a');

    await press('End');
    expect(fixture.componentInstance.value()).toBe('c');
  });
});
