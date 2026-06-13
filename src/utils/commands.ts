import { invoke } from "@tauri-apps/api/core";
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
