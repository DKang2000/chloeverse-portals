#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "public" / "contact" / "voxel" / "raw"
SPRITE_DIR = ROOT / "public" / "contact" / "voxel" / "sprites"


SHEETS = [
    (
        "player-ships.png",
        3,
        2,
        [
            "player-rear",
            "player-top",
            "player-rear-right",
            "player-rear-left",
            "player-bank-left",
            "player-bank-right",
        ],
    ),
    (
        "alien-ships.png",
        4,
        2,
        [
            "alien-heavy-rear",
            "alien-top",
            "alien-left",
            "alien-right",
            "alien-scout-top",
            "alien-scout-rear",
            "alien-heavy-front",
            "alien-drone",
        ],
    ),
    (
        "hazards.png",
        4,
        3,
        [
            "mercury",
            "venus",
            "earth",
            "mars",
            "jupiter",
            "saturn",
            "uranus",
            "neptune",
            "pluto",
            "asteroid-dark",
            "asteroid-light",
            "asteroid-shard",
        ],
    ),
    (
        "fx.png",
        4,
        3,
        [
            "engine-twin-amber",
            "engine-trail-amber",
            "engine-twin-cyan",
            "projectile-amber",
            "projectile-cyan",
            "missile-coral",
            "impact-small",
            "explosion-large",
            "shield-ring",
            "muzzle-flash",
            "voxel-debris",
            "hologram-sparkle",
        ],
    ),
    (
        "docking-terminal.png",
        4,
        2,
        [
            "terminal-distant",
            "station-platform",
            "hologram-card-frame",
            "projection-base",
            "terminal-pillars",
            "dock-light-core",
            "glass-panel-frame",
            "scanline-tile",
        ],
    ),
    (
        "hud-ui.png",
        4,
        3,
        [
            "hud-hull-frame",
            "hud-timer-frame",
            "hud-return-frame",
            "hud-audio-frame",
            "hud-stat-chip",
            "hud-radar",
            "hud-corner-brackets",
            "hud-reticle",
            "hud-bottom-strip",
            "hud-shield-badge",
            "hud-extra-a",
            "hud-extra-b",
        ],
    ),
]


def remove_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue

            green_dominance = green - max(red, blue)
            if green > 138 and green_dominance > 46:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            if green > 82 and green_dominance > 18:
                next_alpha = max(0, min(alpha, 255 - green_dominance * 5))
                red = min(255, red + max(0, green_dominance // 5))
                blue = min(255, blue + max(0, green_dominance // 6))
                if next_alpha == 0:
                    pixels[x, y] = (0, 0, 0, 0)
                else:
                    pixels[x, y] = (red, green, blue, next_alpha)

    return rgba


def trim_and_pad(image: Image.Image, pad: int = 14) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image

    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(image.width, bbox[2] + pad)
    bottom = min(image.height, bbox[3] + pad)
    return image.crop((left, top, right, bottom))


def export_sheet(sheet_name: str, columns: int, rows: int, names: list[str]) -> None:
    source = Image.open(RAW_DIR / sheet_name).convert("RGBA")
    cell_width = source.width // columns
    cell_height = source.height // rows

    for index, name in enumerate(names):
        col = index % columns
        row = index // columns
        crop = source.crop((col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height))
        cleaned = trim_and_pad(remove_key(crop))
        cleaned.save(SPRITE_DIR / f"{name}.png")


def write_manifest() -> None:
    names = sorted(path.name for path in SPRITE_DIR.glob("*.png"))
    lines = ["Generated contact voxel sprites:", ""]
    lines.extend(f"- {name}" for name in names)
    (SPRITE_DIR / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)
    for old in SPRITE_DIR.glob("*.png"):
        old.unlink()

    for sheet in SHEETS:
        export_sheet(*sheet)

    write_manifest()
    print(f"Prepared {len(list(SPRITE_DIR.glob('*.png')))} contact voxel sprites in {SPRITE_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
