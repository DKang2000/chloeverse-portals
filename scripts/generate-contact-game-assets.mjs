import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "public", "contact", "planet-dodge");

const SPRITE_SIZE = 48;
const PIXEL_SCALE = 8;

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  }

  setPixel(x, y, fill) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    this.pixels[iy][ix] = fill;
  }

  fillRect(x, y, width, height, fill) {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        this.setPixel(column, row, fill);
      }
    }
  }

  fillCircle(centerX, centerY, radius, fill, predicate) {
    const minX = Math.floor(centerX - radius);
    const maxX = Math.ceil(centerX + radius);
    const minY = Math.floor(centerY - radius);
    const maxY = Math.ceil(centerY + radius);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (Math.hypot(dx, dy) <= radius) {
          if (!predicate || predicate(x, y, dx, dy)) {
            this.setPixel(x, y, fill);
          }
        }
      }
    }
  }

  fillEllipse(centerX, centerY, radiusX, radiusY, fill, predicate) {
    const minX = Math.floor(centerX - radiusX);
    const maxX = Math.ceil(centerX + radiusX);
    const minY = Math.floor(centerY - radiusY);
    const maxY = Math.ceil(centerY + radiusY);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        if ((dx * dx) + (dy * dy) <= 1) {
          if (!predicate || predicate(x, y, dx, dy)) {
            this.setPixel(x, y, fill);
          }
        }
      }
    }
  }

  fillPolygon(points, fill) {
    const ys = points.map((point) => point[1]);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...ys)));

    for (let y = minY; y <= maxY; y += 1) {
      const intersections = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        const minEdgeY = Math.min(y1, y2);
        const maxEdgeY = Math.max(y1, y2);
        if (y < minEdgeY || y >= maxEdgeY || y1 === y2) continue;
        const t = (y - y1) / (y2 - y1);
        intersections.push(x1 + ((x2 - x1) * t));
      }
      intersections.sort((left, right) => left - right);
      for (let index = 0; index < intersections.length; index += 2) {
        const start = Math.floor(intersections[index] ?? 0);
        const end = Math.ceil(intersections[index + 1] ?? start);
        for (let x = start; x <= end; x += 1) {
          this.setPixel(x, y, fill);
        }
      }
    }
  }

  overlayRuns() {
    const rects = [];
    for (let y = 0; y < this.height; y += 1) {
      let start = 0;
      while (start < this.width) {
        const fill = this.pixels[y][start];
        if (!fill) {
          start += 1;
          continue;
        }
        let end = start + 1;
        while (end < this.width && this.pixels[y][end] === fill) {
          end += 1;
        }
        rects.push({ x: start, y, width: end - start, height: 1, fill });
        start = end;
      }
    }
    return rects;
  }

  toSvg() {
    const rects = this.overlayRuns()
      .map((rect) => (
        `<rect x="${rect.x * PIXEL_SCALE}" y="${rect.y * PIXEL_SCALE}" width="${rect.width * PIXEL_SCALE}" height="${rect.height * PIXEL_SCALE}" fill="${rect.fill}" />`
      ))
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.width * PIXEL_SCALE}" height="${this.height * PIXEL_SCALE}" viewBox="0 0 ${this.width * PIXEL_SCALE} ${this.height * PIXEL_SCALE}" shape-rendering="crispEdges">
  ${rects}
</svg>
`;
  }
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSprite(name, canvas) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), canvas.toSvg(), "utf8");
}

function paintPlanet(name, palette, options = {}) {
  const rng = createRng(options.seed ?? 1);
  const canvas = new PixelCanvas(SPRITE_SIZE, SPRITE_SIZE);
  const cx = 24;
  const cy = 24;
  const radius = options.radius ?? 15;

  if (options.ring) {
    canvas.fillEllipse(cx, cy, radius + 10, Math.max(4, Math.floor(radius * 0.38)), options.ring, (_, y) => y >= cy - 1);
    canvas.fillEllipse(cx, cy, radius + 11, Math.max(5, Math.floor(radius * 0.42)), "rgba(255,255,255,0.16)", (_, y) => y === cy + 1);
  }

  canvas.fillCircle(cx, cy, radius, palette.body);
  canvas.fillCircle(cx + 3, cy + 4, Math.max(6, radius - 3), palette.shadow, (_, __, dx, dy) => dx > -2 || dy > -4);
  canvas.fillCircle(cx - 5, cy - 6, Math.max(4, radius * 0.48), palette.highlight);

  if (options.ring) {
    canvas.fillCircle(cx, cy, radius, palette.body);
    canvas.fillEllipse(cx, cy + 1, radius + 10, Math.max(4, Math.floor(radius * 0.34)), options.ring, (_, y) => y >= cy + 1);
  }

  for (const patch of options.patches ?? []) {
    if (patch.type === "rect") {
      canvas.fillRect(cx + patch.x, cy + patch.y, patch.width, patch.height, patch.fill);
    } else if (patch.type === "circle") {
      canvas.fillCircle(cx + patch.x, cy + patch.y, patch.radius, patch.fill);
    } else if (patch.type === "ellipse") {
      canvas.fillEllipse(cx + patch.x, cy + patch.y, patch.radiusX, patch.radiusY, patch.fill);
    }
  }

  const accentCount = options.accentCount ?? 4;
  for (let index = 0; index < accentCount; index += 1) {
    const angle = (Math.PI * 2 * index) / accentCount + rng() * 0.9;
    const distance = (radius * 0.25) + rng() * (radius * 0.35);
    canvas.fillCircle(
      cx + Math.round(Math.cos(angle) * distance),
      cy + Math.round(Math.sin(angle) * distance),
      options.accentRadius ?? 2,
      palette.accent,
    );
  }

  for (const sparkle of options.sparkles ?? []) {
    canvas.fillRect(cx + sparkle.x, cy + sparkle.y, sparkle.width, sparkle.height, sparkle.fill);
  }

  writeSprite(name, canvas);
}

function paintShip() {
  const canvas = new PixelCanvas(SPRITE_SIZE, SPRITE_SIZE);

  canvas.fillPolygon([
    [24, 8],
    [31, 31],
    [24, 26],
    [17, 31],
  ], "#efe2cc");
  canvas.fillRect(21, 23, 6, 10, "#6c5768");
  canvas.fillRect(23, 15, 2, 5, "#fff4e3");
  canvas.fillRect(18, 26, 3, 7, "#d1b39d");
  canvas.fillRect(27, 26, 3, 7, "#d1b39d");
  canvas.fillRect(21, 32, 2, 5, "#ff8a5c");
  canvas.fillRect(25, 32, 2, 5, "#ff8a5c");
  canvas.fillRect(22, 35, 4, 3, "#ffd3a1");
  canvas.fillRect(20, 12, 1, 6, "#fffaf3");
  canvas.fillRect(28, 12, 1, 6, "#fffaf3");

  writeSprite("ship", canvas);
}

function main() {
  ensureDir(outDir);

  paintShip();

  paintPlanet("mercury", {
    body: "#b79275",
    shadow: "#6c4f42",
    highlight: "#f0cfbb",
    accent: "#8b6451",
  }, {
    seed: 9,
    accentCount: 3,
    accentRadius: 2,
  });

  paintPlanet("venus", {
    body: "#deb472",
    shadow: "#8b6132",
    highlight: "#fff0ca",
    accent: "#f6d18a",
  }, {
    seed: 13,
    patches: [
      { type: "rect", x: -8, y: -1, width: 15, height: 2, fill: "#f1cf8c" },
      { type: "rect", x: -6, y: 4, width: 12, height: 2, fill: "#f0d39f" },
    ],
  });

  paintPlanet("earth", {
    body: "#3f7fe5",
    shadow: "#14365e",
    highlight: "#d5f2ff",
    accent: "#61bf7a",
  }, {
    seed: 21,
    patches: [
      { type: "rect", x: -10, y: 1, width: 8, height: 4, fill: "#61bf7a" },
      { type: "rect", x: 2, y: -5, width: 6, height: 5, fill: "#61bf7a" },
      { type: "circle", x: 5, y: 6, radius: 3, fill: "#72cb8a" },
    ],
  });

  paintPlanet("mars", {
    body: "#c86d57",
    shadow: "#6b3026",
    highlight: "#ffd0ba",
    accent: "#f3a685",
  }, {
    seed: 31,
    accentCount: 5,
  });

  paintPlanet("jupiter", {
    body: "#d0a171",
    shadow: "#7c5132",
    highlight: "#fff0d7",
    accent: "#b46b46",
  }, {
    seed: 37,
    radius: 16,
    accentCount: 3,
    patches: [
      { type: "rect", x: -16, y: -8, width: 32, height: 2, fill: "#d8bb93" },
      { type: "rect", x: -16, y: -3, width: 32, height: 2, fill: "#b97d5d" },
      { type: "rect", x: -16, y: 2, width: 32, height: 2, fill: "#d8bb93" },
      { type: "rect", x: -16, y: 7, width: 32, height: 2, fill: "#b97d5d" },
    ],
  });

  paintPlanet("saturn", {
    body: "#d9be92",
    shadow: "#7f6846",
    highlight: "#fff3da",
    accent: "#b89a6f",
  }, {
    seed: 41,
    radius: 14,
    accentCount: 2,
    ring: "#d8c19a",
  });

  paintPlanet("uranus", {
    body: "#8fd0d4",
    shadow: "#2b6063",
    highlight: "#ecffff",
    accent: "#b6f1f3",
  }, {
    seed: 47,
    accentCount: 2,
    patches: [
      { type: "rect", x: -14, y: -2, width: 28, height: 2, fill: "#afe8ea" },
      { type: "rect", x: -11, y: 5, width: 22, height: 2, fill: "#7fd6d9" },
    ],
  });

  paintPlanet("neptune", {
    body: "#5f79f2",
    shadow: "#1e2d74",
    highlight: "#dce7ff",
    accent: "#92aeff",
  }, {
    seed: 53,
    accentCount: 3,
    patches: [
      { type: "rect", x: -13, y: -3, width: 26, height: 2, fill: "#7d95ff" },
      { type: "rect", x: -10, y: 5, width: 21, height: 2, fill: "#6f8cff" },
    ],
  });

  paintPlanet("pluto", {
    body: "#d9c7b9",
    shadow: "#5c4a53",
    highlight: "#fff7ec",
    accent: "#c493b7",
  }, {
    seed: 61,
    radius: 15,
    accentCount: 4,
    patches: [
      { type: "circle", x: 5, y: 4, radius: 4, fill: "#b983aa" },
      { type: "circle", x: -6, y: 7, radius: 3, fill: "#e5d8cf" },
      { type: "rect", x: -10, y: -5, width: 8, height: 2, fill: "#ece0d6" },
    ],
  });

  const files = fs.readdirSync(outDir).filter((entry) => entry.endsWith(".svg")).sort();
  process.stdout.write(`Generated ${files.length} contact-game sprite assets in ${outDir}\n`);
}

main();
