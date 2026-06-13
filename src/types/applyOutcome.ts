/**
 * Resultado de aplicar el renombrado a un archivo, devuelto por el comando
 * `apply` de Rust. Debe mantenerse en sync con la struct `ApplyOutcome` en
 * `src-tauri/src/fs_ops.rs`.
 */
export interface ApplyOutcome {
  /** Ruta absoluta original del archivo. */
  path: string;
  /** Nombre nuevo que se intentó aplicar. */
  newName: string;
  /** `true` si el archivo quedó con su nombre nuevo (o ya lo tenía). */
  ok: boolean;
  /** Mensaje de error si `ok` es `false`; `null` si salió bien. */
  error: string | null;
}
