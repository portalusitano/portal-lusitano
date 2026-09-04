# O que preciso de si, e o que cada coisa destrava

Este ambiente **não tem rede de saída** — todos os pedidos a servidores de fora
dão 403 antes de saírem. Por isso há um conjunto de coisas que só se resolvem
com um browser, e sem elas partes do sistema de verificação funcionam com
**suposições em vez de factos**. Onde isso acontece, está escrito no código.

Está por ordem: primeiro o que destrava mais, e o que bloqueia o resto.

---

## 1. Os termos da APSL — **respondido a 4 de Setembro de 2026**

> **O `robots.txt` está limpo.** Conteúdo integral, tal como o dono do site o
> leu:
>
> ```
> Sitemap: https://www.cavalo-lusitano.com/sitemap/sitemap.xml
> User-Agent: *
> Disallow: /admin
> ```
>
> A única exclusão é `/admin`. **A página do acesso público ao stud-book não
> está proibida**, e não há regra nenhuma contra consulta automática.
>
> O que isto **não** resolve: o `robots.txt` não são os termos de utilização —
> são documentos diferentes, e o segundo é o que teria uma cláusula sobre uso
> comercial dos dados. Fica por ver o rodapé do site («Termos», «Condições»,
> «Aviso Legal»).
>
> Fica registado que **o sitemap é público e está declarado**. Pode revelar a
> forma dos endereços da pesquisa, e é uma coisa a olhar antes de pedir as
> páginas guardadas do ponto 3.

O que abaixo se escreveu antes de haver resposta, e que continua a valer:

**Antes de mais nada**, e é a única coisa aqui que é uma decisão e não uma
recolha:

- <https://www.cavalo-lusitano.com/robots.txt>
- Os termos de utilização / condições do sítio

**O que procurar:** alguma cláusula que proíba consulta automática, _scraping_,
acesso por programa, ou uso comercial dos dados. No `robots.txt`, se a página
do acesso público está em `Disallow`.

**Se proibirem:** o interruptor fica em baixo e passa-se ao pedido escrito à
APSL. Não é o fim — a `docs/verificacao-documental.md`, secção 8, tem o que
pedir e a quem, e a hipótese que eu proporia primeiro é um **selo partilhado**
(«verificado no stud-book»), que dá crédito à APSL e ao portal e não depende de
uma porta que eles possam fechar.

**Se não proibirem:** o interruptor pode subir, e passamos ao ponto 2.

> **Pergunta à parte, e pode mudar tudo:** é sócio da APSL, ou tem acesso ao
> **acesso privado** ao stud-book? Se tiver, há um caminho melhor do que a
> consulta pública, e provavelmente com termos escritos.

---

## 2. ~~Como o formulário funciona~~ — **respondido, e a resposta é «não se automatiza»**

> A 4 de Setembro de 2026 o dono do site abriu a página e mostrou-a. **Há um
> reCAPTCHA no formulário da consulta.**
>
> O `robots.txt` não proibia nada, mas um CAPTCHA não é uma omissão nem uma
> opinião: é o operador a dizer, na linguagem técnica mais clara que existe,
> que aquele formulário é para pessoas. **Não se contorna**, e o interruptor
> `STUD_BOOK_APSL_ACTIVO` fica em baixo — até haver um acordo, não por falta
> de código.
>
> **E apareceu um caminho melhor:** ao fundo da página lê-se «Powered by Genpro
>
> - Ruralbit». O stud-book corre em software de uma empresa portuguesa de
>   pecuária, não é feito em casa pela APSL. **É a eles e à APSL que se pede**, e
>   quem faz software de genealogia costuma ter uma via de integração porque
>   outros clientes já a pediram.
>
> **Os campos, para registo:** `Nome` · `Criador` · **`NIN / Chip / UELN`** ·
> `Sexo` · `Idade` (intervalo) · `Pelagem` · `Pontuação` · `Título de
Reprodutor`. O `NIN / Chip / UELN` é **um campo só** para os três
> identificadores.
>
> **O que se faz entretanto:** consulta assistida. O registo continua a
> encher-se, mas quem consulta é uma pessoa — um administrador a usar um
> formulário público como qualquer cidadão — e o painel guarda o que ela viu.
> Inteiramente legítimo, e o registo cresce na mesma.

Em <https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book>:

1. Abra as **ferramentas de programador** (F12) e o separador **Rede**
   (_Network_).
2. Faça uma pesquisa por um cavalo qualquer.
3. Na linha do pedido que aparece, botão direito → **Copiar como cURL**.
4. Cole aqui.

**O que isso me diz:** o endereço real, se é GET ou POST, e os nomes dos
parâmetros. É o que preenche a variável `STUD_BOOK_APSL_URL`. Hoje suponho GET;
se for POST, muda uma função.

---

## 3. Páginas de resultado guardadas — **já não urgente**

> Com a consulta automática fora de questão, o analisador de HTML deixou de
> estar no caminho crítico: quem lê a página passa a ser uma pessoa. As páginas
> guardadas só voltam a ser precisas se houver acordo com a APSL/Ruralbit e a
> integração for por HTML em vez de por API.
>
> O que segue fica escrito para esse dia.

**O analisador está escrito contra um formato que nunca ninguém observou.** É a
maior suposição de todo o sistema.

Guarde em **HTML** (Ctrl+S → «Página Web, apenas HTML»). **Não** serve captura
de ecrã, nem PDF, nem copiar-colar o texto: preciso das marcas.

- **Cinco cavalos diferentes** — de preferência com pelagens e datas
  diferentes, e pelo menos um com os pais preenchidos.
- **Uma pesquisa sem resultados** — um número inventado. É esta que separa
  «a APSL não o tem» de «não conseguimos saber», e é a diferença mais
  importante do módulo.
- **Uma pesquisa por microchip** e **uma por UELN**, além das de número de
  registo — para confirmar que os três campos respondem e que a resposta tem a
  mesma forma.
- **Uma página de erro**, se apanhar uma (manutenção, 500). Se não houver, não
  force.

---

## 4. A lista de códigos UELN — destrava a validação do passaporte

<https://www.ueln.net/ueln-code-database/>

Copie a lista e cole aqui (ou guarde a página).

**Porquê:** o UELN tem três blocos — `620` `015` `004471234`. O do meio é o
código da base de dados / stud-book, e **hoje não o validamos** porque não
temos a lista. Com ela, um `620999` passa a ser reconhecido como não sendo base
de dados nenhuma.

**Porque é que não a invento:** um agente tentou extraí-la de resumos de
pesquisa e apanhou-se a **continuar a lista sozinho**, com códigos que nenhuma
fonte citava. Parou e disse-o. Uma lista inventada recusaria passaportes
verdadeiros, que é o erro caro deste sistema.

---

## 5. Um Livro Azul verdadeiro — vale mais do que todos os outros

Um só. **Pode tapar o nome e a morada do dono** — o que preciso é da estrutura,
não dos dados da pessoa.

**Porquê:** o leitor de documentos procura rótulos (`MICROCHIP`, `UELN`, `NOME
DO ANIMAL`, …) que foram **inferidos do que esses documentos costumam
imprimir**, e não copiados de um exemplar. É o ponto mais fraco de tudo o que
está construído, e está escrito no código para ninguém se enganar.

**Um passaporte equino** ao lado seria o par perfeito, pela mesma razão.

E se puder, **um documento de cada tipo que já tenha visto ser recusado** —
um digitalizado torto, um com uma página em falta. É o que permite afinar sem
adivinhar.

---

## 6. Os rótulos oficiais do passaporte — a alternativa ao ponto 5

Se não conseguir um documento real, isto é o segundo melhor:

**Regulamento de Execução (UE) 2021/963, Anexo II**, no EUR-Lex, em
**português e em inglês**. Fixa o modelo do documento de identificação dos
equídeos, secção a secção.

<https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32021R0963>

Copie a lista de campos das secções de identificação. Substituir um vocabulário
inferido por um copiado do regulamento é uma correcção real.

---

## 7. Anúncios e fotografias reais — para medir o que hoje é sintético

Isto é diferente dos outros: não destrava nada, **mede** o que já existe.

- **A tabela `cavalos_venda` tem zero linhas.** Todo o sistema de coerência,
  sinais entre anúncios e ordenação da fila nunca correu sobre um anúncio real.
  Não sei que proporção sairia «segue com nota» — e essa proporção é a medida
  que diz se a fila serve para alguma coisa. Se for alta, a fila não tem frente
  e o sistema não vale nada.
- **As fotografias.** O limiar de semelhança (8) foi medido sobre imagens
  **sintéticas**. Fotografias reais de cavalos castanhos em campos verdes são
  mais parecidas entre si do que as minhas: o piso real será mais baixo. Com
  30 a 50 fotografias reais de anúncios diferentes, remeço a cauda e ajusto —
  ou descubro que 8 é conservador de mais.

Vinte ou trinta anúncios reais, ainda que antigos, mudam isto de «testado» para
«medido».

---

## O que **não** vou fazer, e porquê

**Não descarrego o stud-book da APSL para uma base nossa.** É a base de dados
deles, o Livro Genealógico pertence ao Estado Português, tem nomes e moradas de
criadores lá dentro, e copiá-lo inteiro é um acto diferente de consultar um
cavalo. Levava a um bloqueio e possivelmente pior.

O que está construído dá o mesmo ao fim de algum tempo, e é legítimo: **uma**
consulta por cavalo submetido, guardada para sempre e lida pelo número — por
isso o mesmo cavalo republicado no ano seguinte custa zero pedidos. Ao fim de
umas centenas de anúncios, o portal tem o seu próprio índice, construído do que
consultou de direito.
