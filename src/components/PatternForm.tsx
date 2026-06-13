import { type ChangeEvent } from "react";
import { SEQUENCE_TOKEN, type RenamePlan } from "../types/renamePlan";
import "./PatternForm.css";

interface PatternFormProps {
  plan: RenamePlan;
  onChange: (plan: RenamePlan) => void;
}

const MIN_START = 0;
const MIN_PADDING = 0;
const MIN_STEP = 1;

type NumberField = "start" | "padding" | "step";

/** Controles del patrón de renombrado: plantilla + inicio, dígitos y paso. */
export function PatternForm({ plan, onChange }: PatternFormProps) {
  const handleNumber =
    (field: NumberField, min: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.valueAsNumber;
      if (Number.isNaN(value)) return;
      onChange({ ...plan, [field]: Math.max(min, Math.floor(value)) });
    };

  const example =
    plan.template.replace(
      SEQUENCE_TOKEN,
      String(plan.start).padStart(plan.padding, "0"),
    ) || "—";

  return (
    <div className="pattern-form">
      <label className="pattern-form__field">
        <span className="pattern-form__label">Plantilla</span>
        <input
          className="pattern-form__input"
          type="text"
          value={plan.template}
          placeholder={`Texto con ${SEQUENCE_TOKEN}`}
          onChange={(e) => onChange({ ...plan, template: e.target.value })}
        />
      </label>
      <p className="pattern-form__hint">
        Usa <code className="pattern-form__token">{SEQUENCE_TOKEN}</code> donde
        va el número de página.
      </p>

      <div className="pattern-form__row">
        <label className="pattern-form__field">
          <span className="pattern-form__label">Inicio</span>
          <input
            className="pattern-form__input"
            type="number"
            min={MIN_START}
            value={plan.start}
            onChange={handleNumber("start", MIN_START)}
          />
        </label>
        <label className="pattern-form__field">
          <span className="pattern-form__label">Dígitos</span>
          <input
            className="pattern-form__input"
            type="number"
            min={MIN_PADDING}
            value={plan.padding}
            onChange={handleNumber("padding", MIN_PADDING)}
          />
        </label>
        <label className="pattern-form__field">
          <span className="pattern-form__label">Paso</span>
          <input
            className="pattern-form__input"
            type="number"
            min={MIN_STEP}
            value={plan.step}
            onChange={handleNumber("step", MIN_STEP)}
          />
        </label>
      </div>

      <div className="pattern-form__example">
        <span className="pattern-form__label">Ejemplo</span>
        <code className="pattern-form__example-value">{example}</code>
        <span className="pattern-form__hint">
          Se conserva la extensión de cada archivo.
        </span>
      </div>
    </div>
  );
}
