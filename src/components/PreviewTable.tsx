import type { PreviewRow } from "../types/previewRow";
import "./PreviewTable.css";

interface PreviewTableProps {
  rows: PreviewRow[];
  loading: boolean;
}

interface RowStatus {
  label: string;
  modifier: "ok" | "collision" | "invalid";
}

/** Estado de una fila; `invalid` tiene prioridad sobre `collision`. */
function statusOf(row: PreviewRow): RowStatus {
  if (row.invalid) return { label: "inválido", modifier: "invalid" };
  if (row.collision) return { label: "colisión", modifier: "collision" };
  return { label: "listo", modifier: "ok" };
}

/** Tabla de preview: nombre actual → nombre nuevo, con avisos por fila. */
export function PreviewTable({ rows, loading }: PreviewTableProps) {
  const warnings = rows.filter((row) => row.invalid || row.collision).length;
  const fileLabel = rows.length === 1 ? "archivo" : "archivos";
  const warningLabel = warnings === 1 ? "aviso" : "avisos";

  return (
    <div className="preview-table">
      <div className="preview-table__head">
        <h3 className="preview-table__title">Vista previa</h3>
        <span className="preview-table__count">
          {rows.length} {fileLabel}
          {warnings > 0 && (
            <>
              {" · "}
              <span className="preview-table__warn">
                {warnings} {warningLabel}
              </span>
            </>
          )}
          {loading && (
            <span className="preview-table__loading"> · actualizando…</span>
          )}
        </span>
      </div>

      <div className="preview-table__scroll">
        <table className="preview-table__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre actual</th>
              <th aria-hidden="true"></th>
              <th>Nombre nuevo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const status = statusOf(row);
              return (
                <tr
                  key={row.path}
                  className={`preview-table__row preview-table__row--${status.modifier}`}
                >
                  <td className="preview-table__index">{index + 1}</td>
                  <td className="preview-table__old">{row.currentName}</td>
                  <td className="preview-table__arrow" aria-hidden="true">
                    →
                  </td>
                  <td className="preview-table__new">{row.newName}</td>
                  <td>
                    <span
                      className={`preview-table__badge preview-table__badge--${status.modifier}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
