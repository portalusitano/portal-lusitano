# Banco de ensaio do perfil

Serve para medir a fotografia de perfil e o que ela custa à caixa de entrada.

## O que é verificado e o que é substituto

Três coisas diferentes, e a distinção importa — o `CLAUDE.md` conta o que
custou passar um stub de mão em mão como se fosse a base verdadeira.

| peça                                  | o que é                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **os pixels** das fotografias         | **reais** — saem de `public/images/optimized`, fotografias tiradas para este site                                             |
| a moldura (12/48 MP, orientação, GPS) | fabricada, e de propósito: é a gama que um telemóvel entrega                                                                  |
| as pessoas e as conversas             | **substituto inteiro** — vêm do `scratchpad/chat-ensaio`, que diz de si próprio o que é                                       |
| a base de dados das provas de RLS     | **PostgreSQL a sério**, local (`__tests__/lib/perfil-rls.sql.test.ts`)                                                        |
| o armazenamento                       | substituto em memória dentro do `chat-ensaio/servidor.mjs`; as **políticas** do balde provam-se contra o PostgreSQL, não aqui |

O que este banco **não** pode decidir: como se comprime uma cara. Ninguém aqui
tem fotografias de perfil de pessoas verdadeiras, e um retrato tem estatística
própria — pele lisa, um plano só de foco. O número medido é um tecto plausível
e não a mediana do produto.

## Correr

```bash
# 1. as fotografias (7,8 MB, não vão para o repositório — ver .gitignore)
node scratchpad/perfil-ensaio/gerar.mjs

# 2. o lado do quadrado, se for preciso rediscutir os 256
node scratchpad/perfil-ensaio/medir-lado.mjs

# 3. o custo da caixa de entrada, A/B intercalado contra o PostgreSQL local
node scratchpad/perfil-ensaio/medir-caixa-entrada.mjs

# 4. a migração, aplicada duas vezes, com as provas
sh scratchpad/perfil-ensaio/aplicar.sh

# 5. ponta a ponta, contra o site a correr
#    (porta própria: outro agente pode ter o banco do chat na 54992)
PORTA=54996 node scratchpad/chat-ensaio/servidor.mjs &
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54996 npx next build
sh scratchpad/perfil-ensaio/servir.sh &
BANCO=http://127.0.0.1:54996 SITIO=http://127.0.0.1:3100 \
  node scratchpad/perfil-ensaio/ponta-a-ponta.mjs
```

## Os números que daqui saíram

- **A fotografia**: 1 765 894 → 17 948 bytes, **98×**, medido ponta a ponta
  contra o site a correr. À saída: WebP 256×256, zero bytes de EXIF, zero
  ocorrências de `Apple`, `iPhone`, `GPS` ou `Exif` nos bytes.
- **O lado do quadrado**: 128→5 040, 192→10 148, **256→17 k**, 320→23 992,
  512→53 958 bytes. O degrau para 320 custa 44% mais bytes para pixels que
  ninguém vê a 128 CSS.
- **A caixa de entrada**: 30 conversas, 5 000 contas. Uma pergunta por conversa
  3,23–3,40 ms contra 0,26–0,29 ms para uma pergunta só — **11 a 13×**, com a
  pergunta única a ganhar em **30 de 30 pares** nas três corridas. Está escrito
  como intervalo porque três corridas deram 13,0×, 11,3× e 12,0×: a variância
  entre corridas é maior do que a precisão que um número único aparenta.
- **A migração**: 20 provas, 0 falhas, aplicada duas vezes. E o braço «antes»
  reproduz o defeito — sem ele, o «depois» provava que a base recusa hoje mas
  não que alguma vez aceitou.
- **Ponta a ponta**: 32 de 32.
