import {
  deriveNoteTitle,
  isNoteEmpty,
  noteExcerpt,
  noteToText,
  sanitizeNoteHtml,
} from './note-html';

describe('sanitizeNoteHtml', () => {
  it('mantém a formatação que o editor produz', () => {
    const html = '<b>negrito</b> <i>itálico</i> <u>sublinhado</u> <s>riscado</s>';

    expect(sanitizeNoteHtml(html)).toBe(html);
  });

  it('mantém listas, blocos e quebras', () => {
    const html = '<div>linha<br>outra</div><ul><li>a</li></ul><ol><li>b</li></ol>';

    expect(sanitizeNoteHtml(html)).toBe(html);
  });

  it('unifica os sinônimos que cada navegador gera', () => {
    expect(sanitizeNoteHtml('<strong>a</strong>')).toBe('<b>a</b>');
    expect(sanitizeNoteHtml('<em>a</em>')).toBe('<i>a</i>');
    expect(sanitizeNoteHtml('<strike>a</strike>')).toBe('<s>a</s>');
    expect(sanitizeNoteHtml('<del>a</del>')).toBe('<s>a</s>');
    expect(sanitizeNoteHtml('<p>a</p>')).toBe('<div>a</div>');
    expect(sanitizeNoteHtml('<h1>a</h1>')).toBe('<h3>a</h3>');
  });

  it('remove script e companhia junto com o conteúdo', () => {
    expect(sanitizeNoteHtml('antes<script>alert(1)</script>depois')).toBe('antesdepois');
    expect(sanitizeNoteHtml('<style>body{display:none}</style>texto')).toBe('texto');
    expect(sanitizeNoteHtml('<iframe src="https://x.com"></iframe>')).toBe('');
    expect(sanitizeNoteHtml('<svg><script>alert(1)</script></svg>')).toBe('');
    expect(sanitizeNoteHtml('<form><input value="x"></form>')).toBe('');
  });

  it('descarta todo atributo, inclusive manipulador de evento', () => {
    expect(sanitizeNoteHtml('<b onclick="alert(1)">a</b>')).toBe('<b>a</b>');
    expect(sanitizeNoteHtml('<b style="color:red">a</b>')).toBe('<b>a</b>');
    expect(sanitizeNoteHtml('<div class="x" data-y="z">a</div>')).toBe('<div>a</div>');
  });

  it('a imagem com onerror não sobrevive', () => {
    expect(sanitizeNoteHtml('<img src=x onerror="alert(1)">')).toBe('');
  });

  it('tag fora da lista perde a tag e preserva o texto', () => {
    expect(sanitizeNoteHtml('<span style="color:red">texto</span>')).toBe('texto');
    expect(sanitizeNoteHtml('<font face="Arial">texto</font>')).toBe('texto');
    expect(sanitizeNoteHtml('<a href="https://x.com">link</a>')).toBe('link');
    expect(sanitizeNoteHtml('<table><tr><td>cela</td></tr></table>')).toBe('cela');
  });

  it('preserva a formatação dentro de uma tag descartada', () => {
    expect(sanitizeNoteHtml('<span><b>negrito</b></span>')).toBe('<b>negrito</b>');
  });

  it('descarta elemento vazio, menos o br', () => {
    expect(sanitizeNoteHtml('<b></b>texto')).toBe('texto');
    expect(sanitizeNoteHtml('<div><br></div>')).toBe('<div><br></div>');
  });

  it('o resultado de sanitizar duas vezes é o mesmo', () => {
    const once = sanitizeNoteHtml('<p><strong>a</strong><span>b</span></p>');

    expect(sanitizeNoteHtml(once)).toBe(once);
  });

  it('entrada vazia não quebra', () => {
    expect(sanitizeNoteHtml('')).toBe('');
    expect(sanitizeNoteHtml('   ')).toBe('');
  });
});

describe('noteToText', () => {
  it('uma linha por bloco', () => {
    expect(noteToText('<div>um</div><div>dois</div>')).toBe('um\ndois');
    expect(noteToText('um<br>dois')).toBe('um\ndois');
    expect(noteToText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb');
  });

  it('tira a formatação e normaliza o espaço', () => {
    expect(noteToText('<b>a</b> <i>b</i>')).toBe('a b');
    expect(noteToText('a&nbsp;&nbsp;b')).toBe('a b');
  });

  it('texto vazio em marcação vazia', () => {
    expect(noteToText('<div><br></div>')).toBe('');
    expect(noteToText('')).toBe('');
  });
});

describe('isNoteEmpty', () => {
  it('reconhece a anotação sem conteúdo real', () => {
    expect(isNoteEmpty('')).toBe(true);
    expect(isNoteEmpty('<div><br></div>')).toBe(true);
    expect(isNoteEmpty('<b> </b>')).toBe(true);
    expect(isNoteEmpty('<div>a</div>')).toBe(false);
  });
});

describe('noteExcerpt', () => {
  it('junta as linhas numa só', () => {
    expect(noteExcerpt('<div>um</div><div>dois</div>')).toBe('um dois');
  });

  it('corta com reticências no limite', () => {
    const excerpt = noteExcerpt(`<div>${'a'.repeat(200)}</div>`, 10);

    expect(excerpt).toBe(`${'a'.repeat(10)}…`);
  });

  it('não corta o que já cabe', () => {
    expect(noteExcerpt('<div>curto</div>', 10)).toBe('curto');
  });
});

describe('deriveNoteTitle', () => {
  it('usa a primeira linha', () => {
    expect(deriveNoteTitle('<div>Lista de compras</div><div>Arroz</div>')).toBe('Lista de compras');
  });

  it('corta título longo', () => {
    expect(deriveNoteTitle(`<div>${'a'.repeat(100)}</div>`)).toHaveLength(61);
  });

  it('sem conteúdo, devolve vazio', () => {
    expect(deriveNoteTitle('<div><br></div>')).toBe('');
  });
});
