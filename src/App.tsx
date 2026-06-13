import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { useScannedFiles } from "./hooks/useScannedFiles";
import { useFileDrop } from "./hooks/useFileDrop";
import { useLivePreview } from "./hooks/useLivePreview";
import { ThemeToggle } from "./components/ThemeToggle";
import { DropZone } from "./components/DropZone";
import { PatternForm } from "./components/PatternForm";
import { PreviewTable } from "./components/PreviewTable";
import { pickFiles, pickFolder } from "./utils/dialog";
import { DEFAULT_RENAME_PLAN } from "./types/renamePlan";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { files, loading, error, addPaths, clear } = useScannedFiles();
  const { isHovering } = useFileDrop(addPaths);
  const [plan, setPlan] = useState(DEFAULT_RENAME_PLAN);
  const { rows, loading: previewing, error: previewError, schedule } = useLivePreview();

  const filePaths = useMemo(() => files.map((file) => file.path), [files]);

  useEffect(() => {
    schedule(filePaths, plan);
  }, [filePaths, plan, schedule]);

  const handlePickFolder = useCallback(async () => {
    addPaths(await pickFolder());
  }, [addPaths]);

  const handlePickFiles = useCallback(async () => {
    addPaths(await pickFiles());
  }, [addPaths]);

  const hasFiles = files.length > 0;
  const hasWarnings = rows.some((row) => row.invalid || row.collision);
  const canApply = rows.length > 0 && !hasWarnings && !previewing;

  return (
    <div className="app-shell">
      <header className="app-shell__bar">
        <span className="app-shell__brand">KRenamer</span>
        <div className="app-shell__bar-right">
          {hasFiles && (
            <button type="button" className="app-shell__action" onClick={clear}>
              Limpiar
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {(error ?? previewError) && (
        <div className="app-shell__error" role="alert">
          {error ?? previewError}
        </div>
      )}

      <main className="app-shell__main">
        <div className="app-shell__content">
          {hasFiles ? (
            <div className="workspace">
              <aside className="workspace__form">
                <PatternForm plan={plan} onChange={setPlan} />
              </aside>
              <section className="workspace__preview">
                <PreviewTable rows={rows} loading={previewing} />
                <div className="workspace__actions">
                  <span className="workspace__status">
                    {hasWarnings
                      ? "Resuelve los avisos para poder aplicar."
                      : "Listo para aplicar."}
                  </span>
                  <button
                    type="button"
                    className="workspace__apply"
                    disabled={!canApply}
                  >
                    Aplicar renombrado
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <DropZone
              isHovering={isHovering}
              loading={loading}
              onPickFolder={handlePickFolder}
              onPickFiles={handlePickFiles}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
