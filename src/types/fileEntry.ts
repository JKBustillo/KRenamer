/**
 * Entrada de archivo devuelta por el comando `scan` de Rust.
 * Debe mantenerse en sync con la struct `FileEntry` en `src-tauri/src/fs_ops.rs`.
 */
export interface FileEntry {
  /** Ruta absoluta del archivo en disco. */
  path: string;
  /** Nombre del archivo con extensión (sin la carpeta). */
  name: string;
}
