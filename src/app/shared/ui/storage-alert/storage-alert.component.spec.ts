import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageFailure, StorageService } from '../../../core/services/storage.service';
import { StorageAlertComponent } from './storage-alert.component';

const failure = signal<StorageFailure | null>(null);
const retry = vi.fn();

async function setup(): Promise<ComponentFixture<StorageAlertComponent>> {
  failure.set(null);
  retry.mockReset();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: StorageService, useValue: { failure, retry } as unknown as StorageService },
    ],
  });

  const fixture = TestBed.createComponent(StorageAlertComponent);
  await fixture.whenStable();
  return fixture;
}

const bar = (fixture: ComponentFixture<StorageAlertComponent>) =>
  fixture.nativeElement.querySelector('.bar') as HTMLElement | null;

const text = (fixture: ComponentFixture<StorageAlertComponent>) =>
  bar(fixture)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('StorageAlertComponent', () => {
  it('sem falha, não desenha nada', async () => {
    const fixture = await setup();

    expect(bar(fixture)).toBeNull();
  });

  it('avisa quando o armazenamento está cheio', async () => {
    const fixture = await setup();

    failure.set({ reason: 'quota', seq: 1 });
    await fixture.whenStable();

    expect(bar(fixture)).not.toBeNull();
    expect(text(fixture)).toContain('cheio');
    expect(text(fixture)).toContain('Exporte');
  });

  it('o aviso é anunciado por leitor de tela', async () => {
    const fixture = await setup();

    failure.set({ reason: 'quota', seq: 1 });
    await fixture.whenStable();

    expect(bar(fixture)?.getAttribute('role')).toBe('alert');
  });

  it('oferece retentativa e chama o serviço', async () => {
    const fixture = await setup();

    failure.set({ reason: 'quota', seq: 1 });
    await fixture.whenStable();

    bar(fixture)?.querySelector<HTMLButtonElement>('.bar__action')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('sem storage não oferece retentativa, só informa', async () => {
    const fixture = await setup();

    failure.set({ reason: 'unavailable', seq: 1 });
    await fixture.whenStable();

    expect(text(fixture)).toContain('bloqueando');
    expect(bar(fixture)?.querySelector('.bar__action')).toBeNull();
  });

  it('dispensar esconde o aviso atual', async () => {
    const fixture = await setup();

    failure.set({ reason: 'quota', seq: 1 });
    await fixture.whenStable();

    bar(fixture)?.querySelector<HTMLButtonElement>('.bar__close')?.click();
    await fixture.whenStable();

    expect(bar(fixture)).toBeNull();
  });

  it('uma falha nova reaparece mesmo depois de dispensada', async () => {
    const fixture = await setup();

    failure.set({ reason: 'quota', seq: 1 });
    await fixture.whenStable();
    bar(fixture)?.querySelector<HTMLButtonElement>('.bar__close')?.click();
    await fixture.whenStable();

    failure.set({ reason: 'quota', seq: 2 });
    await fixture.whenStable();

    expect(bar(fixture)).not.toBeNull();
  });
});
