# Director role + video sync

**Goal:** Close the gap between the portfolio Google Doc (source of truth
for credits/text) and the site, and land the media referenced in
`docs/specs/2026-08-02-video-ingestion.md`.

**Scope:** `staging/` (per `CLAUDE.md`, layout/content work lands here
first) plus new `assets/director/` asset tree and the shared
`scripts/generate-video-variants.py`.

---

## Gaps found comparing the doc against the site (2026-08-02)

- [x] **"DIRECTOR" role entirely missing.** `staging/directora.html` still
  shows the wireframe placeholder "sin proyectos asignados aún", but the
  doc has 9 fully-credited projects under DIRECTOR. Closed by this plan —
  see "Site adjustments" below.
- [x] **`bellakath-minina.html` / `ghetto-kids-en-el-ghetto-2.html`** are
  stub ficha pages ("stills pendientes de entrega") — Ghetto Kids #2 and #3
  now have real Drive footage (Ghetto Kids #2 in `EL MAILLA EZYA/`, #3 in
  `GHETTO, NSQK/`); Bellakath has no Drive folder yet, stays a stub.
- [ ] **"Short and feature films"** (Casa Chica dir. Lau Charles, Ricardo
  Remix ft. Covid-19 dir. Juan Ordorica, Vainilla dir. Mayra Hermosillo) —
  undocumented anywhere in the repo. No Drive assets found for these
  either. Not actioned this round — flagging only.
- [ ] **"Robe Grill: Success is calling"** (L'beauté Homme) — undocumented
  in the repo. The doc itself has Dani's own note flagging this one as
  unresolved ("no sé cómo descargar videos de otras páginas que no sean
  youtube para hacer los gifs xd") — treat as known-incomplete upstream,
  not a repo bug. Not actioned this round.
- [x] **YouTube ID mapping** — `2026-07-20-mock-completeness.md`'s
  "Postponed" section listed 5 IDs as unmapped; the doc confirms 4 of them.
  Fixed in that file directly (see separate edit).
- [ ] **`sophia-warren-bor`** — the repo has a stub for this title but the
  doc never mentions a "BOR" project (only "Purple" and "Static" under
  Sophia Warren). Its YouTube ID (`KiN6by3OiZc`) stays unconfirmed. Worth
  asking Dani directly whether "BOR" is a real third title or a mislabel —
  not resolved here.

## Site adjustments made (text/HTML, no media dependency)

- `assets/director/README.md` + `assets/director/<slug>/.gitkeep` for all
  9 DIRECTOR projects (provenance doc, mirrors `assets/projects/README.md`).
- 9 new ficha pages under `staging/proyectos/` (one per DIRECTOR project),
  built from the doc's full crew credits, using the progressive-loading
  markup from the video-ingestion spec (empty/placeholder until real clips
  land).
- `staging/directora.html` rewritten with a real `.proyectos-grid` of tiles
  linking to the 9 pages above (text-only tiles, no thumbnails yet — same
  pattern `decoracion.html` already uses for asset-less tiles).

Slugs → doc titles:

| slug | title | YouTube ID |
|---|---|---|
| `erade-kafi` | El refinado arte de extrañar by Kafi | `B-9AHzA6LaI` |
| `hoy-erandi` | Hoy by E-randi | `elfMQ5osShc` |
| `westbound-khameleon` | Westbound by Khameleon | `PMhnzvd7rtI` |
| `heroes-vicente-jauregui` | Héroes by Vicente Jauregui | `Jo3Pl_tLyNs` |
| `presa-alamo-paraiso` | Presa by Alamo Paraiso | `7_lqt4l9FcM` |
| `fantasma-astral` | Fantasma astral by Vicente Jauregui | `qr68rPCVadQ` |
| `satelite-futura-club` | Satélite by Futura Club | `isFZwAhA7As` |
| `archivo-digital` | Archivo Digital | `jx4Nt1Iv41k` |
| `la-verticalidad-desahuciada` | La Verticalidad Desahuciada | *(no link in doc — TBD)* |

---

## Handoff: actual batch ingestion (deferrable)

**Status: executed 2026-08-02.** 5 of 11 Drive subfolders fully ingested,
2 partially, 4 failed (mostly a Drive MCP download-tool hard limit, not a
process failure) — see "Per-file ingestion status" at the bottom of this
doc for the full breakdown and "What's left for a future pass" for how to
finish the rest.

**This section is a complete, self-contained briefing** for whoever (agent
or human) runs the actual download+convert+commit pass — it does not
assume access to the rest of this conversation.

### What to do

1. Read `docs/specs/2026-08-02-video-ingestion.md` for the full Drive
   folder-ID map, the webm/720p/poster/placeholder format standard, and the
   progressive-loading markup shape.
2. Enumerate every file in each `DIRECTOR/*` subfolder and
   `ARTE/video musical/*` subfolder listed in that spec (folders 3–7 and
   `LA VERTICALIDAD ETC` were not file-enumerated as of 2026-08-02 — do
   that first).
3. Install `ffmpeg` (`apt-get install ffmpeg` if not already present).
4. Download each source file, run
   `python3 scripts/generate-video-variants.py <downloaded-file>` on it.
5. Place outputs:
   - `EL MAILLA EZYA/*` → `assets/projects/ghetto-kids-en-el-ghetto-2/`
   - `GHETTO, NSQK/*` → `assets/projects/ghetto-kids-en-el-ghetto-3/`
   - `DIRECTOR/<n>. <NAME>/*` → `assets/director/<slug>/` per the table
     above
6. In each affected ficha page (the 2 ghetto-kids stubs +
   `staging/proyectos/<director-slug>.html`), replace the
   `stills-grid wireframe-placeholder` div with the tier-0/1/2 progressive
   markup from the spec, wired to the real files.
7. Commit, then merge into `main` and push directly — no PR, per
   `CLAUDE.md`. If working concurrently with other changes, use a
   throwaway worktree branch per `CLAUDE.md`'s worktree convention, then
   merge that into `main` at the end.

### Tool-name caveat

Google Drive MCP tool names carry a server-connection-id suffix
(`mcp__<uuid>__search_files`, etc.) that **changes on reconnect** — do not
hardcode a name from an earlier session. Use `ToolSearch` with a keyword
like `"Drive search"` or `"Drive download"` to resolve the current names
first.

### Known risk: large-file downloads may fail — workaround confirmed 2026-08-02

The `ARCHIVO DIGITAL` GIFs are raw and large (16–65MB each, ~87MB as
base64 for the biggest one). The Drive MCP's `download_file_content` tool
returns base64 in the tool response — even a 291KB sample webm (389K
base64 chars) already exceeded the direct-response token limit during this
session's dry run.

**Workaround (tested, works):** on that error, the tool still writes the
full JSON (`{content, id, mimeType, title}`) to a local file and reports
its path in the error message. Don't try to read that file with the `Read`
tool (same size problem) — instead decode it straight to binary via a
script that never loads the base64 string into your own context, e.g.:

```python
import json, base64
with open("<path from error message>") as f:
    data = json.load(f)
with open("<target>.gif", "wb") as out:
    out.write(base64.b64decode(data["content"]))
```

This worked for the sample file and should scale to the 65MB GIFs the same
way (file-to-file, streaming through disk, not through the agent's
context). If it still fails at that size, **that's** the point to actually
give up and fall back to the per-file skip logic below.

- Don't silently skip the file — record exactly which file failed and why,
  as a line item in this checklist (per-file, not per-folder).
- Everything else that's not media-dependent (the spec, the script, the 9
  ficha pages' text/credits, `directora.html`) should already be committed
  regardless of how this step goes.
- Actual ingestion can resume later from a normal computer with access to
  Drive's web UI / `rclone` / the Drive desktop app, using the same
  `generate-video-variants.py` script against the same folder IDs — no
  repo changes needed to pick this back up.

### Per-file ingestion status

*(Filled in 2026-08-02, batch ingestion pass. One row per source file.)*

**Summary:** 5 of 11 Drive subfolders fully ingested, 2 partially, 4 failed
entirely. 40 webm clips + 4 gif-sourced clips = 44 clips landed across 7
ficha pages (5 fully wired, 2 partially wired). Scope correction: the spec
doc's folder map assumed folders 3–7 (`FANTASMA ASTRAL`, `PRESA BY ALAMO`,
`SATELITE`, `HEROES BY VICENTE`, `WESTBOUND`) were webm like `ERADE KAFI`/
`HOY ERANDI`; enumeration showed only `WESTBOUND` actually is — the other
four are raw GIF folders like `ARCHIVO DIGITAL`, with sizes in the same
16–83MB range. `LA VERTICALIDAD ETC` is also raw GIFs.

**Tooling finding (new, not in the original handoff doc):** the Drive MCP's
`download_file_content` has a **hard, unconditional 10MB per-file limit** —
files over 10MB fail immediately with `"File too large for download, over
limit of 10 MB... use the standard Google Drive API"` and **no JSON is
saved to disk**, so the documented workaround (decode the auto-saved JSON)
does not apply to these at all; there is nothing to decode. That workaround
only helps with the *other* failure mode, the `"exceeds maximum allowed
tokens"` error, which does save a decodable JSON file and worked reliably
for everything under ~4MB tested. Between those two thresholds (roughly
4–10MB), the download tool was **highly flaky** during this session — the
same file sometimes downloaded fine and sometimes failed with `"MCP server
session expired"` (a third, distinct error with no saved file either).
Retrying the same file 2–4x recovered it in some cases (`fantasma-astral`
clip 4, `satelite-futura-club` clip 5) and never recovered it in others
(`fantasma-astral` clips 1/3/5/6/7, `presa-alamo-paraiso`'s one <10MB file,
`la-verticalidad-desahuciada`'s one <10MB file) despite 3-6 attempts each
spread over several minutes. This reads as a live backend issue with the
Drive MCP connector during this session, not a problem with the tested
workaround itself (which performed exactly as documented whenever the tool
got past its own request-handling and actually returned an error with
content). `heroes-vicente-jauregui` and `archivo-digital` are **fully**
blocked — every source file in both folders is over the 10MB hard limit,
so no amount of retrying can help; they need a different download path
(Drive web UI, `rclone`, or the Drive desktop app, per the original
handoff's fallback note) to ever land in this repo.

#### `DIRECTOR/1. ERADE KAFI` → `assets/director/erade-kafi/` — fully ingested (7/7)

| Drive file | Target | Status |
|---|---|---|
| video (1).webm | video-01.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 9.1s) |
| video (9).webm | video-02.webm/.jpg/.placeholder.txt | ingested |
| video (10).webm | video-03.webm/.jpg/.placeholder.txt | ingested |
| video (2).webm | video-04.webm/.jpg/.placeholder.txt | ingested |
| video (7).webm | video-05.webm/.jpg/.placeholder.txt | ingested |
| video (8).webm | video-06.webm/.jpg/.placeholder.txt | ingested |
| video (4).webm | video-07.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 6.75s) |

Wired into `staging/proyectos/erade-kafi.html`.

#### `DIRECTOR/2. HOY ERANDI` → `assets/director/hoy-erandi/` — fully ingested (11/11)

| Drive file | Target | Status |
|---|---|---|
| 10.webm | video-01.webm/.jpg/.placeholder.txt | ingested |
| 11.webm | video-02.webm/.jpg/.placeholder.txt | ingested |
| 12.webm | video-03.webm/.jpg/.placeholder.txt | ingested |
| 3.webm | video-04.webm/.jpg/.placeholder.txt | ingested |
| 5.webm | video-05.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 1.7s) |
| 8.webm | video-06.webm/.jpg/.placeholder.txt | ingested |
| 2.webm | video-07.webm/.jpg/.placeholder.txt | ingested |
| 4.web (typo'd extension, treated as webm per handoff note) | video-08.webm/.jpg/.placeholder.txt | ingested |
| 6.webm | video-09.webm/.jpg/.placeholder.txt | ingested |
| 9.webm | video-10.webm/.jpg/.placeholder.txt | ingested |
| 1.webm | video-11.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 2.875s) |

Wired into `staging/proyectos/hoy-erandi.html`.

#### `DIRECTOR/3. FANTASMA ASTRAL BY VICENTE` → `assets/director/fantasma-astral/` — partially ingested (2/7)

| Drive file | Target | Status |
|---|---|---|
| 2.gif (4.09MB) | clip-02.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 640×480, 2.59s) |
| 4.gif (6.36MB) | clip-04.webm/.jpg/.placeholder.txt | ingested |
| 1.gif (6.70MB) | — | failed — repeated "session expired" on download (4 attempts), all under the 10MB hard limit so in principle downloadable |
| 3.gif (8.45MB) | — | failed — same, 3 attempts |
| 5.gif (7.54MB) | — | failed — same, 2 attempts |
| 6.gif (7.33MB) | — | failed — same, 2 attempts |
| 7.gif (8.05MB) | — | failed — same, 3 attempts |

Wired into `staging/proyectos/fantasma-astral.html` with the 2 clips that landed (partial gallery, not a placeholder).

#### `DIRECTOR/4. PRESA BY ALAMO` → `assets/director/presa-alamo-paraiso/` — failed (0/7)

| Drive file | Target | Status |
|---|---|---|
| 2.gif (8.52MB) | — | failed — repeated "session expired" (3 attempts), under the 10MB limit so in principle downloadable |
| 1.gif (66.2MB) | — | failed — over 10MB hard limit, no workaround possible |
| 3.gif (43.3MB) | — | failed — over 10MB hard limit |
| 3.2.gif (70.5MB) | — | failed — over 10MB hard limit |
| 4.gif (45.6MB) | — | failed — over 10MB hard limit |
| 5.gif (29.0MB) | — | failed — over 10MB hard limit |
| 7.gif (82.9MB) | — | failed — over 10MB hard limit |

`staging/proyectos/presa-alamo-paraiso.html` left unchanged (still shows the wireframe placeholder — no assets landed at all).

#### `DIRECTOR/5. SATELITE` → `assets/director/satelite-futura-club/` — partially ingested (2/8)

| Drive file | Target | Status |
|---|---|---|
| 3.gif (5.17MB) | clip-03.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 3.44s) |
| 5.gif (5.37MB) | clip-05.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 3.16s) |
| 1.gif (19.5MB) | — | failed — over 10MB hard limit |
| 2.gif (13.3MB) | — | failed — over 10MB hard limit |
| 4.gif (18.8MB) | — | failed — over 10MB hard limit |
| 6.gif (12.8MB) | — | failed — over 10MB hard limit |
| 7.gif (10.84MB) | — | failed — over 10MB hard limit |
| 8.gif (12.1MB) | — | failed — over 10MB hard limit |

Wired into `staging/proyectos/satelite-futura-club.html` with the 2 clips that landed (partial gallery, not a placeholder).

#### `DIRECTOR/6. HEROES BY VICENTE` → `assets/director/heroes-vicente-jauregui/` — failed (0/4), fully blocked

| Drive file | Target | Status |
|---|---|---|
| (1).gif (38.3MB) | — | failed — over 10MB hard limit |
| (2).gif (48.7MB) | — | failed — over 10MB hard limit |
| (4).gif (46.0MB) | — | failed — over 10MB hard limit |
| 3 .gif (48.2MB) | — | failed — over 10MB hard limit |

All 4 source files exceed the download tool's 10MB hard limit — this folder cannot be ingested via this MCP tool at all, regardless of retries. `staging/proyectos/heroes-vicente-jauregui.html` left unchanged.

#### `DIRECTOR/7. WESTBOUND` → `assets/director/westbound-khameleon/` — fully ingested (6/6)

| Drive file | Target | Status |
|---|---|---|
| vide (3).webm | video-01.webm/.jpg/.placeholder.txt | ingested |
| video (5).webm | video-02.webm/.jpg/.placeholder.txt | ingested |
| 1.webm | video-03.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 2.87s) |
| 2.webm | video-04.webm/.jpg/.placeholder.txt | ingested |
| video (2).webm | video-05.webm/.jpg/.placeholder.txt | ingested |
| 4.webm | video-06.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 4.07s) |

Wired into `staging/proyectos/westbound-khameleon.html`.

#### `DIRECTOR/ARCHIVO DIGITAL` → `assets/director/archivo-digital/` — failed (0/7), fully blocked

| Drive file | Target | Status |
|---|---|---|
| 1.gif (33.1MB) | — | failed — over 10MB hard limit |
| 2.gif (24.5MB) | — | failed — over 10MB hard limit |
| 3.gif (65.4MB) | — | failed — over 10MB hard limit |
| 4.gif (48.5MB) | — | failed — over 10MB hard limit |
| 5.gif (52.1MB) | — | failed — over 10MB hard limit |
| 6.gif (50.6MB) | — | failed — over 10MB hard limit |
| 7.gif (16.5MB) | — | failed — over 10MB hard limit |

This is the risk the original handoff explicitly flagged as allowed-to-fail — confirmed failed, and now with a concrete reason (hard tool limit, not just "large"). `staging/proyectos/archivo-digital.html` left unchanged.

#### `DIRECTOR/LA VERTICALIDAD ETC` → `assets/director/la-verticalidad-desahuciada/` — failed (0/10 usable), fully blocked

| Drive file | Target | Status |
|---|---|---|
| 2.gif (12.7MB) | — | failed — over 10MB hard limit |
| 4.gif (25.4MB) | — | failed — over 10MB hard limit |
| 6.gif (7.32MB) | — | failed — repeated "session expired" (2 attempts), under the 10MB limit so in principle downloadable |
| 8.gif (16.3MB) | — | failed — over 10MB hard limit |
| 9.gif (41.5MB) | — | failed — over 10MB hard limit |
| 10.gif (27.3MB) | — | failed — over 10MB hard limit |
| 11.gif (40.7MB) | — | failed — over 10MB hard limit |
| 12.gif (29.9MB) | — | failed — over 10MB hard limit |
| animation (12).gif (23.3MB) | — | failed — over 10MB hard limit |
| 1.gif ESTE NO VA SOLO LO QUIERO TENER (19.5MB) | — | **excluded intentionally** — filename is Dani's own note ("this one doesn't go, I just want to keep it"), not meant to be a site asset; not counted as a failure |
| 1Captura de Pantalla 2026-07-23... .png | — | **excluded intentionally** — screenshot, not a real asset (same policy as `GIF INICIAL/`'s screenshot) |

`staging/proyectos/la-verticalidad-desahuciada.html` left unchanged (it already separately flags "no hay link de YouTube en el documento fuente" as unresolved).

#### `ARTE/video musical/EL MAILLA EZYA` → `assets/projects/ghetto-kids-en-el-ghetto-2/` — fully ingested (7/7)

| Drive file | Target | Status |
|---|---|---|
| 2.webm | clip-01.webm/.jpg/.placeholder.txt | ingested |
| 02.webm (909,209 bytes) | clip-02.webm/.jpg/.placeholder.txt | ingested — note: two Drive files are both literally named "02.webm"; disambiguated by size/content, not by name |
| 00.webm | clip-03.webm/.jpg/.placeholder.txt | ingested |
| 3.webm | clip-04.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 2.0s) |
| 1.webm | clip-05.webm/.jpg/.placeholder.txt | ingested |
| 02.webm (639,229 bytes, the other "02.webm") | clip-06.webm/.jpg/.placeholder.txt | ingested |
| 4.webm | clip-07.webm/.jpg/.placeholder.txt | ingested |

Wired into `staging/proyectos/ghetto-kids-en-el-ghetto-2.html`.

#### `ARTE/video musical/GHETTO, NSQK` → `assets/projects/ghetto-kids-en-el-ghetto-3/` — fully ingested (9/9)

| Drive file | Target | Status |
|---|---|---|
| 01.webm | clip-01.webm/.jpg/.placeholder.txt | ingested |
| 00.webm | clip-02.webm/.jpg/.placeholder.txt | ingested |
| 03.webm | clip-03.webm/.jpg/.placeholder.txt | ingested |
| 02.webm | clip-04.webm/.jpg/.placeholder.txt | ingested |
| 06.webm | clip-05.webm/.jpg/.placeholder.txt | ingested |
| 003.webm | clip-06.webm/.jpg/.placeholder.txt | ingested |
| 05.webm | clip-07.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 3.04s) |
| 002.webm | clip-08.webm/.jpg/.placeholder.txt | ingested |
| 04.webm | clip-09.webm/.jpg/.placeholder.txt | ingested, ffprobe-verified (vp9, 854×480, 2.0s) |

Wired into `staging/proyectos/ghetto-kids-en-el-ghetto-3.html`.

### What's left for a future pass

- `presa-alamo-paraiso`, `heroes-vicente-jauregui`, `la-verticalidad-desahuciada`,
  `archivo-digital` need their source files downloaded through a different
  path (Drive web UI, `rclone`, or the Drive desktop app — see the original
  handoff section above) since most of their files exceed the Drive MCP
  download tool's hard 10MB-per-file limit. Once downloaded to local disk by
  any means, `python3 scripts/generate-video-variants.py <file>` and the
  `assets/director/<slug>/` / ficha-page wiring pattern above both still
  apply unchanged.
- `fantasma-astral` and `satelite-futura-club` have a handful of specific
  files (listed above, all under 10MB) that failed purely from Drive MCP
  session flakiness during this pass, not a hard limit — worth a quick
  retry from a fresh session before falling back to manual download.
