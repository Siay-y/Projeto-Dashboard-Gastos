# PIN e criptografia

Como funciona a proteção opcional por PIN, o código de recuperação e o que ela protege de verdade.

[Voltar ao README](../README.md)

---

A proteção é opcional e fica em **Configurações → Segurança**. Ligada, ela muda o
que vai para o disco e como o app inicia.

## Como funciona

1. O PIN nunca é guardado. Dele deriva-se uma chave com **PBKDF2-SHA256,
   600.000 iterações** e um sal aleatório de 16 bytes, gerado na ativação.
2. Transações, gastos fixos, saldo/renda e o perfil passam a ser gravados como
   envelopes **AES-GCM 256** (`{ v, iv, data }`), com IV novo a cada gravação.
3. Em `gastos:security` ficam o sal, um envelope de verificação e o PIN cifrado
   sob o código de recuperação. É o envelope que valida o PIN, já que a chave
   errada falha na autenticação do AES-GCM.
4. Ao abrir o app, a navegação inicial fica desativada
   (`withDisabledInitialNavigation`) e só é disparada depois do desbloqueio, de
   modo que nenhuma tela chega a ler dados cifrados.
5. Desbloqueado, o `StorageService` decifra tudo para um espelho em memória e
   passa a cifrar as escritas seguintes. "Bloquear agora" recarrega a página,
   que é a forma honesta de voltar ao estado cifrado.

As preferências de interface e a própria configuração de segurança continuam em
texto claro: não revelam nada e precisam ser lidas antes de desbloquear.

## Código de recuperação

Ao definir o PIN, o app sorteia um código no formato `B2D-AC9` e o mostra uma
única vez. São 6 caracteres de um alfabeto de 32 sem `0`, `1`, `I` e `O`, cerca
de um bilhão de combinações, bem mais do que os 10.000 do PIN.

O código não desbloqueia os dados diretamente: dele deriva-se uma segunda chave
(PBKDF2, mesmo custo) que guarda **o próprio PIN** cifrado em `gastos:security`.
Quem acerta o código recebe o PIN de volta e entra por onde entraria sempre.
Nem o PIN nem o código ficam legíveis no disco.

Como o código só existe cifrado, não há como reaproveitá-lo: **definir ou trocar
o PIN sorteia sempre um código novo**, e "Gerar novo código" invalida o anterior
sem mexer na chave dos dados.

## O que isso protege, e o que não protege

Quatro dígitos são 10.000 combinações. As 600.000 iterações tornam cada
tentativa cara o bastante para desencorajar quem tenta na mão, mas um atacante
com acesso ao armazenamento e tempo consegue percorrer o espaço todo. A proteção
é contra **quem pega o aparelho destravado**, não contra análise forense. A
interface diz isso com todas as letras, em vez de prometer segurança que o
formato não entrega.

A única recuperação é o código: o PIN é a chave e não fica guardado em lugar
nenhum. Sem o PIN e sem o código, os dados não voltam, nem por aqui nem por
ninguém; a tela de bloqueio só pode oferecer apagar tudo e recomeçar.

## HTML das anotações

As anotações são o único lugar onde o app guarda HTML e o devolve para o
navegador interpretar, então elas passam por um sanitizador próprio em
`core/domain/note-html.ts`, que **reconstrói** a árvore em vez de filtrar a
original:

- Só sobrevivem `b`, `i`, `u`, `s`, `br`, `div`, `ul`, `ol`, `li`, `h3` e
  `blockquote`, e os sinônimos de cada navegador (`strong`, `em`, `strike`,
  `p`, `h1`) são unificados nessas.
- **Nenhum atributo é copiado.** Não existe `style`, `href`, `class` nem `on*`
  no que vai para o disco.
- `script`, `style`, `iframe`, `svg`, `form` e afins são removidos com o
  conteúdo, para o código-fonte não virar texto visível da anotação.
- Tag fora da lista perde a formatação, mas o texto dentro dela continua.

A limpeza acontece em três momentos: ao colar (o conteúdo de fora entra já
limpo, sem trazer fonte nem cor), ao salvar e ao ler do disco. O último é o que
protege contra um `localStorage` editado à mão.

## Senha própria de uma anotação

O PIN protege o app inteiro e vale tudo ou nada: destravado, tudo fica legível.
Uma anotação de documento pede outra coisa, então ela pode ter **senha própria**,
independente do PIN e usando as mesmas peças (`deriveKey` com PBKDF2-SHA256 de
600.000 iterações, sal novo por anotação, e `seal` com AES-GCM-256).

O que é selado: **conteúdo e checklist**. O que continua visível: título, cor,
lembrete, vínculos e datas. Isso é proposital, porque sem título a anotação
não seria encontrável na lista nem na busca; o preço é que o título não pode
guardar o segredo.

Decisões que a proteção obriga:

- **A chave fica em memória, não a senha.** Ao abrir, o app guarda o `CryptoKey`
  derivado para poder selar de novo ao salvar. Nada reutilizável sobra, e
  recarregar a página esquece tudo.
- **O histórico de versões é apagado ao trancar.** Ele guarda o texto em claro de
  antes, e manter isso ao lado do cofre anularia o cofre. Enquanto a anotação
  está trancada, nenhuma versão nova é criada.
- **Nada de rascunho automático.** O rascunho é gravado em claro no
  `localStorage`; para uma anotação trancada ele simplesmente não é gravado.
- **Sem anexo.** O binário fica no IndexedDB e só é cifrado quando o PIN está
  ativo, então ele ficaria fora do alcance da senha. Em vez de prometer o que a
  implementação não entrega, o app impede trancar uma anotação com comprovante.
- **A exportação sai sem o conteúdo**, apenas com o título e a marca "Trancada".
- **A busca não acha o texto selado**, só o título. É consequência do formato,
  não um descuido: procurar dentro exigiria decifrar tudo.

Não existe recuperação. O código de recuperação do PIN não vale aqui, e o app
não guarda a senha nem um verificador dela: o próprio AES-GCM é autenticado, e
decifrar com a chave errada falha. Perder a senha é perder o conteúdo, e a
interface avisa isso antes de trancar.

## Comprovantes anexados

O binário do anexo não cabe no `localStorage`, que tem poucos megabytes para o
app inteiro, então ele fica no **IndexedDB**. Para não abrir um buraco na
proteção, o anexo acompanha o mesmo ciclo do resto:

- Com PIN ativo, os bytes são cifrados com AES-GCM usando a **mesma chave** dos
  outros dados, por `sealBytes`, que grava o `ArrayBuffer` cru em vez de base64,
  para não inflar o arquivo em um terço.
- Ligar o PIN cifra os anexos que já existiam; desligar devolve todos para
  claro, senão eles ficariam ilegíveis.
- "Apagar todos os dados" limpa o IndexedDB junto com o `localStorage`, e
  excluir uma anotação apaga os anexos dela.

Só imagem e PDF entram, com teto de 5 MB por arquivo. A miniatura usa uma URL
`blob:`, que por isso aparece no `img-src` do CSP. PDF não é exibido na tela:
o botão baixa o arquivo, porque mostrar exigiria afrouxar `object-src`.

## Content Security Policy

Como todos os dados vivem no `localStorage`, um XSS seria a falha mais grave
possível: leria tudo, com PIN ou sem PIN, já que o app mantém o espelho
decifrado em memória. O `vercel.json` define um CSP para fechar essa porta:

| Diretiva | Valor | Por quê |
| --- | --- | --- |
| `default-src` | `'self'` | Nada de origem externa por omissão |
| `script-src` | `'self'` + hash SHA-256 | Só o bundle e o script de tema embutido, por hash. Sem `'unsafe-inline'` |
| `style-src` | `'self' 'unsafe-inline'` + Google Fonts | Ver a ressalva abaixo |
| `font-src` | `'self' https://fonts.gstatic.com` | Os arquivos `.woff2` |
| `img-src` | `'self' data: blob:` | O favicon, os padrões SVG do CSS e a miniatura do comprovante anexado, que vem do IndexedDB como `blob:` |
| `connect-src` | `'self'` | O app não faz nenhuma requisição a terceiros |
| `object-src` | `'none'` | Sem plugin, sem `<embed>` |
| `base-uri` | `'self'` | Impede reescrever o `<base href>` |
| `form-action` | `'self'` | Nenhum formulário posta para fora |
| `frame-ancestors` | `'none'` | Mesma proteção do `X-Frame-Options` |

**A ressalva:** `style-src` precisa de `'unsafe-inline'`. O Angular injeta os
estilos de componente como `<style>` em tempo de execução, e a alternativa
oficial (`ngCspNonce`) exige um nonce gerado por requisição, o que um host
estático não faz. É uma brecha de CSS, não de script: não executa código.

O script de tema do `index.html` é liberado por **hash**, não por nonce, porque
o hash funciona em host estático. O preço é que qualquer alteração naquele
script muda o hash e exige atualizar o `vercel.json`. Para isso não falhar em
silêncio, `npm run check:csp` compara o HTML gerado com o cabeçalho e falha se
o hash não corresponder, se aparecer um handler inline (que nenhum hash cobre)
ou se o HTML passar a referenciar uma origem que o CSP não permite.
