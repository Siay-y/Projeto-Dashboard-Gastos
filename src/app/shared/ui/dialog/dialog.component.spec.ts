import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

@Component({
  imports: [DialogComponent],
  template: `
    <app-dialog title="Teste">
      <p class="corpo">conteúdo</p>
      <span dialogOverlay class="sobreposto"></span>
    </app-dialog>
  `,
})
class HostComponent {}

describe('DialogComponent', () => {
  it('projeta o conteúdo marcado como sobreposição fora do painel animado', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const root: HTMLElement = fixture.nativeElement;

    // O painel é animado com `transform`, o que prenderia um `position: fixed`
    // projetado dentro dele: a sobreposição precisa ser filha do <dialog>.
    expect(root.querySelector('.corpo')?.closest('.dialog__panel')).not.toBeNull();
    expect(root.querySelector('.sobreposto')?.closest('.dialog__panel')).toBeNull();
    expect(root.querySelector('.sobreposto')?.parentElement?.tagName).toBe('DIALOG');
  });
});
