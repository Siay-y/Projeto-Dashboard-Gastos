import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalculatorComponent } from './calculator.component';
import { CalculatorService } from './calculator.service';

@Component({
  imports: [CalculatorComponent],
  template: `
    <app-calculator />
    <app-calculator variant="embedded" [active]="active()" />
  `,
})
class HostComponent {
  readonly active = signal(false);
}

const hosts = (fixture: ComponentFixture<HostComponent>): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('app-calculator'));

function fakeMatchMedia(desktop: boolean): void {
  (globalThis as unknown as { matchMedia: unknown }).matchMedia = () => ({
    matches: desktop,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

async function setup(desktop = true): Promise<ComponentFixture<HostComponent>> {
  fakeMatchMedia(desktop);
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();

  return fixture;
}

describe('calculadora entre o shell e o diálogo', () => {
  it('com o diálogo fechado, só o shell desenha', async () => {
    const fixture = await setup();
    const [shell, dialog] = hosts(fixture);

    expect(shell.querySelector('.fab')).not.toBeNull();
    expect(dialog.querySelector('.fab')).toBeNull();
  });

  it('com o diálogo aberto, o shell some e o diálogo assume', async () => {
    const fixture = await setup();

    fixture.componentInstance.active.set(true);
    await fixture.whenStable();

    const [shell, dialog] = hosts(fixture);
    expect(shell.querySelector('.fab')).toBeNull();
    expect(dialog.querySelector('.fab')).not.toBeNull();
  });

  it('a conta atravessa a troca sem se perder', async () => {
    const fixture = await setup();
    const store = TestBed.inject(CalculatorService);

    store.toggle();
    store.press({ kind: 'digit', value: '4' });
    store.press({ kind: 'digit', value: '2' });
    await fixture.whenStable();

    expect(hosts(fixture)[0].querySelector('.calc__value')?.textContent?.trim()).toBe('42');

    fixture.componentInstance.active.set(true);
    await fixture.whenStable();

    const [shell, dialog] = hosts(fixture);
    expect(shell.querySelector('.calc')).toBeNull();
    expect(dialog.querySelector('.calc__value')?.textContent?.trim()).toBe('42');
  });

  it('no celular o diálogo não assume: a sobreposição é só do desktop', async () => {
    const fixture = await setup(false);

    fixture.componentInstance.active.set(true);
    await fixture.whenStable();

    const [shell, dialog] = hosts(fixture);
    expect(shell.querySelector('.fab')).not.toBeNull();
    expect(dialog.querySelector('.fab')).toBeNull();
  });

  it('o shell volta quando o diálogo fecha', async () => {
    const fixture = await setup();

    fixture.componentInstance.active.set(true);
    await fixture.whenStable();
    fixture.componentInstance.active.set(false);
    await fixture.whenStable();

    const [shell, dialog] = hosts(fixture);
    expect(shell.querySelector('.fab')).not.toBeNull();
    expect(dialog.querySelector('.fab')).toBeNull();
  });
});
