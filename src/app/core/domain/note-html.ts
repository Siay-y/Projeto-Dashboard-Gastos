const ALLOWED = new Set(['B', 'I', 'U', 'S', 'BR', 'DIV', 'UL', 'OL', 'LI', 'H3', 'BLOCKQUOTE']);

// Sinônimos que o execCommand produz conforme o navegador, unificados na gravação.
const CANONICAL: Record<string, string> = {
  STRONG: 'B',
  EM: 'I',
  STRIKE: 'S',
  DEL: 'S',
  INS: 'U',
  P: 'DIV',
  H1: 'H3',
  H2: 'H3',
  H4: 'H3',
};

// Removidas com o conteúdo: desembrulhar jogaria o código-fonte no meio do texto.
const DROPPED = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'NOSCRIPT',
  'TEMPLATE',
  'LINK',
  'META',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
]);

const BLOCKS = 'br, div, p, li, ul, ol, h1, h2, h3, h4, blockquote';

const TITLE_MAX = 60;
const EXCERPT_MAX = 180;

/**
 * Reconstrói o HTML com uma lista fechada de tags e sem atributo nenhum. Nada
 * de `style`, `href` ou `on*` chega ao disco, mesmo se for colado de fora.
 */
export function sanitizeNoteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = doc.createElement('div');

  for (const child of Array.from(doc.body.childNodes)) copy(child, out, doc);

  return out.innerHTML.trim();
}

function copy(node: Node, target: Element, doc: Document): void {
  if (node.nodeType === Node.TEXT_NODE) {
    target.appendChild(doc.createTextNode(node.nodeValue ?? ''));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  const raw = element.tagName.toUpperCase();
  if (DROPPED.has(raw)) return;

  const tag = CANONICAL[raw] ?? raw;
  // Tag fora da lista perde a formatação, mas o texto dentro dela continua.
  const host = ALLOWED.has(tag) ? doc.createElement(tag) : target;

  for (const child of Array.from(element.childNodes)) copy(child, host, doc);

  if (host === target) return;
  if (tag === 'BR' || host.childNodes.length) target.appendChild(host);
}

/** Texto puro da anotação, com uma linha por bloco. */
export function noteToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const block of Array.from(doc.body.querySelectorAll(BLOCKS))) {
    block.after(doc.createTextNode('\n'));
  }

  return (doc.body.textContent ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function isNoteEmpty(html: string): boolean {
  return noteToText(html) === '';
}

export function noteExcerpt(html: string, max = EXCERPT_MAX): string {
  const text = noteToText(html).replace(/\n+/g, ' ');
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export function textToNoteHtml(text: string): string {
  if (!text.trim()) return '';

  return text
    .split(/\r?\n/)
    .map(
      (line) => `<div>${line.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char) || '<br>'}</div>`,
    )
    .join('');
}

/** Sem título, a primeira linha do conteúdo vira o título, como no bloco de notas. */
export function deriveNoteTitle(html: string): string {
  const [first = ''] = noteToText(html).split('\n');
  if (!first) return '';

  return first.length > TITLE_MAX ? `${first.slice(0, TITLE_MAX).trimEnd()}…` : first;
}
