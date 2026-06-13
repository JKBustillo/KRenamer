import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "../types/fileEntry";

/**
 * Wrappers tipados sobre los comandos de Rust. Centralizan los `invoke` para
 * que los componentes no usen nombres de comando como strings sueltos.
 */

/** Escanea carpetas/archivos y devuelve los archivos en orden natural. */
export function scan(paths: string[]): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("scan", { paths });
}
