/**
 * O EXIF de uma imagem: que aparelho, quando, com que programa, e onde.
 *
 * ## O que isto é, tecnicamente
 *
 * Um bloco EXIF é um ficheiro TIFF em miniatura enfiado dentro do JPEG, do PNG
 * ou do WebP. Tem uma marca de ordem de bytes, uma lista de entradas com
 * ponteiros para dentro de si próprio, e mais listas apontadas por essas. É um
 * formato com **ponteiros**, e é isso que faz dele o que ele é do ponto de
 * vista de quem o lê: um ficheiro pode mandar-nos ler no byte quatro mil
 * milhões, pode declarar dez mil entradas que não existem, e pode ter uma
 * cadeia de listas que aponta para si mesma.
 *
 * Por isso, e não por gosto de defesa: **todos os deslocamentos são
 * verificados contra o comprimento do bloco antes de se ler um byte**, o número
 * de entradas de cada lista tem tecto, a cadeia de listas tem tecto, e as
 * listas já visitadas ficam num conjunto para que um ciclo não seja um ciclo.
 * Estes bytes vêm de quem envia o documento, e este módulo corre no servidor.
 *
 * ## E o que não se lê
 *
 * A `MakerNote` — o bloco privado que cada fabricante enche com o que quer, em
 * formatos não documentados e diferentes de modelo para modelo. Regista-se que
 * está lá e não se abre. Ler mal um formato secreto dá campos inventados, e um
 * campo inventado num painel de revisão vale menos do que campo nenhum.
 */

import type { CampoDeMetadados } from "./achados";
import { limparCampo } from "./pdf-cru";

/** Uma lista de entradas com mais do que isto não é o EXIF de uma fotografia. */
const MAX_ENTRADAS = 1024;
/** IFD0, Exif, GPS, IFD1 e folga. Além disto é uma cadeia a brincar. */
const MAX_LISTAS = 16;
/** Um valor de texto do EXIF mais longo do que isto é um despejo, não um campo. */
const MAX_BYTES_DE_VALOR = 4096;

const TAMANHO_DO_TIPO: Readonly<Record<number, number>> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

/**
 * As etiquetas que interessam, e mais nenhuma.
 *
 * A lista é curta de propósito. Um EXIF completo tem uma centena de campos —
 * abertura, distância focal, balanço de brancos — que não dizem nada a quem
 * revê o Livro Azul de um cavalo, e um painel com cem linhas é um painel que
 * ninguém lê. Ficam os que respondem a «que aparelho», «quando» e «que
 * programa».
 */
const ETIQUETAS_PRINCIPAIS: Readonly<Record<number, string>> = {
  0x000b: "ProcessingSoftware",
  0x010f: "Make",
  0x0110: "Model",
  0x0112: "Orientation",
  0x0131: "Software",
  0x0132: "DateTime",
  0x013b: "Artist",
  0x8298: "Copyright",
};

const ETIQUETAS_EXIF: Readonly<Record<number, string>> = {
  0x9003: "DateTimeOriginal",
  0x9004: "DateTimeDigitized",
  0xa430: "CameraOwnerName",
  0xa431: "BodySerialNumber",
  0xa433: "LensMake",
  0xa434: "LensModel",
  0xc4a5: "PrintImageMatching",
};

const ETIQUETA_EXIF_IFD = 0x8769;
const ETIQUETA_GPS_IFD = 0x8825;
const ETIQUETA_NOTA_DO_FABRICANTE = 0x927c;
const ETIQUETA_LARGURA = 0xa002;
const ETIQUETA_ALTURA = 0xa003;
const ETIQUETA_MINIATURA = 0x0201;

const GPS_LAT_REF = 0x0001;
const GPS_LAT = 0x0002;
const GPS_LON_REF = 0x0003;
const GPS_LON = 0x0004;
const GPS_ALT_REF = 0x0005;
const GPS_ALT = 0x0006;
const GPS_HORA = 0x0007;
const GPS_DATA = 0x001d;

export interface Coordenadas {
  latitude: number;
  longitude: number;
  altitude?: number;
  dataGps?: string;
}

export interface LeituraExif {
  campos: CampoDeMetadados[];
  coordenadas?: Coordenadas;
  /** A largura e a altura que o EXIF diz que a imagem tinha ao ser captada. */
  medidas?: [number, number];
  temNotaDoFabricante: boolean;
  temMiniatura: boolean;
}

interface Entrada {
  etiqueta: number;
  tipo: number;
  contagem: number;
  /** Onde os bytes do valor começam dentro do bloco. */
  posicao: number;
  bytes: number;
}

/** Uma vista sobre o bloco TIFF que nunca lê fora dele. */
class Bloco {
  constructor(
    private readonly dados: Uint8Array,
    private readonly pequenoPrimeiro: boolean
  ) {}

  get comprimento(): number {
    return this.dados.length;
  }

  cabe(posicao: number, bytes: number): boolean {
    return (
      Number.isSafeInteger(posicao) &&
      Number.isSafeInteger(bytes) &&
      posicao >= 0 &&
      bytes >= 0 &&
      posicao + bytes <= this.dados.length
    );
  }

  u8(posicao: number): number {
    return this.cabe(posicao, 1) ? this.dados[posicao] : 0;
  }

  u16(posicao: number): number {
    if (!this.cabe(posicao, 2)) return 0;
    const [a, b] = [this.dados[posicao], this.dados[posicao + 1]];
    return this.pequenoPrimeiro ? a | (b << 8) : (a << 8) | b;
  }

  u32(posicao: number): number {
    if (!this.cabe(posicao, 4)) return 0;
    const d = this.dados;
    const [a, b, c, e] = [d[posicao], d[posicao + 1], d[posicao + 2], d[posicao + 3]];
    return (
      (this.pequenoPrimeiro
        ? a | (b << 8) | (c << 16) | (e << 24)
        : (a << 24) | (b << 16) | (c << 8) | e) >>> 0
    );
  }

  i32(posicao: number): number {
    return this.u32(posicao) | 0;
  }

  fatia(posicao: number, bytes: number): Uint8Array {
    if (!this.cabe(posicao, bytes)) return new Uint8Array(0);
    return this.dados.subarray(posicao, posicao + bytes);
  }
}

/** As entradas de uma lista, ou nada se a lista não couber no bloco. */
function lerLista(bloco: Bloco, posicao: number): { entradas: Entrada[]; seguinte: number } | null {
  if (!bloco.cabe(posicao, 2)) return null;
  const quantas = bloco.u16(posicao);
  if (quantas === 0 || quantas > MAX_ENTRADAS) return null;
  if (!bloco.cabe(posicao + 2, quantas * 12 + 4)) return null;

  const entradas: Entrada[] = [];
  for (let i = 0; i < quantas; i += 1) {
    const base = posicao + 2 + i * 12;
    const tipo = bloco.u16(base + 2);
    const contagem = bloco.u32(base + 4);
    const tamanho = TAMANHO_DO_TIPO[tipo];
    if (tamanho === undefined) continue;
    // A multiplicação faz-se em vírgula flutuante de propósito: um `contagem`
    // de quatro mil milhões vezes oito transborda em inteiros de 32 bits e daria
    // um comprimento pequeno e plausível para um valor que não existe.
    const bytes = tamanho * contagem;
    if (!Number.isSafeInteger(bytes) || bytes > MAX_BYTES_DE_VALOR) continue;
    const posicaoDoValor = bytes <= 4 ? base + 8 : bloco.u32(base + 8);
    if (!bloco.cabe(posicaoDoValor, bytes)) continue;
    entradas.push({
      etiqueta: bloco.u16(base),
      tipo,
      contagem,
      posicao: posicaoDoValor,
      bytes,
    });
  }

  return { entradas, seguinte: bloco.u32(posicao + 2 + quantas * 12) };
}

function textoDaEntrada(bloco: Bloco, entrada: Entrada): string {
  const bytes = bloco.fatia(entrada.posicao, entrada.bytes);
  let saida = "";
  for (const byte of bytes) {
    if (byte === 0) break;
    saida += String.fromCharCode(byte);
  }
  return limparCampo(saida);
}

function inteiroDaEntrada(bloco: Bloco, entrada: Entrada): number | null {
  if (entrada.tipo === 3) return bloco.u16(entrada.posicao);
  if (entrada.tipo === 4) return bloco.u32(entrada.posicao);
  if (entrada.tipo === 9) return bloco.i32(entrada.posicao);
  if (entrada.tipo === 1 || entrada.tipo === 6) return bloco.u8(entrada.posicao);
  return null;
}

/** Um racional, ou `null` — incluindo o denominador a zero, que é um ficheiro roto. */
function racional(bloco: Bloco, posicao: number, comSinal: boolean): number | null {
  const numerador = comSinal ? bloco.i32(posicao) : bloco.u32(posicao);
  const denominador = comSinal ? bloco.i32(posicao + 4) : bloco.u32(posicao + 4);
  if (denominador === 0) return null;
  const valor = numerador / denominador;
  return Number.isFinite(valor) ? valor : null;
}

function racionaisDaEntrada(bloco: Bloco, entrada: Entrada, quantos: number): number[] | null {
  if (entrada.tipo !== 5 && entrada.tipo !== 10) return null;
  if (entrada.contagem < quantos) return null;
  const valores: number[] = [];
  for (let i = 0; i < quantos; i += 1) {
    const valor = racional(bloco, entrada.posicao + i * 8, entrada.tipo === 10);
    if (valor === null) return null;
    valores.push(valor);
  }
  return valores;
}

/**
 * Uma data do EXIF — `2024:01:15 10:30:00` — em ISO-8601 **sem fuso**.
 *
 * Sem fuso de propósito: o EXIF não guarda nenhum. Acrescentar um `Z` era dizer
 * que a fotografia foi tirada em Greenwich, o que é falso em Portugal metade do
 * ano e a toda a hora em qualquer outro sítio.
 */
export function dataExifParaIso(valor: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(valor.trim());
  if (!m) return null;
  const [, ano, mes, dia, hora, minuto, segundo] = m;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 60) return null;
  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
}

function grausDeGps(partes: readonly number[], referencia: string): number | null {
  const [graus, minutos = 0, segundos = 0] = partes;
  if (!Number.isFinite(graus)) return null;
  const valor = graus + minutos / 60 + segundos / 3600;
  if (!Number.isFinite(valor) || valor > 180) return null;
  const sinal = referencia === "S" || referencia === "W" ? -1 : 1;
  return Number((valor * sinal).toFixed(6));
}

function lerGps(bloco: Bloco, entradas: readonly Entrada[]): Coordenadas | undefined {
  const porEtiqueta = new Map(entradas.map((e) => [e.etiqueta, e]));

  const lat = porEtiqueta.get(GPS_LAT);
  const lon = porEtiqueta.get(GPS_LON);
  if (!lat || !lon) return undefined;

  const partesLat = racionaisDaEntrada(bloco, lat, 3);
  const partesLon = racionaisDaEntrada(bloco, lon, 3);
  if (!partesLat || !partesLon) return undefined;

  const refLat = porEtiqueta.get(GPS_LAT_REF);
  const refLon = porEtiqueta.get(GPS_LON_REF);
  const latitude = grausDeGps(partesLat, refLat ? textoDaEntrada(bloco, refLat) : "N");
  const longitude = grausDeGps(partesLon, refLon ? textoDaEntrada(bloco, refLon) : "E");
  if (latitude === null || longitude === null) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  // Um GPS que nunca chegou a fixar escreve zeros. Não é um sítio.
  if (latitude === 0 && longitude === 0) return undefined;

  const coordenadas: Coordenadas = { latitude, longitude };

  const alt = porEtiqueta.get(GPS_ALT);
  const partesAlt = alt ? racionaisDaEntrada(bloco, alt, 1) : null;
  if (partesAlt) {
    const abaixo = porEtiqueta.get(GPS_ALT_REF);
    const sinal = abaixo && inteiroDaEntrada(bloco, abaixo) === 1 ? -1 : 1;
    coordenadas.altitude = Number((partesAlt[0] * sinal).toFixed(1));
  }

  const data = porEtiqueta.get(GPS_DATA);
  if (data) {
    const texto = textoDaEntrada(bloco, data);
    const m = /^(\d{4}):(\d{2}):(\d{2})$/.exec(texto);
    if (m) {
      const hora = porEtiqueta.get(GPS_HORA);
      const partesHora = hora ? racionaisDaEntrada(bloco, hora, 3) : null;
      const relogio = partesHora
        ? partesHora.map((v) => String(Math.floor(v)).padStart(2, "0")).join(":")
        : "00:00:00";
      coordenadas.dataGps = `${m[1]}-${m[2]}-${m[3]}T${relogio}Z`;
    }
  }

  return coordenadas;
}

const CAMPOS_DE_DATA = new Set(["DateTime", "DateTimeOriginal", "DateTimeDigitized"]);

/**
 * O EXIF de um bloco TIFF.
 *
 * Nunca lança e nunca lê fora do bloco. Um EXIF que não se percebe devolve
 * `null`, e `null` quer dizer «não sei», nunca «não há nada».
 */
export function lerExif(dados: Uint8Array): LeituraExif | null {
  if (dados.length < 8) return null;

  const marca = (dados[0] << 8) | dados[1];
  if (marca !== 0x4949 && marca !== 0x4d4d) return null;
  const bloco = new Bloco(dados, marca === 0x4949);
  if (bloco.u16(2) !== 42) return null;

  const campos: CampoDeMetadados[] = [];
  const vistos = new Set<string>();
  let coordenadas: Coordenadas | undefined;
  let medidas: [number, number] | undefined;
  let temNotaDoFabricante = false;
  let temMiniatura = false;

  const acrescentar = (campo: string, valor: string) => {
    if (!valor || vistos.has(campo)) return;
    vistos.add(campo);
    const iso = CAMPOS_DE_DATA.has(campo) ? dataExifParaIso(valor) : null;
    campos.push(iso ? { campo, valor, iso } : { campo, valor });
  };

  const visitadas = new Set<number>();
  // A cauda de listas por percorrer. A `principal` distingue IFD0 e IFD1 — que
  // trazem os campos do aparelho — das listas Exif e GPS, cujas etiquetas
  // querem dizer outra coisa com os mesmos números.
  const porVer: { posicao: number; especie: "principal" | "exif" | "gps" }[] = [
    { posicao: bloco.u32(4), especie: "principal" },
  ];

  let listas = 0;
  while (porVer.length > 0 && listas < MAX_LISTAS) {
    const alvo = porVer.shift();
    if (!alvo) break;
    if (visitadas.has(alvo.posicao)) continue;
    visitadas.add(alvo.posicao);
    listas += 1;

    const lista = lerLista(bloco, alvo.posicao);
    if (!lista) continue;

    for (const entrada of lista.entradas) {
      if (alvo.especie === "gps") continue;

      if (entrada.etiqueta === ETIQUETA_NOTA_DO_FABRICANTE) {
        temNotaDoFabricante = true;
        continue;
      }
      if (entrada.etiqueta === ETIQUETA_MINIATURA) {
        temMiniatura = true;
        continue;
      }
      if (entrada.etiqueta === ETIQUETA_EXIF_IFD || entrada.etiqueta === ETIQUETA_GPS_IFD) {
        const destino = inteiroDaEntrada(bloco, entrada);
        if (destino !== null && destino > 0 && destino < bloco.comprimento) {
          porVer.push({
            posicao: destino,
            especie: entrada.etiqueta === ETIQUETA_GPS_IFD ? "gps" : "exif",
          });
        }
        continue;
      }

      if (alvo.especie === "exif") {
        if (entrada.etiqueta === ETIQUETA_LARGURA || entrada.etiqueta === ETIQUETA_ALTURA) {
          const valor = inteiroDaEntrada(bloco, entrada);
          if (valor !== null && valor > 0) {
            const [l, a] = medidas ?? [0, 0];
            medidas = entrada.etiqueta === ETIQUETA_LARGURA ? [valor, a] : [l, valor];
          }
          continue;
        }
        const nome = ETIQUETAS_EXIF[entrada.etiqueta];
        if (nome && entrada.tipo === 2) acrescentar(nome, textoDaEntrada(bloco, entrada));
        continue;
      }

      const nome = ETIQUETAS_PRINCIPAIS[entrada.etiqueta];
      if (!nome) continue;
      if (entrada.tipo === 2) {
        acrescentar(nome, textoDaEntrada(bloco, entrada));
      } else {
        const valor = inteiroDaEntrada(bloco, entrada);
        if (valor !== null) acrescentar(nome, String(valor));
      }
    }

    if (alvo.especie === "gps") coordenadas = lerGps(bloco, lista.entradas) ?? coordenadas;

    // A lista seguinte da cadeia é a da miniatura. Só se segue a partir das
    // principais: uma cadeia que saia de dentro do bloco Exif é um ficheiro
    // remendado, e segui-la era ir a onde ele mandasse.
    if (
      alvo.especie === "principal" &&
      lista.seguinte > 0 &&
      lista.seguinte < bloco.comprimento &&
      !visitadas.has(lista.seguinte)
    ) {
      porVer.push({ posicao: lista.seguinte, especie: "principal" });
    }
  }

  if (medidas && (medidas[0] === 0 || medidas[1] === 0)) medidas = undefined;

  if (campos.length === 0 && !coordenadas && !medidas && !temNotaDoFabricante && !temMiniatura) {
    return null;
  }

  return {
    campos,
    ...(coordenadas ? { coordenadas } : {}),
    ...(medidas ? { medidas } : {}),
    temNotaDoFabricante,
    temMiniatura,
  };
}
