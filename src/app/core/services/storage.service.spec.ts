import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

const KEY = STORAGE_KEYS.TRANSACTIONS;

/** Faz `setItem` estourar cota; `includeProbe` derruba também a sondagem inicial. */
function breakWrites(includeProbe = false): void {
  const original = Storage.prototype.setItem;

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (includeProbe || key.startsWith('gastos:')) {
      throw new DOMException('cheio', 'QuotaExceededError');
    }
    original.call(this, key, value);
  });
}

function inject(): StorageService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(StorageService);
}

describe('StorageService: falha de gravação', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('sem falha, não reporta nada', () => {
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);

    expect(storage.failure()).toBeNull();
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('cota estourada é reportada como quota', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);

    expect(storage.failure()).toEqual({ reason: 'quota', seq: 1 });
  });

  it('erro desconhecido é reportado como unknown', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key.startsWith('gastos:')) throw new Error('qualquer outra coisa');
    });
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);

    expect(storage.failure()?.reason).toBe('unknown');
  });

  it('cada falha nova incrementa a sequência', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);
    storage.set(KEY, [{ id: '2' }]);

    expect(storage.failure()?.seq).toBe(2);
  });

  it('o valor continua legível em memória mesmo sem chegar ao disco', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);

    expect(storage.get(KEY)).toEqual([{ id: '1' }]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('a retentativa grava o que havia falhado e limpa o aviso', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);
    expect(storage.failure()).not.toBeNull();

    vi.restoreAllMocks();
    storage.retry();

    expect(storage.failure()).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([{ id: '1' }]);
  });

  it('a retentativa que falha de novo volta a avisar', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);
    storage.retry();

    expect(storage.failure()?.reason).toBe('quota');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('uma gravação bem-sucedida depois da falha limpa o aviso', () => {
    breakWrites();
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);
    vi.restoreAllMocks();
    storage.set(KEY, [{ id: '2' }]);

    expect(storage.failure()).toBeNull();
  });

  it('storage indisponível é reportado na partida', () => {
    breakWrites(true);
    const storage = inject();

    expect(storage.failure()).toEqual({ reason: 'unavailable', seq: 1 });
  });

  it('sem storage, a retentativa não muda nada', () => {
    breakWrites(true);
    const storage = inject();

    storage.set(KEY, [{ id: '1' }]);
    storage.retry();

    expect(storage.failure()?.reason).toBe('unavailable');
  });
});
