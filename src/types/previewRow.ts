/**
 * Una fila de la tabla de preview devuelta por el comando `preview` de Rust.
 * Debe mantenerse en sync con la struct `PreviewRow` en `src-tauri/src/fs_ops.rs`.
 */
export interface PreviewRow {
  /** Ruta absoluta actual del archivo. */
  path: string;
  /** Nombre actual del archivo (con extensión). */
  currentName: string;
  /** Nombre nuevo propuesto (con extensión). */
  newName: string;
  /** `true` si el nombre nuevo contiene caracteres inválidos para Windows. */
  invalid: boolean;
  /** `true` si el destino choca con otro destino o con un archivo existente fuera del set. */
  collision: boolean;
}
