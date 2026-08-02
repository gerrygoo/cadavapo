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

*(Fill in as files are processed. One row per source file — this is the
audit trail for what's actually landed vs. still pending.)*

| Drive file | Target | Status |
|---|---|---|
| *(not yet started)* | | |
