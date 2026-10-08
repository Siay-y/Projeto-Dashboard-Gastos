import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserService } from '../../core/services/user.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  it('grava o nome digitado ao enviar o formulário', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const user = TestBed.inject(UserService);
    user.identify('Luiz');

    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('.field__input') as HTMLInputElement;
    input.value = 'Luiz Henrique';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const save = fixture.nativeElement.querySelector('.profile button') as HTMLButtonElement;
    save.click();
    await fixture.whenStable();

    expect(user.name()).toBe('Luiz Henrique');
  });
});
