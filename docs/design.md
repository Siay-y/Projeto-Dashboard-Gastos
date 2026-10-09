# Design e acessibilidade

Tokens, temas claro e escuro, decisões de identidade, gestos no celular e o que foi feito por acessibilidade.

[Voltar ao README](../README.md)

---

## Sistema de design

Os tokens vivem em `src/styles/_tokens.scss` como variáveis CSS e são a única
fonte de cor, raio, sombra, espaçamento e motion.

| Grupo | Valores |
| --- | --- |
| Ação | Verde-pinho `#1e5e4b`, com variantes hover, active, soft e um verde profundo para o card herói |
| Acento | Âmbar `#b7791f`, usado com parcimônia: parcelas, mês selecionado, vencimento de hoje |
| Neutros | Quentes, não cinza-puro: fundo `#f5f4f0`, superfície branca, contornos `#e3e1d9` |
| Tema escuro | Mesma estrutura em `:root[data-theme='dark']`: fundo `#131311`, superfície `#1c1c19`, verde clareado `#5eb092` |
| Semânticas | Sucesso, perigo, atenção e informação, cada uma com versão soft |
| Raios | 4, 8, 12 e 16 px |
| Espaçamento | Escala de 4 px (`--space-1` a `--space-16`) |
| Motion | `--ease-standard`, `--ease-emphasized`, durações de 150, 300 e 500 ms |

Decisões de identidade:

- Superfícies usam apenas borda fina. Sombra fica para o que flutua: menu,
  diálogo e o card do primeiro acesso.
- Botões são de cor sólida, sem degradê, e "vêm para frente" 1 px no hover.
- Valores monetários usam o componente `Money`, que separa os centavos em
  tamanho menor e conta do valor anterior ao novo em 700 ms.
- Estados vazios usam ilustrações em linha (SVG) na cor primária com um ponto
  âmbar, em vez de ícone ou emoji.
- O fundo da página é um quadriculado inclinado em SVG com máscara radial.
- Ícones de categoria aparecem na cor do sistema por padrão; a cor da marca só
  entra onde a legibilidade exige (`brandColor`).

### Tema claro e escuro

A escolha fica em **Configurações → Geral → Aparência**: claro, escuro ou
sistema. O `ThemeService` resolve "sistema" pelo `prefers-color-scheme`,
acompanha a mudança do sistema operacional em tempo real e escreve o resultado
em `data-theme` no `<html>`. Por isso o CSS precisa de um bloco só,
`:root[data-theme='dark']`, sem duplicar regras em media query.

Um script de cinco linhas no `index.html` aplica o tema antes do primeiro pixel,
lendo `gastos:theme` direto do `localStorage`. Sem ele, quem usa escuro veria um
flash claro enquanto o bundle carrega. O mesmo script atualiza
`<meta name="theme-color">`, que pinta a barra do navegador no celular.

Três pontos precisaram de tratamento específico no escuro:

- `--color-primary-deep` continua escuro nos dois temas: é a superfície verde do
  card herói, não uma cor de texto.
- Categorias de cor quase preta (Uber, Steam) ficariam invisíveis, então o
  `TileIcon` clareia a cor da marca via `color-mix` sob `:host-context`.
- O vermelho clareia no escuro, então texto sobre ele escurece
  (`--color-on-danger`), senão o contraste cai abaixo do mínimo.

---

## Gestos no celular

A diretiva `appSwipeAction` (`shared/directives/swipe-action.directive.ts`)
implementa ações por deslize sem biblioteca, apenas com `touchstart`,
`touchmove` e `touchend`:

- O eixo é travado nos primeiros 8 px: horizontal vira deslize, vertical segue
  como rolagem normal (`touch-action: pan-y`).
- O item acompanha o dedo 1:1 até 40% da largura (mínimo 72 px) e depois resiste
  como um elástico.
- Ao cruzar o limite, `navigator.vibrate(12)` dispara uma vez e o ícone "arma".
- Soltar antes do limite devolve o item ao centro com curva de mola
  (`cubic-bezier(0.34, 1.56, 0.64, 1)`); soltar armado emite `swipeEdit` ou
  `swipeDelete`, e neste último o item sai da tela antes de o pai removê-lo.

Os fundos coloridos (azul com lápis, vermelho com lixeira) são criados pela
própria diretiva, por isso seus estilos ficam globais em `_swipe.scss`.

---

## Acessibilidade

- Landmarks semânticos e rótulos `aria-label` em regiões, tabelas e grades.
- Diálogos sobre o elemento nativo `<dialog>`: foco preso, `Esc` fecha, clique
  no backdrop fecha.
- Menus com `aria-haspopup`, `role="menu"` e fechamento por `Esc` ou clique fora.
- Filtros e alternadores com `role="radiogroup"` / `role="switch"` e estado
  anunciado.
- Abas no padrão ARIA: `role="tablist"`, seta esquerda e direita com volta nas
  pontas, `Home` e `End`, e só a aba ativa na ordem de tabulação.
- Estados de foco visíveis com `:focus-visible` na cor primária.
- Alvos de toque de no mínimo 40 px; botões principais com 46 px.
- `prefers-reduced-motion: reduce` desliga entradas, count-up, molas do swipe e
  animações de gráfico.
- Ícones decorativos com `aria-hidden`; ícones de marca embutidos como SVG
  inline, sem `<img>` externo.
