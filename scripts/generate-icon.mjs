// Rasteriza el logo SVG a un PNG 1024×1024 para alimentar `tauri icon`.
// Usa fuentes del sistema para el kanji 改. Uso: node scripts/generate-icon.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "src-tauri/icons/source.svg"), "utf8");

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1024 },
  font: { loadSystemFonts: true, defaultFontFamily: "Yu Mincho" },
});

const out = join(root, "app-icon.png");
writeFileSync(out, resvg.render().asPng());
console.log("Wrote", out);
