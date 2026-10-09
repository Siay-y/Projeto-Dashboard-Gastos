# Regras de negócio

As contas que o app faz: totais do mês, parcelas, previsão, orçamento por categoria e o formato das planilhas.

[Voltar ao README](../README.md)

---

## Totais do mês

```
Ganhos do mês = renda mensal + entradas lançadas no mês
Gastos do mês = gastos fixos ativos + ocorrências de gasto do mês
```

Uma **ocorrência** é a unidade que os totais somam. Uma compra à vista gera uma
ocorrência na sua data; uma compra parcelada gera uma ocorrência por mês, até o
mês atual, cada uma valendo o valor da parcela. O histórico continua mostrando
uma linha por compra.

## Parcelas

A parcela `k` vence em `data + (k − 1) meses`, no mesmo dia. Quando o mês de
destino é mais curto (31 → fevereiro), cai no último dia. Uma parcela é
considerada paga quando seu vencimento já chegou, então o progresso `5/12`
avança sozinho com a data, sem ação do usuário. A função é pura e está em
`core/domain/installments.ts`.

## Previsão até o fim do mês

Fixos e parcelas do mês são valores conhecidos. Os lançamentos avulsos são
projetados pela média diária do que já foi gasto:

```
média diária        = avulsos até hoje ÷ dia do mês
avulsos projetados  = max(avulsos já lançados, média diária × dias do mês)
gastos previstos    = fixos + parcelas do mês + avulsos projetados
```

A previsão alimenta os alertas "no ritmo atual, o mês fecha no vermelho" e
"os gastos passaram os ganhos".

## Orçamento por categoria

Cada categoria de gasto aceita um teto mensal, guardado em `gastos:budgets`. O
uso soma tudo que pesa naquela categoria no mês: gastos fixos ativos, parcelas
que vencem no mês e lançamentos avulsos. A projeção usa a mesma fórmula da
previsão, aplicada só à categoria:

```
usado      = fixos + parcelas do mês + avulsos
projetado  = fixos + parcelas do mês + max(avulsos, média diária × dias do mês)
```

Daí saem três estados: `ok`, `near` a partir de 80% do limite e `over` acima
dele. Quando o uso ainda cabe no limite mas a projeção não, a barra ganha a
faixa listrada da previsão e o alerta "no ritmo atual, X estoura o limite".
Sem nenhum limite definido, nada disso aparece no painel.

## Vencimentos e alertas

Gastos fixos usam o dia de cobrança (dia 31 em mês de 30 cai no último dia; se o
dia já passou, vale o mês seguinte). Parcelas usam a data da próxima parcela.
Vencimentos em até três dias viram alerta; vários no mesmo período são
agrupados em um só ("3 gastos fixos vencem nos próximos dias").

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
