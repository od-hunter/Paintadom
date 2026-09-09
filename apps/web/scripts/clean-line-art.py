#!/usr/bin/env python3
"""Normalize coloring-page assets: crisp black lines, no watermarks/checkerboard/crown UI."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

FRAME_W = 800
FRAME_H = 1000
LINE_LUM = 175
BADGE_SIZE = 80


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def clean_pixels(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    src = rgba.load()
    dst = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 16:
                continue
            if luminance(r, g, b) < LINE_LUM:
                dst[x, y] = (0, 0, 0, 255)

    for y in range(min(BADGE_SIZE, h)):
        for x in range(min(BADGE_SIZE, w)):
            dst[x, y] = (0, 0, 0, 0)

    return out


def binarize_rgba(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    src = rgba.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 16:
                continue
            if luminance(r, g, b) < LINE_LUM:
                dst[x, y] = (0, 0, 0, 255)
    return out


def fit_frame(img: Image.Image) -> Image.Image:
    sw, sh = img.size
    scale = min(FRAME_W / sw, FRAME_H / sh)
    nw = max(1, int(sw * scale))
    nh = max(1, int(sh * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    ox = (FRAME_W - nw) // 2
    oy = (FRAME_H - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return binarize_rgba(canvas)


def process_file(path: Path) -> None:
    img = Image.open(path)
    cleaned = clean_pixels(img)
    framed = fit_frame(cleaned)
    out = path.with_suffix(".png")
    framed.save(out, "PNG", optimize=True)
    if out != path and path.suffix.lower() in {".jpg", ".jpeg"}:
        path.unlink()
    print(f"  cleaned -> {out.name} ({FRAME_W}x{FRAME_H})")


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "public" / "pages" / "lifestyle"
    if len(sys.argv) > 1:
        files = [Path(p) for p in sys.argv[1:]]
    else:
        files = sorted(
            p for p in root.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
        )

    print(f"Cleaning {len(files)} drawing(s)...")
    for path in files:
        if path.exists():
            process_file(path)


if __name__ == "__main__":
    main()
