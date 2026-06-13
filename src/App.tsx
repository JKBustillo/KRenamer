import { useCallback } from "react";
import { useTheme } from "./hooks/useTheme";
import { useScannedFiles } from "./hooks/useScannedFiles";
import { useFileDrop } from "./hooks/useFileDrop";
import { ThemeToggle } from "./components/ThemeToggle";
import { DropZone } from "./components/DropZone";
import { FileList } from "./components/FileList";
import { pickFiles, pickFolder } from "./utils/dialog";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { files, loading, error, addPaths, clear } = useScannedFiles();
  const { isHovering } = useFileDrop(addPaths);

  const handlePickFolder = useCallback(async () => {
    addPaths(await pickFolder());
  }, [addPaths]);

  const handlePickFiles = useCallback(async () => {
    addPaths(await pickFiles());
  }, [addPaths]);

  const hasFiles = files.length > 0;

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

      {error && (
        <div className="app-shell__error" role="alert">
          {error}
        </div>
      )}

      <main className="app-shell__main">
        <div className="app-shell__content">
          {hasFiles ? (
            <FileList files={files} />
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
