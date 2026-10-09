# Meus Gastos | Luiz Santos

Aplicativo de finanças pessoais construído em Angular 22 que roda inteiramente
no navegador: sem cadastro, sem servidor e sem enviar dados para lugar nenhum.
Tudo o que você registra fica no `localStorage` do seu próprio dispositivo.

Registre ganhos e gastos, cadastre contas fixas que entram sozinhas todo mês,
acompanhe compras parceladas que avançam com o calendário, veja o que vence nos
próximos dias e leve seus dados para o Excel quando quiser.

**Aplicação publicada:** <https://dashboard-gastos-flax.vercel.app/>

---

## Visão geral

| Característica | Implementação |
| --- | --- |
| Persistência | `localStorage`, por meio de um único `StorageService` tipado |
| Autenticação | Nenhuma. O primeiro acesso pede apenas um nome para a saudação |
| Proteção local | PIN opcional de 4 dígitos; com ele, os dados são gravados cifrados (AES-GCM) |
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
   por você) e os próximos vencimentos, cards de ganhos e gastos do mês, lista de
   avisos e as barras de orçamento das categorias com limite.
3. **Transações**: seção de gastos fixos e histórico agrupado por mês, com
   formulários em diálogo, filtros de parcelas e menu de exportar/importar.
4. **Calendário**: grade do mês com vencimentos e lançamentos marcados por dia,
   e a agenda do dia selecionado.
5. **Configurações**, em abas: Geral (nome e aparência), Orçamento (limites por
   categoria), Segurança (PIN e código de recuperação) e Dados.
6. **Bloqueio**: pedida do PIN antes de qualquer tela, quando a proteção está ativa.

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
- **Orçamento por categoria.** Um teto mensal opcional por categoria, com barra
  de uso no painel e aviso quando o ritmo de gastos aponta para um estouro antes
  do fim do mês.
- **Contas e cartões** (Nubank, Itaú, PicPay, Pix, dinheiro...) associados a
  cada lançamento, separados em Bancos e Formas de Pagamento.
- **Calculadora** com as quatro operações, porcentagem, teclado físico e um
  botão para copiar o resultado. No desktop é um botão flutuante no canto
  inferior direito e o painel pode ser arrastado pela tela; no celular ela abre
  pela barra superior, em posição fixa, para não cobrir o conteúdo.
- **Próximos vencimentos** no card herói e **alertas** na visão geral: conta
  vencendo hoje ou amanhã, parcela vencendo, gastos acima dos ganhos, previsão
  de fechar o mês no vermelho, categoria acima do limite, renda não definida,
  saldo desatualizado.
- **Calendário mensal** com gastos fixos, parcelas, gastos e ganhos por dia.
- **Exportar e importar Excel** para gastos fixos e histórico, com prévia,
  detecção de duplicados e relatório de linhas com problema.
- **Deslizar para editar ou apagar** no celular, com feedback tátil.
- **PIN opcional** que cifra os dados no aparelho e bloqueia o painel ao abrir.
- **Tema claro, escuro ou do sistema**, aplicado antes do primeiro pixel para
  não piscar branco ao abrir.
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
| `npm test` | Executa os testes com Vitest |
| `npm run ng` | Acesso direto ao Angular CLI |

---

## Documentação

O detalhe de cada parte fica em `docs/`, para este arquivo continuar sendo uma
apresentação:

- [Arquitetura](docs/arquitetura.md): pastas, Signals, rotas, modelo de dados e convenções.
- [Regras de negócio](docs/regras-de-negocio.md): totais do mês, parcelas, previsão, orçamento e planilhas.
- [Design e acessibilidade](docs/design.md): tokens, temas, gestos e acessibilidade.
- [PIN e criptografia](docs/seguranca.md): o que a proteção faz e o que ela não faz.

---

## Deploy

A aplicação é totalmente estática: `npm run build` gera tudo em
`dist/projeto-gastos/browser`, publicável em qualquer host. O repositório traz
um `vercel.json` pronto, com fallback de SPA, cache e cabeçalhos de segurança,
então basta importar o projeto na Vercel. Os detalhes estão em
[docs/deploy.md](docs/deploy.md).

---

## Privacidade

- **Nenhum dado sai do dispositivo.** Não há backend, analytics ou requisição a
  API de terceiros. As únicas requisições externas são as fontes do Google Fonts.
- **Nenhuma conta.** O nome informado no primeiro acesso serve só para a
  saudação e pode ser trocado em Configurações.
- **PIN opcional** cifra os dados em repouso; ver [PIN e criptografia](docs/seguranca.md).
- **Exportação é o backup.** Como o `localStorage` pertence ao navegador, limpar
  os dados do site apaga tudo. Exporte periodicamente; o arquivo reimporta sem
  duplicar.
- A escrita no `localStorage` é protegida contra cota excedida e modo privado
  restritivo, e JSON corrompido é descartado em vez de derrubar o app.

---

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).

Copyright © 2026 Luiz Henrique Porfírio Santos.

---

## Contato

- GitHub: [@Siay-y](https://github.com/Siay-y)
- LinkedIn: [Luiz Henrique Porfírio Santos](https://www.linkedin.com/in/luiz-henrique-porf%C3%ADrio-santos-a8b77229a/)
- E-mail: luiz.porfiriosantos@gmail.com
