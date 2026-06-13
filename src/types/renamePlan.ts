/**
 * Configuración de renombrado que se envía al backend.
 * Debe mantenerse en sync con la struct `RenamePlan` en `src-tauri/src/rename.rs`.
 */
export interface RenamePlan {
  /** Plantilla del nombre, con el token `{n}` donde va el número. */
  template: string;
  /** Número con el que arranca la secuencia. */
  start: number;
  /** Cantidad mínima de dígitos del número (rellena con ceros a la izquierda). */
  padding: number;
  /** Cuánto incrementa el número entre un archivo y el siguiente. */
  step: number;
}

/** Token dentro de la plantilla que se reemplaza por el número de secuencia. */
export const SEQUENCE_TOKEN = "{n}";

/** Plan inicial al cargar archivos: secuencia simple `001`, `002`, … */
export const DEFAULT_RENAME_PLAN: RenamePlan = {
  template: SEQUENCE_TOKEN,
  start: 1,
  padding: 3,
  step: 1,
};
