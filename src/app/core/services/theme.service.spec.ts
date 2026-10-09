import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { ThemeService } from './theme.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ThemeService);
}

const themeAttribute = () => document.documentElement.getAttribute('data-theme');

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#f5f4f0">';
  });

  it('começa em "sistema" e resolve pelo navegador', async () => {
    const theme = setup();
    await TestBed.tick();

    // O jsdom responde que o sistema não está no escuro.
    expect(theme.choice()).toBe('system');
    expect(theme.theme()).toBe('light');
    expect(themeAttribute()).toBe('light');
  });

  it('aplica a escolha no documento e na cor da barra do navegador', async () => {
    const theme = setup();

    theme.set('dark');
    await TestBed.tick();

    expect(theme.theme()).toBe('dark');
    expect(themeAttribute()).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#131311',
    );
  });

  it('guarda a escolha e a recupera na sessão seguinte', async () => {
    setup().set('dark');
    await TestBed.tick();

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('"dark"');

    TestBed.resetTestingModule();
    expect(setup().choice()).toBe('dark');
  });

  it('ignora valor estranho no armazenamento', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, '"neon"');

    expect(setup().choice()).toBe('system');
  });
});
