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
