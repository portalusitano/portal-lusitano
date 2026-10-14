import { describe, it, expect } from "vitest";
import {
  vistaConversa,
  vistaCabecalho,
  vistaMensagem,
  CHAVES_CONVERSA,
  CHAVES_MENSAGEM,
  CHAVES_CABECALHO,
  COLUNAS_CAVALO,
  COLUNAS_MENSAGEM,
  type LinhaConversa,
} from "@/lib/chat/vista-publica";

/**
 * A promessa que está escrita na página inicial:
 *
 *   «Fale com o vendedor sem publicar o seu número. O contacto só é partilhado
 *    se quiser.»
 *
 * Isto é uma afirmação sobre **respostas de API**. Um telefone que chegue ao
 * JSON já saiu de casa — ninguém precisa de o ver desenhado numa página para o
 * apanhar. Estes testes são o que impede a frase de se tornar falsa sem
 * ninguém dar por isso.
 *
 * ── A chave que se acrescentou ──────────────────────────────────────────────
 *
 * O `outraParteFoto` entrou nas listas `CHAVES_CONVERSA` e `CHAVES_CABECALHO`,
 * e este ficheiro foi actualizado à mão para o deixar entrar. **Isso é o
 * mecanismo a funcionar, não a ser contornado**: a lista existe para que
 * ninguém acrescente um campo sem reparar, e a maneira de acrescentar um é vir
 * aqui escrever porquê e o que se verificou antes de o deixar sair.
 *
 * O que se verificou, e está fixado nos testes abaixo:
 *
 * 1. **O endereço não contém o identificador de ninguém.** Vive debaixo de um
 *    `avatar_prefixo` opaco, sem relação com o `id` da pessoa. Se o caminho
 *    fosse `<user_id>/foto.webp`, esta chave desfazia em silêncio a regra do
 *    «nem os identificadores das pessoas» que já cá estava — e o teste dessa
 *    regra passou a correr também com a fotografia lá dentro.
 * 2. **Continua a não sair contacto nenhum.** O teste dos três contactos
 *    exercita agora as duas vistas com um perfil preenchido.
 * 3. **Sem fotografia é `null`.** Não há avatar por omissão do lado do
 *    servidor, e a ausência é uma resposta e não uma falha.
 * 4. **A mensagem não ganhou a chave**, e o teste que fixa `CHAVES_MENSAGEM`
 *    continua igual. A razão está no `lib/chat/vista-publica`: num fio de duas
 *    pessoas a fotografia é do fio, e repeti-la por mensagem seria o mesmo
 *    endereço trinta vezes por página.
 */

const EU = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";

const CONVERSA: LinhaConversa = {
  id: "bbbbbbbb-0000-0000-0000-000000000001",
  cavalo_id: "aaaaaaaa-0000-0000-0000-000000000001",
  comprador_id: EU,
  vendedor_id: OUTRO,
  comprador_nome: "Maria",
  ultima_mensagem_at: "2026-09-09T10:00:00Z",
  arquivada_comprador: false,
  arquivada_vendedor: true,
};

/**
 * Uma linha de anúncio **como a base a devolveria se alguém escrevesse
 * `select("*")`** — com os três contactos lá dentro. É de propósito que o
 * duplo traz mais do que o `COLUNAS_CAVALO` pede: o que se está a testar é o
 * que acontece no dia em que esse `select` mudar.
 */
const CAVALO_COM_CONTACTOS = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  nome: "Zagalo",
  foto_principal: "/fotos/zagalo.webp",
  preco: 18500,
  status: "ativo",
  vendedor_nome: "Coudelaria da Ribeira",
  vendedor_telefone: "+351 912 345 678",
  vendedor_email: "vendedor@exemplo.pt",
  vendedor_whatsapp: "+351912345678",
} as Record<string, unknown>;

const CONTACTOS = ["+351 912 345 678", "vendedor@exemplo.pt", "+351912345678", "912345678"];

/**
 * O perfil da outra parte, tal como o `lib/perfil/carregar` o devolve.
 *
 * Repare-se no endereço: o primeiro segmento é o `avatar_prefixo`, opaco, e não
 * tem nada do `EU` nem do `OUTRO`. É essa propriedade que os testes abaixo
 * verificam, e é ela que permite que esta chave saia numa resposta de API sem
 * publicar o identificador de ninguém.
 */
const PERFIL = {
  nome: "Ana Sequeira",
  fotografia:
    "https://exemplo.supabase.co/storage/v1/object/public/avatares/" +
    "9f2c41ab77d34e0e8c5b1a6d3e720f48/6b1e0d9a4c7f42e3b8a05d1c9e63f7aa.webp",
};

/** Junta todos os valores de um objecto, por mais fundo que estejam. */
function tudoOQueSaiu(valor: unknown): string {
  return JSON.stringify(valor);
}

describe("o conjunto de chaves é exactamente este", () => {
  it("a conversa da caixa de entrada", () => {
    const vista = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      {
        ultimaMensagem: "Ainda está disponível?",
        porLer: 2,
        perfil: PERFIL,
      },
      EU
    );

    expect(Object.keys(vista).sort()).toEqual([...CHAVES_CONVERSA].sort());
  });

  it("o cabeçalho do fio", () => {
    const vista = vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU, PERFIL);
    expect(Object.keys(vista).sort()).toEqual([...CHAVES_CABECALHO].sort());
  });

  it("a mensagem", () => {
    const vista = vistaMensagem(
      {
        id: "cccccccc-0000-0000-0000-000000000001",
        corpo: "Bom dia",
        created_at: "2026-09-09T10:00:00Z",
        remetente_id: EU,
        lida_at: null,
        entregue_at: "2026-09-09T10:00:01Z",
      },
      EU
    );

    expect(Object.keys(vista).sort()).toEqual([...CHAVES_MENSAGEM].sort());
  });
});

describe("nenhum contacto sai daqui", () => {
  it("mesmo quando a linha do anúncio traz os três", () => {
    const saiu = tudoOQueSaiu([
      vistaConversa(
        CONVERSA,
        CAVALO_COM_CONTACTOS,
        { ultimaMensagem: "olá", porLer: 0, perfil: PERFIL },
        EU
      ),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU, PERFIL),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, OUTRO, PERFIL),
    ]);

    for (const contacto of CONTACTOS) {
      expect(saiu).not.toContain(contacto);
    }
  });

  /**
   * Um endereço de email nunca aparece inteiro, seja de que lado for.
   *
   * O nome que se guarda de um comprador sem `full_name` é a parte local do
   * email — «maria.silva» de «maria.silva@exemplo.pt». Isso é um nome de
   * utilizador, não um contacto: não se lhe pode escrever. O que **não** pode
   * acontecer nunca é o endereço inteiro escapar, e é isso que este teste
   * fixa.
   */
  it("nunca sai um endereço inteiro", () => {
    const comEmailComoNome: LinhaConversa = { ...CONVERSA, comprador_nome: "maria.silva" };
    const saiu = tudoOQueSaiu([
      vistaConversa(
        comEmailComoNome,
        CAVALO_COM_CONTACTOS,
        { ultimaMensagem: null, porLer: 0 },
        OUTRO
      ),
      vistaCabecalho(comEmailComoNome, CAVALO_COM_CONTACTOS, OUTRO),
    ]);

    expect(saiu).not.toContain("@");
  });

  /**
   * O `uuid` de nenhuma das duas pessoas sai na resposta. É o identificador
   * que ligaria uma conversa a tudo o resto que a pessoa faça no site.
   */
  it("nem os identificadores das pessoas", () => {
    const saiu = tudoOQueSaiu([
      vistaConversa(
        CONVERSA,
        CAVALO_COM_CONTACTOS,
        { ultimaMensagem: "olá", porLer: 0, perfil: PERFIL },
        EU
      ),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU, PERFIL),
      vistaMensagem(
        {
          id: "cccccccc-0000-0000-0000-000000000001",
          corpo: "Bom dia",
          created_at: "2026-09-09T10:00:00Z",
          remetente_id: OUTRO,
        },
        EU
      ),
    ]);

    expect(saiu).not.toContain(EU);
    expect(saiu).not.toContain(OUTRO);
  });

  /**
   * O `select` que as rotas usam é uma constante deste módulo justamente para
   * não haver três sítios onde alguém possa acrescentar uma coluna de
   * contacto. Se um dia isso acontecer, falha aqui.
   */
  it("as colunas que se pedem não incluem contactos", () => {
    for (const proibida of ["telefone", "email", "whatsapp"]) {
      expect(COLUNAS_CAVALO).not.toContain(proibida);
      expect(COLUNAS_MENSAGEM).not.toContain(proibida);
    }
  });
});

describe("a fotografia da outra parte", () => {
  it("o endereço não traz o identificador de nenhuma das duas pessoas", () => {
    /* A prova que autoriza esta chave a existir. Se o caminho no balde fosse
       `<user_id>/foto.webp`, o `outraParteFoto` publicava o UUID escrito por
       outras letras — e desfazia em silêncio a regra que o teste «nem os
       identificadores das pessoas» fixa desde o princípio. */
    const vista = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0, perfil: PERFIL },
      EU
    );

    expect(vista.outraParteFoto).toBe(PERFIL.fotografia);
    for (const id of [EU, OUTRO, EU.replace(/-/g, ""), OUTRO.replace(/-/g, "")]) {
      expect(vista.outraParteFoto).not.toContain(id);
    }
  });

  it("sem fotografia é nulo, e não um avatar inventado", () => {
    /* «Quem não tem fotografia não tem fotografia.» O servidor não devolve um
       rectângulo cinzento nem um Gravatar — esse mandaria o email de toda a
       gente para um terceiro. Quem desenha a ausência com iniciais é o ecrã. */
    const semPerfil = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      EU
    );
    const perfilSemFoto = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0, perfil: { nome: "Ana", fotografia: null } },
      EU
    );

    expect(semPerfil.outraParteFoto).toBeNull();
    expect(perfilSemFoto.outraParteFoto).toBeNull();
    expect(vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU).outraParteFoto).toBeNull();
    expect(vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU, null).outraParteFoto).toBeNull();
  });

  it("a mensagem não ganhou a chave", () => {
    /* Um fio tem duas pessoas e só duas: a fotografia é do fio, e repeti-la em
       cada mensagem seria o mesmo endereço trinta vezes por página. Se um dia
       houver conversas de grupo, a chave muda de sítio com uma razão nova — e
       este teste é quem obriga a escrevê-la. */
    const mensagem = vistaMensagem(
      {
        id: "cccccccc-0000-0000-0000-000000000001",
        corpo: "Bom dia",
        created_at: "2026-09-09T10:00:00Z",
        remetente_id: OUTRO,
      },
      EU
    );

    expect(Object.keys(mensagem).sort()).toEqual([...CHAVES_MENSAGEM].sort());
    expect(Object.keys(mensagem)).not.toContain("outraParteFoto");
  });
});

describe("o nome vem do perfil quando a pessoa o escreveu", () => {
  it("o perfil ganha à cópia congelada na conversa", () => {
    /* O `comprador_nome` é uma cópia do instante em que a conversa foi aberta,
       e para quem não tinha nome no registo é a parte local do email. Sem esta
       ordem, a página de perfil era um campo que não faz nada: a pessoa escreve
       «Maria Silva» e continua a aparecer «maria.silva» a quem já lhe falou. */
    const comEmailComoNome: LinhaConversa = { ...CONVERSA, comprador_nome: "maria.silva" };

    const semPerfil = vistaConversa(
      comEmailComoNome,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      OUTRO
    );
    const comPerfil = vistaConversa(
      comEmailComoNome,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0, perfil: PERFIL },
      OUTRO
    );

    expect(semPerfil.outraParte).toBe("maria.silva");
    expect(comPerfil.outraParte).toBe("Ana Sequeira");
  });

  it("um nome de perfil vazio cai na cadeia antiga em vez de escrever nada", () => {
    for (const vazio of [null, "", "   "]) {
      const vista = vistaConversa(
        CONVERSA,
        CAVALO_COM_CONTACTOS,
        { ultimaMensagem: null, porLer: 0, perfil: { nome: vazio, fotografia: null } },
        EU
      );
      expect(vista.outraParte).toBe("Coudelaria da Ribeira");
    }
  });
});

describe("o papel e o estado dependem de quem pergunta", () => {
  it("a mesma conversa lê-se dos dois lados", () => {
    const doComprador = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      EU
    );
    const doVendedor = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      OUTRO
    );

    expect(doComprador.papel).toBe("comprador");
    expect(doComprador.outraParte).toBe("Coudelaria da Ribeira");
    expect(doComprador.arquivada).toBe(false);

    expect(doVendedor.papel).toBe("vendedor");
    expect(doVendedor.outraParte).toBe("Maria");
    expect(doVendedor.arquivada).toBe(true);
  });

  /**
   * Mostrar «entregue» a quem recebeu é dizer-lhe uma coisa que ele já sabe
   * por estar a lê-la. O estado é a resposta à pergunta de quem escreveu.
   */
  it("o estado só vale para quem escreveu", () => {
    const linha = {
      id: "cccccccc-0000-0000-0000-000000000001",
      corpo: "Bom dia",
      created_at: "2026-09-09T10:00:00Z",
      remetente_id: OUTRO,
      lida_at: null,
      entregue_at: null,
    };

    expect(vistaMensagem(linha, OUTRO).estado).toBe("enviada");
    expect(vistaMensagem(linha, EU).estado).toBe("lida");
    expect(vistaMensagem(linha, EU).minha).toBe(false);
  });
});
