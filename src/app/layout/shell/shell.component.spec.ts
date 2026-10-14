import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { STORAGE_KEYS } from '../../core/constants/storage-keys';
import { ShellComponent } from './shell.component';

async function setup(): Promise<ComponentFixture<ShellComponent>> {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });

  const fixture = TestBed.createComponent(ShellComponent);
  await fixture.whenStable();

  return fixture;
}

const toggle = (fixture: ComponentFixture<ShellComponent>): HTMLButtonElement =>
  fixture.nativeElement.querySelector('[aria-controls="shell-nav"]');

const shell = (fixture: ComponentFixture<ShellComponent>): HTMLElement =>
  fixture.nativeElement.querySelector('.shell');

const navLabels = (fixture: ComponentFixture<ShellComponent>): Element[] =>
  Array.from(fixture.nativeElement.querySelectorAll('#shell-nav .nav-link > span:last-child'));

describe('ShellComponent', () => {
  it('começa com a barra lateral aberta', async () => {
    const fixture = await setup();

    expect(shell(fixture).classList.contains('shell--rail')).toBe(false);
    expect(toggle(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(toggle(fixture).title).toBe('Recolher menu');
  });

  it('recolhe para o rail e volta', async () => {
    const fixture = await setup();

    toggle(fixture).click();
    await fixture.whenStable();

    expect(shell(fixture).classList.contains('shell--rail')).toBe(true);
    expect(toggle(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(toggle(fixture).title).toBe('Expandir menu');

    toggle(fixture).click();
    await fixture.whenStable();

    expect(shell(fixture).classList.contains('shell--rail')).toBe(false);
  });

  it('no rail o rótulo sai da tela mas continua no leitor de tela', async () => {
    const fixture = await setup();
    const labels = navLabels(fixture);

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((label) => label.classList.contains('visually-hidden'))).toBe(false);

    toggle(fixture).click();
    await fixture.whenStable();

    for (const label of navLabels(fixture)) {
      expect(label.classList.contains('visually-hidden')).toBe(true);
      expect(label.textContent?.trim()).not.toBe('');
    }
  });

  it('no rail cada atalho ganha o rótulo como dica do mouse', async () => {
    const fixture = await setup();
    const links = (): HTMLAnchorElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('#shell-nav .nav-link'));

    expect(links().every((link) => link.title === '')).toBe(true);

    toggle(fixture).click();
    await fixture.whenStable();

    for (const link of links()) {
      expect(link.title).toBe(link.querySelector('span:last-child')?.textContent?.trim());
    }
  });

  it('guarda a escolha para a próxima visita', async () => {
    const fixture = await setup();

    toggle(fixture).click();
    await fixture.whenStable();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.UI_PREFERENCES)!);
    expect(stored.sidebarCollapsed).toBe(true);
  });
});
