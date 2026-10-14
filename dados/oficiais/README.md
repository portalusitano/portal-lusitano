# Dados oficiais

Ficheiros que vieram de fontes externas e que este repositório não consegue ir
buscar sozinho: **a rede de saída do ambiente onde este código é escrito está
fechada**, e todos os pedidos a servidores de fora dão 403 antes de sairem.

Foram trazidos à mão pelo dono do site, a 5 de Setembro de 2026, e é isso que
os torna factos em vez de suposições. O que antes se inferia — os rótulos que
um passaporte imprime, que código pertence a que stud-book — passou a estar
aqui, copiado da fonte.

**O que ninguém verificou:** eu não abri o EUR-Lex nem o `ueln.net`. O que está
nestes ficheiros é a transcrição de quem os abriu. Se um dia uma discrepância
aparecer, é aqui que se olha primeiro.

---

## `passaporte-anexo-ii.csv`

Os rótulos impressos no documento de identificação dos equídeos, secção a
secção, em **francês, inglês e português**, com a referência ao item do anexo.

Fonte: **Regulamento de Execução (UE) 2021/963, Anexo II**, no EUR-Lex.

Serve o leitor de documentos (`lib/documentos/leitura/`), que até aqui
procurava rótulos **inferidos do que esses documentos costumam imprimir** — era
o ponto mais fraco de todo o sistema de verificação, e estava escrito no código
para ninguém se enganar.

As linhas da Secção V trazem `(não impresso em francês)`: essa secção é o
certificado zootécnico e não aparece nas três línguas no mesmo documento.

## `ueln-bases.csv`

O bloco do meio de um UELN — `620` **`003`** `004471234` — é o código da base de
dados ou do stud-book que emitiu o número. 720 códigos, com a organização a que
pertencem.

Fonte: **base de códigos UELN**, em `ueln.net`.

**O código da APSL é `620003`.** Vale a pena escrevê-lo porque antes de estes
dados chegarem tinha-se suposto `620015`, e um agente que tentou extrair a
lista de resumos de pesquisa apanhou-se a inventar códigos e parou. Se o
palpite tivesse sido escrito, o site estaria hoje a recusar passaportes
verdadeiros.

Outros que interessam a um portal de Lusitanos:

| Código   | Organização                                                                  |
| -------- | ---------------------------------------------------------------------------- |
| `620001` | Direção-Geral de Alimentação e Veterinária (quem atribui o UELN em Portugal) |
| `620003` | **APSL** — Associação Portuguesa de Criadores do Cavalo Puro Sangue Lusitano |
| `076005` | ABPSL — Brasil                                                               |
| `826081` | Lusitano Breed Society of Great Britain                                      |
| `840052` | United States Lusitano Association                                           |
| `752008` | Svenska Lusitanosällskapet                                                   |
| `056004` | Association Belge des Éleveurs de Chevaux Lusitaniens                        |

### O que foi mudado em relação ao que a fonte devolveu

A coluna `queried_country` **não é o país do código**: é o país cuja consulta
devolveu aquela organização. Por isso a fonte lista o mesmo código sob vários
países — `036004` (Austrália) aparecia também sob a Coreia, a Tailândia, a
Malásia, Singapura, Taiwan, a Indonésia, as Filipinas, o Vietname e o Brunei;
`056001` (Bélgica) aparecia sob a Bósnia, o Montenegro e a Macedónia.

**Essas repetições foram tiradas**, ficando a linha do país cujo código ISO
bate com os três primeiros algarismos. Nenhuma organização se perdeu: as
repetições traziam sempre o mesmo nome, e há uma verificação que falha se
alguma vez dois países derem nomes diferentes ao mesmo código.

Sobra uma repetição de propósito — `124CAN`, sob o Canadá e sob os Estados
Unidos, com o mesmo nome — para o gerador continuar a provar que sabe lidar
com ela.

**Quem decide o país é o código, e nunca esta coluna.** O gerador lê os três
primeiros algarismos, que é o que a norma manda.
