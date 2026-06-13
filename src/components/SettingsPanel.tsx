import { useEffect } from "react";
import type { Theme } from "../types/theme";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  theme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onClose: () => void;
}

interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "sumi",
    label: "Sumi",
    description: "Claro, editorial. Papel cálido y acento bermellón.",
  },
  {
    value: "terminal",
    label: "Terminal",
    description: "Oscuro, técnico. Monoespaciado y acento ácido.",
  },
];

/** Panel de Ajustes (modal). Por ahora: selector de tema. */
export function SettingsPanel({
  theme,
  onSelectTheme,
  onClose,
}: SettingsPanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-panel__head">
          <h2 className="settings-panel__title">Ajustes</h2>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Cerrar ajustes"
          >
            ✕
          </button>
        </div>

        <div className="settings-panel__section">
          <span className="settings-panel__label">Tema</span>
          <div className="settings-panel__options" role="radiogroup" aria-label="Tema">
            {THEME_OPTIONS.map((option) => {
              const selected = option.value === theme;
              return (
                <button
                  type="button"
                  key={option.value}
                  role="radio"
                  aria-checked={selected}
                  className={
                    selected
                      ? "settings-option settings-option--selected"
                      : "settings-option"
                  }
                  onClick={() => onSelectTheme(option.value)}
                >
                  <span className="settings-option__dot" aria-hidden="true" />
                  <span className="settings-option__text">
                    <span className="settings-option__name">{option.label}</span>
                    <span className="settings-option__desc">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
