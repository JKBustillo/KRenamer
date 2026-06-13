import "./DropZone.css";

interface DropZoneProps {
  isHovering: boolean;
  loading: boolean;
  onPickFolder: () => void;
  onPickFiles: () => void;
}

/** Vista inicial vacía: zona para arrastrar o elegir carpeta/archivos. */
export function DropZone({
  isHovering,
  loading,
  onPickFolder,
  onPickFiles,
}: DropZoneProps) {
  const className = isHovering ? "drop-zone drop-zone--hovering" : "drop-zone";

  return (
    <div className={className}>
      <div className="drop-zone__glyph" aria-hidden="true">
        ⤓
      </div>
      <h2 className="drop-zone__title">Arrastra una carpeta o archivos</h2>
      <p className="drop-zone__hint">
        {loading
          ? "Escaneando…"
          : "Suelta las páginas de tu manga aquí para empezar a renombrar."}
      </p>
      <div className="drop-zone__actions">
        <button
          type="button"
          className="drop-zone__btn drop-zone__btn--primary"
          onClick={onPickFolder}
          disabled={loading}
        >
          Elegir carpeta
        </button>
        <button
          type="button"
          className="drop-zone__btn"
          onClick={onPickFiles}
          disabled={loading}
        >
          Agregar archivos
        </button>
      </div>
    </div>
  );
}
