import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HTML = 'dist/projeto-gastos/browser/index.html';
const CONFIG = 'vercel.json';

const problems = [];

let html;
try {
  html = readFileSync(HTML, 'utf8');
} catch {
  console.error(`Não achei ${HTML}. Rode "npm run build" antes.`);
  process.exit(1);
}

const csp = readFileSync(CONFIG, 'utf8');
const header = JSON.parse(csp)
  .headers.flatMap((entry) => entry.headers)
  .find((h) => h.key === 'Content-Security-Policy');

if (!header) {
  console.error(`Nenhum Content-Security-Policy em ${CONFIG}.`);
  process.exit(1);
}

const directives = new Map(
  header.value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\s+/);
      return [name, values];
    }),
);

const scriptSrc = directives.get('script-src') ?? [];

if (scriptSrc.includes("'unsafe-inline'")) {
  problems.push("script-src tem 'unsafe-inline': o CSP deixa de proteger contra XSS.");
}

const handlers = html.match(/\son[a-z]+="[^"]*"/g) ?? [];
for (const handler of handlers) {
  problems.push(`Handler inline no HTML, que nenhum hash cobre: ${handler.trim()}`);
}

const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
const hashes = inlineScripts.map(
  (match) => `'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`,
);

for (const hash of hashes) {
  if (!scriptSrc.includes(hash)) {
    problems.push(`Script inline sem hash correspondente em script-src. Esperado: ${hash}`);
  }
}

for (const value of scriptSrc.filter((v) => v.startsWith("'sha256-"))) {
  if (!hashes.includes(value)) {
    problems.push(`Hash em script-src que nenhum script usa mais: ${value}`);
  }
}

const origins = new Set(
  [...html.matchAll(/https:\/\/[a-z0-9.-]+/gi)].map((match) => match[0].toLowerCase()),
);
const allowed = [...directives.values()].flat();

for (const origin of origins) {
  if (!allowed.includes(origin)) {
    problems.push(`Origem externa no HTML que o CSP não permite: ${origin}`);
  }
}

if (problems.length) {
  console.error(`CSP: ${problems.length} problema(s).\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `CSP conferido: ${inlineScripts.length} script(s) inline com hash, ` +
    `${origins.size} origem(ns) externa(s) permitida(s), nenhum handler inline.`,
);
