"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Avatar from "./Avatar";
import { ACEITA, validarDimensoes, validarFicheiro, type CodigoDeRecusa } from "./ficheiro";
import { abrirFotografia, recortarParaBlob, type Fase, type FotografiaAberta } from "./desenhar";
import { apagarFotografia, gravarFotografia, ErroDePerfil, type Perfil } from "./api";
import {
  deslocar,
  limitarEnquadramento,
  ENQUADRAMENTO_INICIAL,
  ZOOM_MAX,
  ZOOM_MIN,
  type Enquadramento,
} from "./recorte";
import { esquecerPerfil } from "./useRetratoProprio";

/**
 * Pôr, trocar e apagar a fotografia de perfil.
 *
 * ── Este componente não é descarregado por quem não o abre ────────────────
 *
 * Vive atrás de um `next/dynamic` no `RetratoDaConta`. É o único sítio deste
 * ramo com trabalho de canvas, e a razão é o pedido do dono: o site não pode
 * ficar mais pesado para quem nunca abre o chat — nem, pela mesma lógica, para
 * quem nunca troca de fotografia.
 *
 * ── O recorte não é só com rato ───────────────────────────────────────────
 *
 * É metade da razão para não haver aqui uma biblioteca. As de recorte que se
 * usam para isto pesam dezenas de KiB e resolvem o **gesto**; o teclado, nas
 * que o têm, é um atalho por cima do gesto. Aqui são duas afirmações
 * independentes do mesmo enquadramento:
 *
 * - o **quadrado** recebe foco e as setas deslocam-no, com `Shift` para um
 *   passo grande e `Home` para recomeçar;
 * - a **ampliação** é um `<input type="range">`, que é um comando com valor,
 *   nativamente operável por teclado, e que diz o número em voz alta ao ser
 *   mudado.
 *
 * Quem usa o rato arrasta; quem não usa tem os dois comandos completos, e não
 * uma versão reduzida do que os outros têm.
 *
 * ── Os erros dizem o passo seguinte ───────────────────────────────────────
 *
 * Nenhuma frase deste ecrã é «erro». Cada recusa tem um código
 * (`ficheiro.ts`), e cada código tem uma frase nas três línguas que diz o que
 * fazer: guardar noutro formato, escolher uma mais pequena, voltar a entrar.
 */

interface Props {
  perfil: Perfil | null;
  nomeParaIniciais: string | null;
  onFechar: () => void;
  onGravado: (p: Perfil) => void;
}

/** O lado do quadrado de recorte, em pixéis de ecrã. Cabe a 390 de largura. */
const LADO_PALCO = 260;

type Estado =
  | { passo: "escolher" }
  | { passo: "a-abrir"; fase: Fase }
  | { passo: "recortar"; foto: FotografiaAberta }
  | { passo: "a-gravar"; fase: Fase; fraccao: number };

export default function EditorAvatar({ perfil, nomeParaIniciais, onFechar, onGravado }: Props) {
  const { t } = useLanguage();
  const tp = t.perfil;

  const [estado, setEstado] = useState<Estado>({ passo: "escolher" });
  const [enq, setEnq] = useState<Enquadramento>(ENQUADRAMENTO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [aApagar, setAApagar] = useState(false);

  const idDica = useId();
  const foto = estado.passo === "recortar" ? estado.foto : null;

  /* Uma fotografia aberta é memória de vídeo e um `ObjectURL`; largam-se os
     dois quando o componente sai, senão ficam presos até a aba fechar. */
  const abertaRef = useRef<FotografiaAberta | null>(null);
  abertaRef.current = foto;
  useEffect(() => () => abertaRef.current?.largar(), []);

  const frase = useCallback(
    (
      codigo: CodigoDeRecusa | "rede" | "sessao" | "servidor" | "indisponivel",
      detalhe?: string
    ) => {
      const base = (tp.erro as Record<string, string>)[codigo] ?? tp.erro.servidor;
      return detalhe ? base.replace("{detalhe}", detalhe) : base;
    },
    [tp.erro]
  );

  const escolher = useCallback(
    async (ficheiro: File | undefined) => {
      setErro(null);
      if (!ficheiro) return;

      const v = validarFicheiro(ficheiro);
      if (!v.ok) {
        setErro(frase(v.codigo, v.detalhe));
        return;
      }

      setEstado({ passo: "a-abrir", fase: "a-ler" });
      try {
        const aberta = await abrirFotografia(ficheiro, (fase) =>
          setEstado((e) => (e.passo === "a-abrir" ? { passo: "a-abrir", fase } : e))
        );
        const d = validarDimensoes(aberta.largura, aberta.altura);
        if (!("ok" in d) || d.ok !== true) {
          aberta.largar();
          setEstado({ passo: "escolher" });
          setErro(
            frase((d as { codigo: CodigoDeRecusa }).codigo, (d as { detalhe?: string }).detalhe)
          );
          return;
        }
        setEnq(ENQUADRAMENTO_INICIAL);
        setEstado({ passo: "recortar", foto: aberta });
      } catch {
        setEstado({ passo: "escolher" });
        setErro(frase("ilegivel"));
      }
    },
    [frase]
  );

  const gravar = useCallback(async () => {
    if (!foto) return;
    setErro(null);
    setEstado({ passo: "a-gravar", fase: "a-recortar", fraccao: 0 });
    try {
      const blob = await recortarParaBlob(foto, enq, (fase) =>
        setEstado((e) => (e.passo === "a-gravar" ? { ...e, fase } : e))
      );
      setEstado({ passo: "a-gravar", fase: "a-enviar", fraccao: 0 });
      const novo = await gravarFotografia(blob, {
        aoProgredir: (f) => setEstado((e) => (e.passo === "a-gravar" ? { ...e, fraccao: f } : e)),
      });
      foto.largar();
      esquecerPerfil(novo);
      onGravado(novo);
      onFechar();
    } catch (e) {
      setEstado({ passo: "recortar", foto });
      setErro(e instanceof ErroDePerfil ? frase(e.codigo, e.detalhe) : frase("servidor"));
    }
  }, [enq, foto, frase, onFechar, onGravado]);

  const apagar = useCallback(async () => {
    setErro(null);
    setAApagar(true);
    try {
      const novo = await apagarFotografia();
      esquecerPerfil(novo);
      onGravado(novo);
      onFechar();
    } catch (e) {
      setErro(e instanceof ErroDePerfil ? frase(e.codigo, e.detalhe) : frase("servidor"));
    } finally {
      setAApagar(false);
    }
  }, [frase, onFechar, onGravado]);

  /* ── O enquadramento pelo teclado ─────────────────────────────────────── */
  const aoTeclar = useCallback(
    (e: React.KeyboardEvent) => {
      if (!foto) return;
      const grande = e.shiftKey;
      const passo = grande ? 24 : 6;
      const fonte = { largura: foto.largura, altura: foto.altura };
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowLeft":
          dx = passo;
          break;
        case "ArrowRight":
          dx = -passo;
          break;
        case "ArrowUp":
          dy = passo;
          break;
        case "ArrowDown":
          dy = -passo;
          break;
        case "Home":
          e.preventDefault();
          setEnq(ENQUADRAMENTO_INICIAL);
          return;
        case "+":
        case "=":
          e.preventDefault();
          setEnq((a) => limitarEnquadramento(fonte, { ...a, zoom: a.zoom + 0.25 }));
          return;
        case "-":
          e.preventDefault();
          setEnq((a) => limitarEnquadramento(fonte, { ...a, zoom: a.zoom - 0.25 }));
          return;
        default:
          return;
      }
      e.preventDefault();
      setEnq((a) => deslocar(fonte, a, dx, dy, LADO_PALCO));
    },
    [foto]
  );

  /* ── E pelo arrasto ───────────────────────────────────────────────────── */
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const aoDescer = (e: React.PointerEvent) => {
    if (!foto) return;
    arrasto.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const aoMover = (e: React.PointerEvent) => {
    if (!foto || !arrasto.current) return;
    const dx = e.clientX - arrasto.current.x;
    const dy = e.clientY - arrasto.current.y;
    arrasto.current = { x: e.clientX, y: e.clientY };
    setEnq((a) => deslocar({ largura: foto.largura, altura: foto.altura }, a, dx, dy, LADO_PALCO));
  };
  const aoSubir = () => {
    arrasto.current = null;
  };

  /* A fotografia no palco: `cover` a zoom 1, e o ponto `centro` no meio. */
  const escala = foto ? (LADO_PALCO * enq.zoom) / Math.min(foto.largura, foto.altura) : 1;
  const estiloFoto = foto
    ? {
        width: `${foto.largura * escala}px`,
        height: `${foto.altura * escala}px`,
        transform: `translate(${LADO_PALCO / 2 - enq.centro.x * foto.largura * escala}px, ${
          LADO_PALCO / 2 - enq.centro.y * foto.altura * escala
        }px)`,
      }
    : undefined;

  const aTrabalhar = estado.passo === "a-abrir" || estado.passo === "a-gravar";
  const fase = estado.passo === "a-abrir" || estado.passo === "a-gravar" ? estado.fase : null;

  return (
    <div className="perfil-editor cartao">
      <div className="flex items-center justify-between gap-3">
        <span className="rotulo">{tp.editor_titulo}</span>
        <button
          type="button"
          onClick={onFechar}
          aria-label={tp.fechar}
          className="chat-atalho -mr-2"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {estado.passo === "recortar" && foto ? (
        <>
          {/* ── O quadrado ────────────────────────────────────────────────
              `role="group"` e não `application`: o que aqui há são comandos
              de teclado sobre uma coisa que se vê, e não um widget que
              reclame o teclado todo. */}
          <div
            role="group"
            tabIndex={0}
            aria-label={tp.recorte_rotulo}
            aria-describedby={idDica}
            onKeyDown={aoTeclar}
            onPointerDown={aoDescer}
            onPointerMove={aoMover}
            onPointerUp={aoSubir}
            onPointerCancel={aoSubir}
            className="perfil-recorte"
            style={{ width: LADO_PALCO, height: LADO_PALCO }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt=""
              draggable={false}
              style={estiloFoto}
              className="perfil-recorte__foto"
            />
            <span className="perfil-recorte__mascara" aria-hidden="true" />
          </div>

          <p id={idDica} className="vc-nota">
            {tp.recorte_dica}
          </p>

          <label className="perfil-zoom">
            <span className="rotulo">{tp.ampliar}</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.05}
              value={enq.zoom}
              aria-valuetext={`${Math.round(enq.zoom * 100)}%`}
              onChange={(e) =>
                setEnq((a) =>
                  limitarEnquadramento(
                    { largura: foto.largura, altura: foto.altura },
                    { ...a, zoom: Number(e.target.value) }
                  )
                )
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={gravar} className="btn btn-primario btn-sm">
              {tp.guardar}
            </button>
            <button
              type="button"
              onClick={() => {
                foto.largar();
                setEstado({ passo: "escolher" });
              }}
              className="btn btn-subtil btn-sm"
            >
              {tp.escolher_outra}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Avatar
              nome={nomeParaIniciais}
              src={perfil?.fotografia ?? null}
              tamanho="xl"
              rotulo={tp.retrato_actual}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {/* O `<label>` é o botão: um `<input type="file">` escondido com
                  `display:none` não recebe foco, e escondê-lo com `sr-only`
                  mantém-no na ordem de tabulação e no alcance do Enter. */}
              <label className="btn btn-secundario btn-sm cursor-pointer">
                <Upload size={14} aria-hidden="true" />
                {perfil?.fotografia ? tp.trocar : tp.escolher}
                <input
                  type="file"
                  accept={ACEITA}
                  className="sr-only"
                  disabled={aTrabalhar}
                  onChange={(e) => {
                    void escolher(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>

              {perfil?.fotografia && (
                <button
                  type="button"
                  onClick={apagar}
                  disabled={aApagar}
                  className="btn btn-subtil btn-sm"
                >
                  {aApagar ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                  {tp.apagar}
                </button>
              )}
            </div>
          </div>
          <p className="vc-nota">{tp.formatos}</p>
        </>
      )}

      {/* ── O que está a acontecer ────────────────────────────────────────
          Uma região viva e uma barra. Quem carrega 12MP num telemóvel espera
          segundos entre o toque e a pré-visualização, e um ecrã parado nesse
          intervalo lê-se como uma página bloqueada. */}
      {aTrabalhar && (
        <div className="perfil-progresso" role="status" aria-live="polite">
          <p className="meta">{(tp.fase as Record<string, string>)[fase ?? "a-ler"]}</p>
          <div
            className="perfil-barra"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              estado.passo === "a-gravar" && estado.fase === "a-enviar"
                ? Math.round(estado.fraccao * 100)
                : undefined
            }
          >
            <span
              className="perfil-barra__cheio"
              data-indeterminada={
                estado.passo !== "a-gravar" || estado.fase !== "a-enviar" ? "sim" : undefined
              }
              style={
                estado.passo === "a-gravar" && estado.fase === "a-enviar"
                  ? { width: `${Math.round(estado.fraccao * 100)}%` }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {erro && (
        <p className="perfil-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
