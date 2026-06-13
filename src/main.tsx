import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Fuentes empaquetadas localmente (Fontsource) — la app debe funcionar offline.
// Tema sumi: Shippori Mincho B1 (display) + Zen Kaku Gothic New (body).
import "@fontsource/shippori-mincho-b1/latin-700.css";
import "@fontsource/shippori-mincho-b1/latin-800.css";
import "@fontsource/zen-kaku-gothic-new/latin-400.css";
import "@fontsource/zen-kaku-gothic-new/latin-500.css";
import "@fontsource/zen-kaku-gothic-new/latin-700.css";
// Tema terminal: IBM Plex Mono (display/mono) + IBM Plex Sans (body).
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";

import "./theme.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
