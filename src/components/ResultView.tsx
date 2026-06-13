import type { ApplyOutcome } from "../types/applyOutcome";
import "./ResultView.css";

interface ResultViewProps {
  outcomes: ApplyOutcome[];
  onRestart: () => void;
}

/** Pantalla de resultado tras aplicar el renombrado. */
export function ResultView({ outcomes, onRestart }: ResultViewProps) {
  const succeeded = outcomes.filter((outcome) => outcome.ok).length;
  const failed = outcomes.length - succeeded;
  const hasErrors = failed > 0;

  return (
    <div className="result-view">
      <div className="result-view__summary">
        <div
          className={
            hasErrors
              ? "result-view__mark result-view__mark--error"
              : "result-view__mark"
          }
          aria-hidden="true"
        >
          {hasErrors ? "!" : "✓"}
        </div>
        <h2 className="result-view__title">
          {hasErrors ? "Renombrado con errores" : "Renombrado completo"}
        </h2>
        <p className="result-view__counts">
          <strong>{succeeded}</strong> renombrados
          {hasErrors && (
            <>
              {" · "}
              <strong className="result-view__failed">{failed}</strong> con error
            </>
          )}
        </p>
      </div>

      <ul className="result-view__list">
        {outcomes.map((outcome) => (
          <li
            key={outcome.path}
            className={
              outcome.ok
                ? "result-view__item"
                : "result-view__item result-view__item--error"
            }
          >
            <span className="result-view__icon" aria-hidden="true">
              {outcome.ok ? "✓" : "✗"}
            </span>
            <span className="result-view__name">{outcome.newName}</span>
            {!outcome.ok && outcome.error && (
              <span className="result-view__error">{outcome.error}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="result-view__actions">
        <button
          type="button"
          className="result-view__restart"
          onClick={onRestart}
        >
          Renombrar otro lote
        </button>
      </div>
    </div>
  );
}
