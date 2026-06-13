import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewRow } from "../types/previewRow";
import type { RenamePlan } from "../types/renamePlan";
import { preview } from "../utils/commands";

const DEBOUNCE_MS = 250;

/**
 * Genera la tabla de preview en vivo. `schedule(paths, plan)` debouncea las
 * llamadas al backend mientras el usuario edita el patrón; un `requestId`
 * descarta respuestas obsoletas. El setState vive en callbacks (no en un
 * effect), así que cada actualización ocurre por evento.
 */
export function useLivePreview() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef(0);

  const runPreview = useCallback(async (paths: string[], plan: RenamePlan) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await preview(paths, plan);
      if (requestId !== requestIdRef.current) return;
      setRows(result);
      setError(null);
    } catch (e: unknown) {
      if (requestId === requestIdRef.current) setError(String(e));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const schedule = useCallback(
    (paths: string[], plan: RenamePlan) => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);

      if (paths.length === 0) {
        requestIdRef.current++; // cancela cualquier preview en vuelo
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        runPreview(paths, plan);
      }, DEBOUNCE_MS);
    },
    [runPreview],
  );

  // Limpia el timer pendiente al desmontar.
  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    },
    [],
  );

  return { rows, loading, error, schedule };
}
