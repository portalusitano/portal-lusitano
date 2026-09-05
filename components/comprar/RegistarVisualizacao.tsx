"use client";

import { useEffect, useRef } from "react";

/**
 * Records a listing view once per mount. Renders nothing.
 *
 * Deduplication proper happens server-side (one view per visitor per day); the
 * ref here only stops React's development double-effect from firing twice.
 */
export default function RegistarVisualizacao({ cavaloId }: { cavaloId: string }) {
  const registada = useRef(false);

  useEffect(() => {
    if (registada.current) return;
    registada.current = true;

    // Fire and forget: a failed count must never disturb the page.
    fetch(`/api/cavalos/${cavaloId}/visualizacao`, { method: "POST" }).catch(() => {});
  }, [cavaloId]);

  return null;
}
