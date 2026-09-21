# Meus Gastos | Luiz Santos

Aplicativo de finanças pessoais construído em Angular 22 que roda inteiramente
no navegador: sem cadastro, sem servidor e sem enviar dados para lugar nenhum.
Tudo o que você registra fica no `localStorage` do seu próprio dispositivo.

Registre ganhos e gastos, cadastre contas fixas que entram sozinhas todo mês,
acompanhe compras parceladas que avançam com o calendário, veja o que vence nos
próximos dias e leve seus dados para o Excel quando quiser.

**Aplicação publicada:** <https://dashboard-gastos-flax.vercel.app/>

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Início rápido](#início-rápido)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Regras de negócio](#regras-de-negócio)
- [Sistema de design](#sistema-de-design)
- [Gestos no celular](#gestos-no-celular)
- [Importação e exportação](#importação-e-exportação)
- [Acessibilidade](#acessibilidade)
- [Privacidade](#privacidade)
- [Deploy](#deploy)
- [Convenções de código](#convenções-de-código)
- [Licença](#licença)
- [Contato](#contato)

---

## Visão geral

| Característica | Implementação |
| --- | --- |
| Persistência | `localStorage`, por meio de um único `StorageService` tipado |
| Autenticação | Nenhuma. O primeiro acesso pede apenas um nome para a saudação |
| Detecção de mudanças | Zoneless, sem `zone.js`, com `OnPush` em todos os componentes |
| Estado | Signals do Angular (`signal`, `computed`, `effect`), sem biblioteca externa |
| Roteamento | Rotas lazy com `loadComponent`, guards `CanMatch` e query params como inputs |
| Formulários | Reactive Forms tipados com `FormBuilder.nonNullable` |
| Estilo | SCSS com escopo por componente e tokens em variáveis CSS |
| Animação | Somente CSS: entrada em `fade-in-up`, count-up de valores, mola no swipe |
| Ícones | Material Symbols para interface; logos de marcas do Simple Icons, embutidos |
| Fontes | Inter para texto e Manrope para títulos e valores (Google Fonts) |
| Planilhas | `.xlsx` real, lido e gerado no navegador, com bibliotecas carregadas sob demanda |
| Idioma | Português do Brasil (`LOCALE_ID`, moeda `BRL`) |

### Telas

1. **Primeiro acesso**: pergunta "Como devo te chamar?" e mostra uma prévia do
   painel enquanto o nome é digitado.
2. **Visão geral**: saudação com a data, card herói com o saldo total (informado
   por você) e os próximos vencimentos, cards de ganhos e gastos do mês e uma
   lista de avisos.
3. **Transações**: seção de gastos fixos e histórico agrupado por mês, com
   formulários em diálogo, filtros de parcelas e menu de exportar/importar.
4. **Calendário**: grade do mês com vencimentos e lançamentos marcados por dia,
   e a agenda do dia selecionado.

---

## Funcionalidades

- **Saldo total manual.** O saldo é o que você informa ter no banco; os
  lançamentos não o alteram. O app registra quando foi atualizado e avisa
  quando passa de 30 dias.
- **Renda mensal fixa** somada automaticamente aos ganhos de todo mês, mais
  entradas extras lançadas à parte.
- **Gastos fixos** (assinaturas, aluguel, academia) com dia de cobrança
  opcional. Entram nos gastos de todo mês e podem ser pausados sem apagar.
- **Compras parceladas.** Uma linha no histórico com o progresso (`5/12`). As
  parcelas avançam sozinhas conforme a data; cada mês conta apenas a parcela que
  vence nele. Filtro por "Em andamento" e "Quitadas".
- **Categorias** em grupos (Essenciais, Estilo de vida, Assinaturas, Ganhos) com
  ícone e cor, incluindo marcas como Netflix, Spotify, iFood e Uber.
- **Contas e cartões** (Nubank, Itaú, PicPay, Pix, dinheiro...) associados a
  cada lançamento.
- **Próximos vencimentos** no card herói e **alertas** na visão geral: conta
  vencendo hoje ou amanhã, parcela vencendo, gastos acima dos ganhos, previsão
  de fechar o mês no vermelho, renda não definida, saldo desatualizado.
- **Calendário mensal** com gastos fixos, parcelas, gastos e ganhos por dia.
- **Exportar e importar Excel** para gastos fixos e histórico, com prévia,
  detecção de duplicados e relatório de linhas com problema.
- **Deslizar para editar ou apagar** no celular, com feedback tátil.
- **Responsivo**: sidebar no desktop, barra inferior no celular, diálogos que
  viram folha ou tela cheia conforme o conteúdo.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Angular 22 (standalone, zoneless, sem NgModules) |
| Linguagem | TypeScript 6 com `strict` e `strictTemplates` |
| Estilo | SCSS |
| Build | `@angular/build:application` |
| Ícones de marca | `simple-icons` (paths SVG, importação explícita por marca) |
| Escrita de `.xlsx` | `write-excel-file` (carregada por `import()` ao exportar) |
| Leitura de `.xlsx` | `read-excel-file` (carregada por `import()` ao importar) |
| Formatação | Prettier |

Não há backend, SSR, biblioteca de UI, de estado, de gráficos ou de animação.
O bundle inicial fica em torno de 80 kB transferidos; as bibliotecas de planilha
só são baixadas na primeira exportação ou importação.

---

## Pré-requisitos

- Node.js 20 ou superior
- npm 10 ou superior

---

## Início rápido

```bash
git clone https://github.com/Siay-y/dashboard-gastos.git
cd dashboard-gastos
npm ci
npm start
```

A aplicação fica disponível em `http://localhost:4200/` com recarga automática a
cada alteração no código-fonte.

Para gerar a versão de produção:

```bash
npm run build
```

O resultado é escrito em `dist/projeto-gastos/browser`, pronto para publicação em
qualquer host estático com fallback de SPA.

> **Nota para Windows:** encerre o servidor de desenvolvimento com `Ctrl+C`
> antes de rodar `npm ci`. Um processo `ng serve` ativo mantém trava sobre o
> binário do esbuild e faz a reinstalação falhar com `EPERM`.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm start` | Servidor de desenvolvimento em `localhost:4200` |
| `npm run build` | Build de produção |
| `npm run watch` | Build de desenvolvimento em modo observador |
| `npm test` | Executa o Vitest (o projeto não mantém testes unitários; ver [Convenções](#convenções-de-código)) |
| `npm run ng` | Acesso direto ao Angular CLI |

---

## Estrutura do projeto

```
projeto-gastos/
├── public/
│   └── favicon.svg                 Carteira branca sobre verde
├── src/
│   ├── app/
│   │   ├── core/                   Regras de negócio, sem dependência de UI
│   │   │   ├── constants/          Categorias, contas, rotas e chaves do storage
│   │   │   ├── domain/             Modelos e funções puras (ex.: progresso de parcelas)
│   │   │   ├── guards/             hasUserGuard / noUserGuard
│   │   │   └── services/           Storage, usuário, transações, gastos fixos,
│   │   │                           configurações, previsão, alertas, vencimentos,
│   │   │                           calendário, exportação, importação, preferências
│   │   ├── features/               Uma pasta por tela
│   │   │   ├── onboarding/         Primeiro acesso
│   │   │   ├── dashboard/          Visão geral, rotas filhas e seus componentes
│   │   │   ├── transactions/       Gastos fixos + histórico, formulários e listas
│   │   │   └── calendar/           Calendário mensal
│   │   ├── layout/                 Shell (sidebar, barra inferior) e itens de navegação
│   │   ├── shared/
│   │   │   ├── directives/         appFadeInUp, appSwipeAction
│   │   │   ├── icons/              Registro explícito de marcas do Simple Icons
│   │   │   ├── ui/                 Button, Card, Dialog, Input, Menu, Money,
│   │   │   │                       TileIcon, CollapsibleSection, EmptyState...
│   │   │   └── utils/              Datas e saudação
│   │   ├── app.config.ts           Providers, locale pt-BR e moeda BRL
│   │   ├── app.routes.ts           Onboarding, shell e fallback
│   │   └── app.ts                  Componente raiz
│   ├── styles/
│   │   ├── _tokens.scss            Paleta, raios, sombras, espaçamento, motion, fontes
│   │   ├── _reset.scss             Reset mínimo
│   │   ├── _background.scss        Quadriculado inclinado do fundo
│   │   ├── _typography.scss        Escala tipográfica e Material Symbols
│   │   ├── _animations.scss        fade-in-up e prefers-reduced-motion
│   │   ├── _patterns.scss          Cabeçalho de página
│   │   └── _swipe.scss             Fundos das ações por deslize
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── LICENSE
├── package.json
├── tsconfig.json
└── vercel.json                     Build, fallback de SPA, cache e cabeçalhos
```

A separação segue Clean Architecture em três anéis: `core` não importa nada de
`features` nem de `shared/ui`; `features` compõe serviços do `core` com
componentes do `shared`; `shared` não conhece o domínio além dos modelos.

---

## Arquitetura

### Componentes standalone

Não existe nenhum NgModule. Cada componente declara suas dependências no array
`imports` e usa `ChangeDetectionStrategy.OnPush`. Os templates utilizam apenas o
fluxo de controle nativo (`@if`, `@for`, `@switch`, `@let`).

### Estado com Signals

Cada serviço guarda um `signal` privado com o estado bruto e expõe `computed`
derivados. A persistência é um `effect` que grava no `localStorage` a cada
mudança, então nenhum componente chama "salvar".

| Serviço | Responsabilidade |
| --- | --- |
| `StorageService` | Leitura e escrita tipadas no `localStorage`, com tolerância a JSON inválido e cota excedida |
| `UserService` | Nome do usuário e se já foi identificado |
| `FinanceSettingsService` | Saldo total, data em que foi informado e renda mensal |
| `TransactionService` | Transações, ocorrências mensais e totais do mês |
| `RecurringExpenseService` | Gastos fixos, ativos e total mensal |
| `ForecastService` | Projeção de gastos até o fim do mês |
| `UpcomingService` | Próximos vencimentos de fixos e parcelas |
| `AlertService` | Avisos da visão geral, derivados dos serviços acima |
| `CalendarService` | Eventos e grade de um mês |
| `ExportService` / `ImportService` | Planilhas `.xlsx` |
| `UiPreferencesService` | Seções recolhíveis abertas ou fechadas |

Como o estado é todo derivado, apagar uma transação por deslize no celular
atualiza na mesma passada o card de gastos, os alertas, os vencimentos e o
calendário.

### Persistência

| Chave | Conteúdo |
| --- | --- |
| `gastos:user-profile` | Nome e data do primeiro acesso |
| `gastos:transactions` | Lista de transações |
| `gastos:recurring-expenses` | Lista de gastos fixos |
| `gastos:finance-settings` | Saldo total, `balanceUpdatedAt` e renda mensal |
| `gastos:ui-preferences` | Estado das seções recolhíveis |

Cada serviço tem uma função `migrate` que preenche campos adicionados em versões
posteriores do modelo, para que dados antigos continuem válidos.

### Rotas

| Caminho | Tela | Guard |
| --- | --- | --- |
| `/bem-vindo` | Primeiro acesso | `noUserGuard` |
| `/` | Visão geral | `hasUserGuard` |
| `/transacoes` | Gastos fixos e histórico | `hasUserGuard` |
| `/calendario` | Calendário | `hasUserGuard` |

Os guards são `CanMatchFn` que devolvem `UrlTree`, de modo que a rota errada
nem chega a carregar seu chunk. `withComponentInputBinding` liga query params a
inputs: `/transacoes?novo=1` abre o formulário e `?secao=fixos` expande a seção
correspondente; ambos são removidos da URL depois de aplicados.

---

## Modelo de dados

### `Transaction`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `string` | `crypto.randomUUID()` |
| `type` | `'income' \| 'expense'` | |
| `description` | `string` | |
| `amount` | `number` | Valor **por parcela** quando parcelado |
| `categoryId` | `string` | Id em `core/constants/categories.ts`; ids desconhecidos caem em "Outros" |
| `accountId` | `string \| null` | Id em `core/constants/accounts.ts` |
| `installments` | `number \| null` | `≥ 2` apenas para gastos |
| `date` | `'YYYY-MM-DD'` | Data da compra ou da primeira parcela |
| `createdAt` | ISO 8601 | |

### `RecurringExpense`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `string` | |
| `description` | `string` | |
| `amount` | `number` | Valor mensal |
| `categoryId` | `string` | Só categorias de gasto |
| `accountId` | `string \| null` | |
| `dueDay` | `number \| null` | 1 a 31; `null` quando não importa |
| `active` | `boolean` | Pausado = não conta nos totais |
| `createdAt` | ISO 8601 | |

### `FinanceSettings`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `totalBalance` | `number` | Informado pelo usuário; pode ser negativo |
| `balanceUpdatedAt` | `'YYYY-MM-DD' \| null` | Última vez que o saldo foi informado |
| `monthlyIncome` | `number` | Renda fixa mensal |

---

## Regras de negócio

### Totais do mês

```
Ganhos do mês = renda mensal + entradas lançadas no mês
Gastos do mês = gastos fixos ativos + ocorrências de gasto do mês
```

Uma **ocorrência** é a unidade que os totais somam. Uma compra à vista gera uma
ocorrência na sua data; uma compra parcelada gera uma ocorrência por mês, até o
mês atual, cada uma valendo o valor da parcela. O histórico continua mostrando
uma linha por compra.

### Parcelas

A parcela `k` vence em `data + (k − 1) meses`, no mesmo dia. Quando o mês de
destino é mais curto (31 → fevereiro), cai no último dia. Uma parcela é
considerada paga quando seu vencimento já chegou, então o progresso `5/12`
avança sozinho com a data, sem ação do usuário. A função é pura e está em
`core/domain/installments.ts`.

### Previsão até o fim do mês

Fixos e parcelas do mês são valores conhecidos. Os lançamentos avulsos são
projetados pela média diária do que já foi gasto:

```
média diária        = avulsos até hoje ÷ dia do mês
avulsos projetados  = max(avulsos já lançados, média diária × dias do mês)
gastos previstos    = fixos + parcelas do mês + avulsos projetados
```

A previsão alimenta os alertas "no ritmo atual, o mês fecha no vermelho" e
"os gastos passaram os ganhos".

### Vencimentos e alertas

Gastos fixos usam o dia de cobrança (dia 31 em mês de 30 cai no último dia; se o
dia já passou, vale o mês seguinte). Parcelas usam a data da próxima parcela.
Vencimentos em até três dias viram alerta; vários no mesmo período são
agrupados em um só ("3 gastos fixos vencem nos próximos dias").

---

## Sistema de design

Os tokens vivem em `src/styles/_tokens.scss` como variáveis CSS e são a única
fonte de cor, raio, sombra, espaçamento e motion.

| Grupo | Valores |
| --- | --- |
| Ação | Verde-pinho `#1e5e4b`, com variantes hover, active, soft e um verde profundo para o card herói |
| Acento | Âmbar `#b7791f`, usado com parcimônia: parcelas, mês selecionado, vencimento de hoje |
| Neutros | Quentes, não cinza-puro: fundo `#f5f4f0`, superfície branca, contornos `#e3e1d9` |
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

## Importação e exportação

Disponíveis no menu de três pontos de cada seção em Transações.

### Exportação

Gera um `.xlsx` real (não CSV) com cabeçalho na cor do sistema, primeira linha
congelada, valores em formato de moeda e datas como datas.

| Arquivo | Abas |
| --- | --- |
| `meus-gastos-gastos-fixos-AAAA-MM-DD.xlsx` | **Gastos fixos**: descrição, valor mensal, dia de cobrança, categoria, grupo, conta, situação, cadastrado em; linha final com o total dos ativos |
| `meus-gastos-historico-AAAA-MM-DD.xlsx` | **Histórico**: data, tipo, descrição, categoria, grupo, conta, valor (parcela), parcelas, pagas, restantes, próxima parcela, valor total, situação, cadastrado em. **Por mês**: entradas, gastos, resultado e nº de lançamentos |

Gastos saem negativos e ganhos positivos, então `SOMA` na coluna de valor já dá
o resultado.

### Importação

Aceita o arquivo exportado ou uma planilha feita à mão. As colunas são
localizadas pelo nome do cabeçalho, sem diferenciar acento ou maiúscula.

| Coluna | Obrigatória | Aceita |
| --- | --- | --- |
| Descrição | Sim | Texto |
| Valor | Sim | Número, `R$ 1.234,56`, `-35,9`, `(35,90)` |
| Data | Histórico | Célula de data, `21/09/2026`, `2026-09-21`, serial do Excel |
| Tipo | Não | "Ganho", "Entrada", "Receita" = ganho; qualquer outra coisa = gasto |
| Categoria / Conta | Não | Nome ou id; sem correspondência cai em "Outros" / sem conta |
| Parcelas | Não | Inteiro `≥ 2` |
| Dia de cobrança | Não | 1 a 31 (gastos fixos) |
| Situação | Não | "Pausado" importa o gasto fixo pausado |

Antes de gravar, um diálogo mostra quantos registros entram, quantos já existem
(mesma data, descrição, valor e tipo são ignorados) e quais linhas têm problema,
com o número da linha do Excel e o motivo. Linhas vazias e de "Total" são
puladas.

---

## Acessibilidade

- Landmarks semânticos e rótulos `aria-label` em regiões, tabelas e grades.
- Diálogos sobre o elemento nativo `<dialog>`: foco preso, `Esc` fecha, clique
  no backdrop fecha.
- Menus com `aria-haspopup`, `role="menu"` e fechamento por `Esc` ou clique fora.
- Filtros e alternadores com `role="radiogroup"` / `role="switch"` e estado
  anunciado.
- Estados de foco visíveis com `:focus-visible` na cor primária.
- Alvos de toque de no mínimo 40 px; botões principais com 46 px.
- `prefers-reduced-motion: reduce` desliga entradas, count-up, molas do swipe e
  animações de gráfico.
- Ícones decorativos com `aria-hidden`; ícones de marca embutidos como SVG
  inline, sem `<img>` externo.

---

## Privacidade

- **Nenhum dado sai do dispositivo.** Não há backend, analytics ou requisição a
  API de terceiros. As únicas requisições externas são as fontes do Google Fonts.
- **Nenhuma conta.** O nome informado no primeiro acesso serve só para a
  saudação e pode ser trocado na sidebar.
- **Exportação é o backup.** Como o `localStorage` pertence ao navegador, limpar
  os dados do site apaga tudo. Exporte periodicamente; o arquivo reimporta sem
  duplicar.
- A escrita no `localStorage` é protegida contra cota excedida e modo privado
  restritivo, e JSON corrompido é descartado em vez de derrubar o app.

---

## Deploy

A aplicação é totalmente estática. `npm run build` produz HTML, CSS, JS e
assets em `dist/projeto-gastos/browser`, publicáveis em qualquer host estático.

O ambiente ativo é a Vercel, em
<https://dashboard-gastos-flax.vercel.app/>. O repositório traz um
`vercel.json` pronto: basta importar o projeto na Vercel e publicar, sem
configurar nada no painel.

| Configuração | Valor (já em `vercel.json`) |
| --- | --- |
| Instalação | `npm ci` |
| Comando de build | `npm run build` |
| Diretório de publicação | `dist/projeto-gastos/browser` |
| Framework preset | `null` (estático puro; o arquivo define tudo) |
| Versão do Node | 20 ou superior (`engines` no `package.json`) |
| Fallback de SPA | Rewrite de qualquer caminho para `/index.html`; arquivos existentes têm prioridade |
| Cache | Assets com hash (`*-XXXXXXXX.js/css`) imutáveis por um ano; `index.html` sem cache |
| Cabeçalhos | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS |

O fallback de SPA é obrigatório: diferente de um site de página única com
âncoras, aqui existem rotas reais (`/transacoes`, `/calendario`). Sem ele,
recarregar a página em uma dessas URLs devolveria 404 do host. A Vercel serve
primeiro o que existe em disco (JS, CSS, favicon) e só então aplica o rewrite,
então os assets não são afetados; um caminho desconhecido cai no app, que o
redireciona para a visão geral.

Em outro host estático (Netlify, Cloudflare Pages), reproduza o mesmo
comportamento: Netlify aceita um `_redirects` com `/* /index.html 200`.

Para conferir um deploy:

```bash
curl -s -o /dev/null -w "%{http_code}
" https://dashboard-gastos-flax.vercel.app/calendario   # 200
curl -sI https://dashboard-gastos-flax.vercel.app/ | grep -i x-frame-options                    # DENY
```

---

## Convenções de código

- **Sem NgModules.** Componentes standalone com `imports` explícitos.
- **Fluxo de controle nativo.** Apenas `@if`, `@for`, `@switch` e `@let`.
- **Signals para estado.** `signal`, `computed`, `effect`, `input()`,
  `output()`, `model()`, `viewChild()`.
- **Sem `any`.** `strict`, `strictTemplates`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch` e
  `noPropertyAccessFromIndexSignature` ativos.
- **Nomenclatura em inglês** para código; **textos de interface e comentários
  em português**. Comentário explica o porquê de uma decisão ou de uma
  armadilha contornada, não o que a linha faz.
- **Membros usados apenas no template** marcados como `protected readonly`.
- **Bibliotecas pesadas por `import()` dinâmico**, para não entrar no bundle
  inicial.
- **Sem testes unitários.** Decisão de escopo do projeto: a validação é feita
  pelo build com `strictTemplates` e por verificação manual das telas. A
  infraestrutura do Vitest permanece disponível para quem quiser adicioná-los.
- **Estilos de host via `:host(...)`.** Com encapsulamento emulado, uma classe
  global aplicada ao host perde para `:host {}`; por isso variantes de
  componente usam atributos `data-*` lidos com `:host([data-...])`.

---

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).

Copyright © 2026 Luiz Henrique Porfírio Santos.

---

## Contato

- GitHub: [@Siay-y](https://github.com/Siay-y)
- LinkedIn: [Luiz Henrique Porfírio Santos](https://www.linkedin.com/in/luiz-henrique-porf%C3%ADrio-santos-a8b77229a/)
- E-mail: luiz.porfiriosantos@gmail.com
