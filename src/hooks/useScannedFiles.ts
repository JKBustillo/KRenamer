import { useCallback, useRef, useState } from "react";
import type { FileEntry } from "../types/fileEntry";
import { scan } from "../utils/commands";

/**
 * Mantiene las rutas que el usuario fue agregando (carpetas o archivos) y las
 * escanea con el backend, exponiendo los archivos en orden natural.
 *
 * El escaneo corre en los handlers (agregar / limpiar), no en un effect, así
 * el setState ocurre por evento. Un `requestId` descarta resultados obsoletos
 * cuando llegan dos cargas casi simultáneas o un `clear` mientras hay un scan
 * en vuelo.
 */
export function useScannedFiles() {
  const sourcePathsRef = useRef<string[]>([]);
  const requestIdRef = useRef(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPaths = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    const next = [...sourcePathsRef.current, ...paths];
    sourcePathsRef.current = next;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    try {
      const result = await scan(next);
      if (requestId !== requestIdRef.current) return;
      setFiles(result);
      setError(null);
    } catch (e: unknown) {
      if (requestId === requestIdRef.current) setError(String(e));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    sourcePathsRef.current = [];
    requestIdRef.current++; // invalida cualquier scan en vuelo
    setFiles([]);
    setError(null);
    setLoading(false);
  }, []);

  return { files, loading, error, addPaths, clear };
}
