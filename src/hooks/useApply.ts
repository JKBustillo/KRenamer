import { useCallback, useState } from "react";
import type { ApplyOutcome } from "../types/applyOutcome";
import type { RenamePlan } from "../types/renamePlan";
import { apply } from "../utils/commands";

/**
 * Ejecuta el renombrado en disco. `outcomes` es `null` mientras no se aplicó;
 * pasa a un array cuando termina. El `apply` corre en un handler (evento), no
 * en un effect, así el setState ocurre por acción del usuario.
 */
export function useApply() {
  const [outcomes, setOutcomes] = useState<ApplyOutcome[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (paths: string[], plan: RenamePlan) => {
    setApplying(true);
    setError(null);
    try {
      setOutcomes(await apply(paths, plan));
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setApplying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutcomes(null);
    setError(null);
  }, []);

  return { outcomes, applying, error, run, reset };
}
