import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "public", "contact", "planet-dodge");

const REQUIRED_ASSETS = [
  "ship.png",
  "mercury.png",
  "venus.png",
  "earth.png",
  "mars.png",
  "jupiter.png",
  "saturn.png",
  "uranus.png",
  "neptune.png",
  "pluto.png",
  "contact-card-shell.png",
  "contact-card-signal.png",
];

const PROMPT_PACK = path.join(rootDir, "scripts", "pixellab-contact-game-prompts.md");

function ensureAssetExists(filename) {
  const fullPath = path.join(outDir, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing PixelLab asset: ${fullPath}`);
  }
  return fullPath;
}

function main() {
  if (!fs.existsSync(PROMPT_PACK)) {
    throw new Error(`Missing PixelLab prompt pack: ${PROMPT_PACK}`);
  }

  const resolved = REQUIRED_ASSETS.map(ensureAssetExists);

  console.log("PixelLab contact asset set verified:");
  for (const file of resolved) {
    console.log(`- ${path.relative(rootDir, file)}`);
  }
  console.log(`Prompt pack: ${path.relative(rootDir, PROMPT_PACK)}`);
}

main();
