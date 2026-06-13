import { open } from "@tauri-apps/plugin-dialog";

/**
 * Diálogos nativos para elegir qué cargar. Devuelven siempre un array de rutas
 * (vacío si el usuario cancela), para encajar directo con `addPaths`.
 */

/** Abre el selector de carpeta. */
export async function pickFolder(): Promise<string[]> {
  const selected = await open({ directory: true });
  return selected ? [selected] : [];
}

/** Abre el selector de archivos sueltos (selección múltiple). */
export async function pickFiles(): Promise<string[]> {
  const selected = await open({ multiple: true });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}
