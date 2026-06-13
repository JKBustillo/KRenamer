import { invoke } from "@tauri-apps/api/core";
import type { ApplyOutcome } from "../types/applyOutcome";
import type { FileEntry } from "../types/fileEntry";
import type { PreviewRow } from "../types/previewRow";
import type { RenamePlan } from "../types/renamePlan";

/**
 * Wrappers tipados sobre los comandos de Rust. Centralizan los `invoke` para
 * que los componentes no usen nombres de comando como strings sueltos.
 */

/** Escanea carpetas/archivos y devuelve los archivos en orden natural. */
export function scan(paths: string[]): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("scan", { paths });
}

/** Genera la tabla de preview (actual → nuevo) con avisos, sin tocar disco. */
export function preview(paths: string[], plan: RenamePlan): Promise<PreviewRow[]> {
  return invoke<PreviewRow[]>("preview", { paths, plan });
}

/** Ejecuta el renombrado en disco (2 fases) y devuelve el resultado por archivo. */
export function apply(paths: string[], plan: RenamePlan): Promise<ApplyOutcome[]> {
  return invoke<ApplyOutcome[]>("apply", { paths, plan });
}
