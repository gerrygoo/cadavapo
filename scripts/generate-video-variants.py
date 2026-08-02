#!/usr/bin/env python3
"""
Generate delivery-ready video variants for assets/projects/ and assets/director/.

For every source clip (gif/webm/mp4/mov), produces a same-basename trio:
  <name>.webm            (VP9, video-only, height capped at 720px — never upscale)
  <name>.jpg              (poster frame — first frame of the source, same cap)
  <name>.placeholder.txt   (base64 data-URI of a tiny blurred first-frame JPEG,
                            ready to paste as a `background-image: url(...)`
                            CSS value — the zero-network-cost tier-0 placeholder
                            described in docs/specs/2026-08-02-video-ingestion.md)

Run manually whenever a clip is added or replaced — this is a one-time
content-prep step, not part of serving the site (no build tooling here).
Requires ffmpeg + ffprobe on PATH (`apt-get install ffmpeg` if missing).

Usage:
  python3 scripts/generate-video-variants.py <path-to-source-clip>
  python3 scripts/generate-video-variants.py --all   # rebuild every clip under assets/
"""

import subprocess
import sys
from pathlib import Path

MAX_HEIGHT = 720  # never upscale; only cap the long edge for oversized sources
WEBM_CRF = 32
POSTER_QUALITY = 3      # ffmpeg -q:v, lower is better (2-5 is a sane range)
PLACEHOLDER_WIDTH = 16  # px — tiny on purpose, it's inlined as a data-URI
PLACEHOLDER_QUALITY = 5

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
SOURCE_EXTENSIONS = (".gif", ".webm", ".mp4", ".mov", ".avi")


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def probe_height(src_path):
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=height", "-of", "csv=p=0", str(src_path),
        ],
        check=True, capture_output=True, text=True,
    )
    return int(out.stdout.strip().splitlines()[0])


def target_height(src_height):
    return min(src_height, MAX_HEIGHT)


def generate_variants(src_path):
    src_path = Path(src_path)
    height = target_height(probe_height(src_path))
    scale = f"scale=-2:{height}"
    base = src_path.with_suffix("")

    webm_out = base.with_suffix(".webm")
    # ffmpeg infers the output container from the final extension, so the
    # temp file needs ".webm" last — "<name>.webm.tmp" would leave ffmpeg
    # unable to detect the muxer.
    webm_tmp = base.with_name(base.name + ".tmp.webm")
    run([
        "ffmpeg", "-y", "-i", str(src_path),
        # some source GIFs decode to an alpha pixel format (gbrap) that
        # libvpx-vp9 refuses outright — force yuv420p since every source is
        # opaque footage anyway (no real transparency to preserve).
        "-vf", f"{scale},format=yuv420p", "-an",
        "-c:v", "libvpx-vp9", "-crf", str(WEBM_CRF), "-b:v", "0",
        str(webm_tmp),
    ])
    webm_tmp.replace(webm_out)
    print(f"  -> {webm_out} ({webm_out.stat().st_size} bytes)")

    jpg_out = base.with_suffix(".jpg")
    jpg_tmp = base.with_name(base.name + ".tmp.jpg")
    run([
        "ffmpeg", "-y", "-i", str(src_path),
        "-vframes", "1", "-vf", scale, "-q:v", str(POSTER_QUALITY),
        str(jpg_tmp),
    ])
    jpg_tmp.replace(jpg_out)
    print(f"  -> {jpg_out} ({jpg_out.stat().st_size} bytes)")

    placeholder_out = base.with_suffix(".placeholder.txt")
    tiny_tmp = base.with_suffix(".tiny.jpg")
    run([
        "ffmpeg", "-y", "-i", str(src_path),
        "-vframes", "1", "-vf", f"scale={PLACEHOLDER_WIDTH}:-1,gblur=sigma=2",
        "-q:v", str(PLACEHOLDER_QUALITY),
        str(tiny_tmp),
    ])
    import base64
    data_uri = base64.b64encode(tiny_tmp.read_bytes()).decode("ascii")
    placeholder_out.write_text(
        f"background-image:url(data:image/jpeg;base64,{data_uri})"
    )
    tiny_tmp.unlink()
    print(f"  -> {placeholder_out} ({placeholder_out.stat().st_size} bytes)")

    # Remove the source file if it's not one of the three canonical outputs
    if src_path not in (webm_out, jpg_out, placeholder_out) and src_path.exists():
        src_path.unlink()
        print(f"  (removed stale source {src_path})")


def find_all_sources():
    seen_basenames = set()
    sources = []
    for f in sorted(ASSETS_DIR.glob("*/*/*")):
        if f.suffix.lower() not in SOURCE_EXTENSIONS:
            continue
        base = f.with_suffix("")
        # a .webm alongside its own .placeholder.txt is already a finished
        # output, not a source to (re-)encode — re-running --all shouldn't
        # put already-ingested clips through a second lossy encode pass.
        if f.suffix.lower() == ".webm" and base.with_suffix(".placeholder.txt").exists():
            continue
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
