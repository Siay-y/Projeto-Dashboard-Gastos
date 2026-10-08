// Patamar da OWASP para PBKDF2-SHA256: encarece adivinhar o PIN.
const ITERATIONS = 600_000;
const IV_BYTES = 12;
const SALT_BYTES = 16;

// Sem 0, 1, I e O: o código é anotado à mão.
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_GROUP = 3;
const CODE_GROUPS = 2;

export const RECOVERY_CODE_LENGTH = CODE_GROUP * CODE_GROUPS;

export interface Envelope {
  v: 1;
  iv: string;
  data: string;
}

export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

export function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<Envelope>;
  return e.v === 1 && typeof e.iv === 'string' && typeof e.data === 'string';
}

export function randomSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/** Formato `B2D-AC9`. */
export function randomRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_CODE_LENGTH));
  // 256 é múltiplo de 32: a máscara não enviesa o sorteio.
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]);

  return Array.from({ length: CODE_GROUPS }, (_, i) =>
    chars.slice(i * CODE_GROUP, (i + 1) * CODE_GROUP).join(''),
  ).join('-');
}

export function normalizeRecoveryCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function deriveKey(pin: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, value: unknown): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);

  return { v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(sealed)) };
}

// AES-GCM é autenticado: com a chave errada isto lança, e é assim que o PIN é validado.
export async function unseal<T>(key: CryptoKey, envelope: Envelope): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
    key,
    fromBase64(envelope.data),
  );

  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

function toBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// `Uint8Array<ArrayBuffer>`: a Web Crypto não aceita views sobre SharedArrayBuffer.
function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
