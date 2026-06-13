import { useTheme } from "./hooks/useTheme";
import { ThemeToggle } from "./components/ThemeToggle";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-shell__bar">
        <span className="app-shell__brand">KRenamer</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="app-shell__main">
        <h1 className="app-shell__title">KRenamer</h1>
        <p className="app-shell__subtitle">
          Renombrado masivo de archivos por patrones
        </p>
      </main>
    </div>
  );
}

export default App;
