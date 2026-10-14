import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { UiPreferencesService } from './ui-preferences.service';

function setup(stored?: unknown): UiPreferencesService {
  localStorage.clear();
  if (stored !== undefined) {
    localStorage.setItem(STORAGE_KEYS.UI_PREFERENCES, JSON.stringify(stored));
  }

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return TestBed.inject(UiPreferencesService);
}

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.UI_PREFERENCES)!);

describe('UiPreferencesService', () => {
  describe('seções recolhíveis', () => {
    it('usa o padrão de quem pergunta quando não há preferência', () => {
      const prefs = setup();

      expect(prefs.isExpanded('resumo', true)).toBe(true);
      expect(prefs.isExpanded('resumo', false)).toBe(false);
    });

    it('guarda a escolha e a lê de volta do disco', async () => {
      const first = setup();
      first.setExpanded('resumo', false);
      await TestBed.tick();

      expect(setup(stored()).isExpanded('resumo', true)).toBe(false);
    });
  });

  describe('barra lateral', () => {
    it('começa aberta', () => {
      expect(setup().sidebarCollapsed()).toBe(false);
    });

    it('alterna e grava', async () => {
      const prefs = setup();

      prefs.toggleSidebar();
      expect(prefs.sidebarCollapsed()).toBe(true);
      await TestBed.tick();
      expect(stored().sidebarCollapsed).toBe(true);

      prefs.toggleSidebar();
      expect(prefs.sidebarCollapsed()).toBe(false);
    });

    it('recupera o estado recolhido ao recarregar', () => {
      expect(setup({ expanded: {}, sidebarCollapsed: true }).sidebarCollapsed()).toBe(true);
    });

    it('não perde as seções ao guardar a barra', async () => {
      const prefs = setup({ expanded: { resumo: false }, sidebarCollapsed: false });

      prefs.toggleSidebar();
      await TestBed.tick();

      expect(stored()).toEqual({ expanded: { resumo: false }, sidebarCollapsed: true });
    });

    it('valor estranho no disco não deixa a barra recolhida', () => {
      expect(setup({ sidebarCollapsed: 'sim' }).sidebarCollapsed()).toBe(false);
      expect(setup({}).sidebarCollapsed()).toBe(false);
      expect(setup('nada disso').sidebarCollapsed()).toBe(false);
    });
  });
});
