# Decisões — Portal Lusitano

Registo das decisões tomadas, para não as voltar a discutir. A mais recente
em cima de cada secção. «Por confirmar» quer dizer que falta um dado ou o OK
do Francisco.

## Decisões do Francisco (fechadas)

- O «OLX do lusitano» **não é um marketplace onde se compra**: é uma ferramenta
  de geração de contactos. O negócio faz-se diretamente entre comprador e
  vendedor.
- O objetivo é uma **empresa de tecnologia** no mundo do lusitano e equestre
  (dados, IA), não só uma conta de Instagram ou um site de anúncios.
- **Verificador de documentação** PSL: os nomes dos campos do passaporte vêm
  do texto oficial do Regulamento (UE) 2021/963, nunca inventados.
- **Stud-book da APSL** só pela via oficial (Ruralbit/Genpro). Não se copia o
  site deles nem se contorna o reCAPTCHA.
- **Referências visuais:** strix.ai (escuro, minimalista, Geist, cartões com
  linhas finas, elementos que aparecem ao rolar) e as animações da
  pixelmatters.com. Adaptar ao mundo do cavalo, não copiar.

## Fase 1 — diagnóstico (2026-11-11)

Decidido:

- **Ordem das receitas:** 1) publicidade no Instagram, já; 2) anúncios grátis
  e validação com 15–20 criadores em 2 semanas; 3) páginas de coudelaria pagas
  aos 3–6 meses. Intermediação internacional só depois, em piloto de 1–3
  vendas. Membership, e-book e merchandising ficam para mais tarde.
- **Trabalho no globo 3D congelado** até haver 50 anúncios ativos. O
  problema do site é falta de oferta, não de tecnologia.
- **Inglês a sério** é a prioridade técnica: páginas próprias em `/en`,
  ligadas às portuguesas por `hreflang`. Hoje `/en` devolve a página em
  português e o `layout.tsx` anuncia `en-US` e `es-ES` que não existem.
- **Corrigir a descrição do site** (`app/layout.tsx`): sai «o maior
  marketplace de cavalos Lusitanos em Portugal» — não é verdade e contradiz a
  decisão de não ser marketplace.
- **Página «Anunciar no Portal Lusitano»** entra na Fase 3.
- **Limpar a raiz do repositório** (notas de sessão, `.bat`, `.ps1`).

Por confirmar (decisão do Francisco):

- Publicar anúncio passa de **79 € para 0 €** no lançamento
  (`lib/listing-tiers.ts`); os 79 € passam a ser um destaque futuro.
  Recomendado.
- **Tabela de publicidade no Instagram** (proposta): story 90 €, pack 3
  stories 220 €, publicação 290 €, carrossel 390 €, reel 490 €, pack
  lançamento 790 €. Exclusividade de setor +30%. 50% adiantado. Primeiro
  cliente: pack lançamento com 25% de desconto de fundador.
- **Metas** a 3/6/12 meses: 1 500 € / 5 000 € / 15 000 € de receita
  acumulada; 40 / 100 / 250 anúncios ativos. Ajustar quando houver dados do
  Insights e do site.
