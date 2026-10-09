# Arquitetura e convenções

Como o projeto é organizado: pastas, estado com Signals, rotas, modelo de dados e convenções de código.

[Voltar ao README](../README.md)

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
│   │   │   ├── security/           Derivação de chave e cifragem (Web Crypto)
│   │   │   ├── guards/             hasUserGuard / noUserGuard
│   │   │   └── services/           Storage, usuário, transações, gastos fixos,
│   │   │                           configurações, previsão, orçamento, alertas,
│   │   │                           vencimentos, calendário, exportação, importação,
│   │   │                           segurança, preferências
│   │   ├── features/               Uma pasta por tela
│   │   │   ├── onboarding/         Primeiro acesso
│   │   │   ├── dashboard/          Visão geral, rotas filhas e seus componentes
│   │   │   ├── transactions/       Gastos fixos + histórico, formulários e listas
│   │   │   ├── calendar/           Calendário mensal
│   │   │   ├── settings/          Configurações: perfil, segurança e dados
│   │   │   ├── lock/              Tela de bloqueio (pedida do PIN)
│   │   │   └── not-found/          Página 404
│   │   ├── layout/                 Shell (sidebar, barra inferior) e itens de navegação
│   │   ├── shared/
│   │   │   ├── directives/         appFadeInUp, appSwipeAction
│   │   │   ├── icons/              Registro explícito de marcas do Simple Icons
│   │   │   ├── ui/                 Button, Calculator, Card, Dialog, Input, Menu, Money,
│   │   │   │                       PinInput, StorageAlert, Tabs, TileIcon, EmptyState...
│   │   │   └── utils/              Datas e saudação
│   │   ├── app.config.ts           Providers, locale pt-BR e moeda BRL
│   │   ├── app.routes.ts           Onboarding, shell e página 404
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
| `StorageService` | Leitura e escrita tipadas no `localStorage`; descarta JSON inválido e expõe `failure()` quando a gravação não chega ao disco |
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
| `gastos:budgets` | Limite mensal por categoria (`{ categoria: valor }`) |
| `gastos:finance-settings` | Saldo total, `balanceUpdatedAt` e renda mensal |
| `gastos:ui-preferences` | Estado das seções recolhíveis |
| `gastos:theme` | Tema escolhido: `system`, `light` ou `dark` |
| `gastos:security` | Sais, verificador do PIN e o PIN cifrado sob o código de recuperação |

Cada serviço tem uma função `migrate` que preenche campos adicionados em versões
posteriores do modelo, para que dados antigos continuem válidos.

### Rotas

| Caminho | Tela | Guard |
| --- | --- | --- |
| `/bem-vindo` | Primeiro acesso | `noUserGuard` |
| `/` | Visão geral | `hasUserGuard` |
| `/transacoes` | Gastos fixos e histórico | `hasUserGuard` |
| `/calendario` | Calendário | `hasUserGuard` |
| `/configuracoes` | Configurações | `hasUserGuard` |
| `**` | Página 404, fora do shell | nenhum |

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
  armadilha contornada, não o que a linha faz, e existe só em TypeScript:
  templates e folhas de estilo não levam comentário.
- **Membros usados apenas no template** marcados como `protected readonly`.
- **Bibliotecas pesadas por `import()` dinâmico**, para não entrar no bundle
  inicial.
- **Testes onde o erro é silencioso.** Não há meta de cobertura: o alvo é a
  lógica que quebra sem aparecer na tela. Em primeiro lugar a matemática do
  dinheiro, onde um erro entra como dado válido e contamina o histórico sem
  avisar: progresso de parcelas, totais do mês, previsão, orçamento e o parser
  de planilha (separador decimal, data serial do Excel, duplicados). Depois a
  calculadora, o ciclo do PIN, a falha de gravação e o arrasto da janela.
  Layout e aparência seguem verificados a olho, pelo build com
  `strictTemplates` e pelo navegador.
- **Estilos de host via `:host(...)`.** Com encapsulamento emulado, uma classe
  global aplicada ao host perde para `:host {}`; por isso variantes de
  componente usam atributos `data-*` lidos com `:host([data-...])`.
