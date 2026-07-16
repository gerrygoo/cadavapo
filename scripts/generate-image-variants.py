#!/usr/bin/env python3
"""
Generate delivery-ready image variants for assets/projects/.

For every still image, produces a same-basename pair:
  <name>.avif  (primary, smallest — served via <picture><source>)
  <name>.jpg   (universal fallback, used as the <img> src)

Run manually whenever a still is added or replaced — this is a one-time
content-prep step, not part of serving the site (no build tooling here).
Requires Pillow with AVIF support: pip install pillow

If a future still's native width exceeds ~1600px and there's a real case for
serving smaller viewports a lighter file, generate one additional smaller
width rung (~800w) and add srcset/sizes at that point — not needed today,
since current sources are already modest (471-1708px wide).

Usage:
  python3 scripts/generate-image-variants.py assets/projects/<project>/<source-image>
  python3 scripts/generate-image-variants.py --all   # rebuild every still in assets/projects/
"""

import sys
import os
from pathlib import Path

from PIL import Image

MAX_WIDTH = 1600  # never upscale; only cap long edge for oversized sources
AVIF_QUALITY = 55
JPEG_QUALITY = 82

PROJECTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "projects"


def resize_if_needed(im):
    if im.width <= MAX_WIDTH:
        return im
    ratio = MAX_WIDTH / im.width
    return im.resize((MAX_WIDTH, round(im.height * ratio)), Image.LANCZOS)


def generate_variants(src_path):
    src_path = Path(src_path)
    im = Image.open(src_path)
    im = resize_if_needed(im).convert("RGB")

    base = src_path.with_suffix("")
    outputs = {
        base.with_suffix(".avif"): dict(format="AVIF", quality=AVIF_QUALITY),
        base.with_suffix(".jpg"): dict(format="JPEG", quality=JPEG_QUALITY, optimize=True),
    }

    for out_path, save_kwargs in outputs.items():
        im.save(out_path, **save_kwargs)
        print(f"  -> {out_path} ({os.path.getsize(out_path)} bytes)")

    # Remove the source file if it's not one of the three canonical outputs
    # (handles mislabeled extensions, e.g. an AVIF saved as .png)
    if src_path not in outputs and src_path.exists():
        src_path.unlink()
        print(f"  (removed stale source {src_path})")


def find_all_sources():
    seen_basenames = set()
    sources = []
    for f in sorted(PROJECTS_DIR.glob("*/*")):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".avif"):
            continue
        base = f.with_suffix("")
        if base in seen_basenames:
            continue
        seen_basenames.add(base)
        sources.append(f)
    return sources


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    if sys.argv[1] == "--all":
        targets = find_all_sources()
    else:
        targets = [Path(p) for p in sys.argv[1:]]

    for src in targets:
        print(f"{src}:")
        generate_variants(src)


if __name__ == "__main__":
    main()
