import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME, type Theme } from "../types/theme";

const STORAGE_KEY = "krenamer-theme";
const THEMES: readonly Theme[] = ["sumi", "terminal"];

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

/** Lee la preferencia guardada, cayendo al tema por defecto si no hay una válida. */
function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

/**
 * Maneja el tema activo: lo aplica como `data-theme` en <html> y lo persiste
 * en localStorage. Devuelve el tema actual, un setter y un toggle entre ambos.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return { theme, setTheme };
}
