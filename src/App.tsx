import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { useScannedFiles } from "./hooks/useScannedFiles";
import { useFileDrop } from "./hooks/useFileDrop";
import { useLivePreview } from "./hooks/useLivePreview";
import { useApply } from "./hooks/useApply";
import { DropZone } from "./components/DropZone";
import { PatternForm } from "./components/PatternForm";
import { PreviewTable } from "./components/PreviewTable";
import { ResultView } from "./components/ResultView";
import { SettingsPanel } from "./components/SettingsPanel";
import { pickFiles, pickFolder } from "./utils/dialog";
import { DEFAULT_RENAME_PLAN } from "./types/renamePlan";
import "./App.css";

function App() {
  const { theme, setTheme } = useTheme();
  const { files, loading, error, addPaths, clear } = useScannedFiles();
  const { isHovering } = useFileDrop(addPaths);
  const [plan, setPlan] = useState(DEFAULT_RENAME_PLAN);
  const { rows, loading: previewing, error: previewError, schedule } = useLivePreview();
  const { outcomes, applying, error: applyError, run, reset } = useApply();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const handleApply = useCallback(() => {
    run(filePaths, plan);
  }, [run, filePaths, plan]);

  const handleRestart = useCallback(() => {
    reset();
    clear();
  }, [reset, clear]);

  const hasWarnings = rows.some((row) => row.invalid || row.collision);
  const canApply =
    rows.length > 0 && !hasWarnings && !previewing && !applying;

  const showResult = outcomes !== null;
  const showWorkspace = !showResult && files.length > 0;
  const banner = error ?? previewError ?? applyError;

  return (
    <div className="app-shell">
      <header className="app-shell__bar">
        <span className="app-shell__brand">KRenamer</span>
        <div className="app-shell__bar-right">
          {showWorkspace && (
            <button type="button" className="app-shell__action" onClick={clear}>
              Limpiar
            </button>
          )}
          <button
            type="button"
            className="app-shell__icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Abrir ajustes"
          >
            ⚙
          </button>
        </div>
      </header>

      {banner && (
        <div className="app-shell__error" role="alert">
          {banner}
        </div>
      )}

      <main className="app-shell__main">
        <div className="app-shell__content">
          {showResult ? (
            <ResultView outcomes={outcomes} onRestart={handleRestart} />
          ) : showWorkspace ? (
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
                    onClick={handleApply}
                    disabled={!canApply}
                  >
                    {applying ? "Aplicando…" : "Aplicar renombrado"}
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

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          onSelectTheme={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
