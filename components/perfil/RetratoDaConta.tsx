"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/components/auth/AuthProvider";
import Avatar from "./Avatar";
import { useRetratoProprio } from "./useRetratoProprio";
import type { Perfil } from "./api";

/**
 * O retrato na área da conta, e o botão que o troca.
 *
 * ── O editor não vem com a página ─────────────────────────────────────────
 *
 * `next/dynamic` com `ssr: false`. O que este componente traz por omissão é o
 * `Avatar` e um botão; o canvas, o recorte, a validação e a subida só chegam
 * quando alguém carrega em «Alterar fotografia». Quem entra na conta para ver
 * os anúncios não paga o editor.
 */
const EditorAvatar = dynamic(() => import("./EditorAvatar"), { ssr: false });

export default function RetratoDaConta({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { perfil, recarregar } = useRetratoProprio();
  const [aberto, setAberto] = useState(false);

  const nome =
    perfil?.nome ??
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
    null;

  const gravado = useCallback(
    (_novo: Perfil) => {
      recarregar();
    },
    [recarregar]
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <Avatar nome={nome} src={perfil?.fotografia ?? null} tamanho="lg" />
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="btn btn-secundario btn-sm"
        >
          <Camera size={14} aria-hidden="true" />
          {perfil?.fotografia ? t.perfil.trocar : t.perfil.escolher}
        </button>
      </div>

      {aberto && (
        <div className="mt-4">
          <EditorAvatar
            perfil={perfil}
            nomeParaIniciais={nome}
            onFechar={() => setAberto(false)}
            onGravado={gravado}
          />
        </div>
      )}
    </div>
  );
}
