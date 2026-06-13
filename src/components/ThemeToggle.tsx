import type { Theme } from "../types/theme";
import "./ThemeToggle.css";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const LABELS: Record<Theme, string> = {
  sumi: "Sumi",
  terminal: "Terminal",
};

/** Toggle rápido para alternar entre los dos temas. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextLabel = theme === "sumi" ? LABELS.terminal : LABELS.sumi;
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      title={`Cambiar a tema ${nextLabel}`}
      aria-label={`Tema actual: ${LABELS[theme]}. Cambiar a ${nextLabel}.`}
    >
      <span className="theme-toggle__dot" aria-hidden="true" />
      <span className="theme-toggle__label">{LABELS[theme]}</span>
    </button>
  );
}
