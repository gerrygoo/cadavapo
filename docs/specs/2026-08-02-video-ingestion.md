# danivponce.xyz — Video Asset Ingestion

**Date:** 2026-08-02
**Scope:** Source-of-truth references for Dani's Google Drive content,
webm ingestion standard, progressive-loading markup for video, MP4 hosting
policy, and a brainstorm on automating future ingestion.

## Context

`docs/specs/2026-07-16-media-delivery.md` explicitly deferred video
("no video assets exist yet; revisit format/hosting decisions when they
do"). They now do: Dani shared a Drive folder full of raw GIFs and webm
clips covering the "DIRECTOR" role and two "diseño de producción" videos
that are currently stub pages. This doc covers the delivery format for
that video content and records both Drive resources as canonical sources
of truth so future sessions don't have to rediscover them.

## 1. Sources of truth

- **Portfolio doc** — Google Doc "portafolio texto plano danivponce.xyz",
  id `1VBSueYSDK-AJa_-UXKdlnAokAjP1DQ-39GDHIjwkJOk`
  (https://docs.google.com/document/d/1VBSueYSDK-AJa_-UXKdlnAokAjP1DQ-39GDHIjwkJOk/edit).
  Canonical source for project titles, roles, dates, and full crew credits.
  Owned by `gerrygoable@gmail.com` (this account), shared into it by Dani.
- **Media folder** — Drive folder "DANIVPONCE.XYZ", id
  `14Nd4kgFv-rIIRiaWQAHrhd_DplkrCuRJ`
  (https://drive.google.com/drive/folders/14Nd4kgFv-rIIRiaWQAHrhd_DplkrCuRJ),
  shared by `carladanielavp@gmail.com` (Dani). Canonical source for raw
  gifs/webm clips backing the ficha pages. Structure as of 2026-08-02:

  ```
  DANIVPONCE.XYZ/                              14Nd4kgFv-rIIRiaWQAHrhd_DplkrCuRJ
  ├── GIF INICIAL/                              1RTGKJnkcMFnyLPmFpMKV2wPVG_Pm0-F5
  │   └── (1 PNG screenshot only — not a real asset, skip)
  ├── ARTE/                                     1N3yaG5mrCcdsp8Q12Z6SpJOAm3dGADrh
  │   └── video musical/                        1wRdnS2BGXZAAcEwSoqIvSMvUnQYh-yuT
  │       ├── EL MAILLA EZYA/                   1zMTTnsetX3aYcQQsom-k9pRbXv3nn-1B  → ghetto-kids-en-el-ghetto-2 (7 webm, ~400KB–900KB each — fully ingested 2026-08-02)
  │       └── GHETTO, NSQK/                      14cOoy8v-2lpjSMI10mEhakYhnMByLh7l  → ghetto-kids-en-el-ghetto-3 (9 webm, ~390KB–1.1MB each — fully ingested 2026-08-02)
  └── DIRECTOR/                                 1riENnPT0lxJPgSajBJx6jJ5mAsw4oG7M
      ├── 1. ERADE KAFI/                        1SW3wMzjhUmJX8E-4948yZZ3JZc9OQaZS  → erade-kafi (7 webm, ~300KB–1.7MB each — fully ingested 2026-08-02)
      ├── 2. HOY ERANDI/                        1FHFtLQaGhnHB810vU9gfuFCagIRDDlvU  → hoy-erandi (11 webm; one file `4.web` has a typo'd extension, treated as webm — fully ingested 2026-08-02)
      ├── 3. FANTASMA ASTRAL BY VICENTE/        1x17BmCcDgOIB8a97YvrJpnPZWZ4UK8Ck  → fantasma-astral (7 **raw GIFs, 4–8.5MB each** — fully ingested 2026-08-02 (follow-up pass, local download); NOT webm despite the original assumption below)
      ├── 4. PRESA BY ALAMO/                    1EmyEdjJTrxNlhtmhochI7bbXXJghF4Ff  → presa-alamo-paraiso (7 **raw GIFs, 8.5–83MB each** — fully ingested 2026-08-02 (follow-up pass, local download))
      ├── 5. SATELITE/                          1V5bcOuLc_NlLJh1AqHz7FEUH3Z9NrRwv  → satelite-futura-club (8 **raw GIFs, 5.2–19.5MB each** — fully ingested 2026-08-02 (follow-up pass, local download))
      ├── 6. HEROES BY VICENTE/                 1y9zQCnWYZ6mqb5ZIyhYvXs99pb9XPn0_  → heroes-vicente-jauregui (4 **raw GIFs, 38–49MB each** — fully ingested 2026-08-02 (follow-up pass, local download))
      ├── 7. WESTBOUND/                         1Cdb27J_5UEf7kIXDnd5M9aHZBiDXEUTA  → westbound-khameleon (6 webm, ~290KB–1.3MB each — fully ingested 2026-08-02; this is the one folder among 3–7 that actually matched the original webm assumption)
      ├── ARCHIVO DIGITAL/                      1lTUBDLmf-SMnJh3sVkL4fwYr_zLgtlkL  → archivo-digital (7 **raw GIFs, 16–65MB each, ~290MB total** — fully ingested 2026-08-02 (follow-up pass, local download))
      └── LA VERTICALIDAD ETC/                  17Gyq54ypY8JcOnupALrB3osW37eNx6I3  → la-verticalidad-desahuciada (9 usable **raw GIFs, 7.3–41.5MB each**, plus 1 GIF Dani's own filename marks as excluded and 1 screenshot PNG — fully ingested 2026-08-02 (follow-up pass, local download))
  ```

  **2026-08-02 follow-up pass:** the Drive MCP's 10MB-per-file download
  limit (see the enumeration correction below) fully blocked these 6
  folders in the first ingestion pass. Later the same day the user
  downloaded the entire Drive folder locally via the Drive web UI
  (to `~/Downloads/DANIVPONCE.XYZ`), which has no such size limit — every
  remaining source file converted cleanly from there. See
  `docs/plans/2026-08-02-director-role-and-video-sync.md`'s "Follow-up
  pass" section for the full breakdown, including two bugs found and fixed
  in `scripts/generate-video-variants.py` (a GIF alpha-pixel-format issue,
  and a `--all` bug that re-encoded already-ingested clips).

  No MP4s exist anywhere in this folder as of this writing.

  **2026-08-02 enumeration correction:** when this doc was first written,
  folders 3–7 were assumed to hold pre-compressed webm clips like
  `ERADE KAFI`/`HOY ERANDI` (based on `WESTBOUND`'s naming pattern looking
  similar). Actual enumeration showed only `WESTBOUND` matches that
  assumption — `FANTASMA ASTRAL`, `PRESA BY ALAMO`, `SATELITE`, and
  `HEROES BY VICENTE` are raw-GIF folders in the same size class as
  `ARCHIVO DIGITAL`. See
  `docs/plans/2026-08-02-director-role-and-video-sync.md`'s per-file status
  table for the full ingestion results and a new finding: the Drive MCP's
  download tool has a **hard 10MB-per-file limit** with no workaround (files
  over it fail immediately, with no fallback content to decode), which is
  why most of these newly-discovered GIF folders could not be ingested in
  this pass.

## 2. Format standard: WebM/VP9, 720p cap, video-only

Every ingested clip ships as a same-basename trio (mirrors the avif+jpg
pairing in the image pipeline):

- `<name>.webm` — VP9, video-only (no audio track — every source is a
  silent motion loop), height capped at **720px**, never upscaled (same
  "cap, don't stretch" rule as `MAX_WIDTH` in `generate-image-variants.py`).
  Encoded CRF-based (`-crf 32 -b:v 0` starting point) — tuned to pull the
  16–65MB raw GIFs down to a few MB each without visible banding on the
  kind of low-motion production-design footage these are.
- `<name>.jpg` — poster frame (first frame of the source), used as
  `<video poster>` and as the tier-1 layer described below.
- `<name>.placeholder.txt` — a tiny (~16px-wide) blurred JPEG of the first
  frame, base64-encoded, saved as a ready-to-paste
  `background-image: url(data:image/jpeg;base64,...)` CSS value. This is
  the tier-0 layer: it's inlined directly into the page's markup, so it
  costs zero extra network requests and paints before anything else loads.

A WebP tier was not considered for video the same way it was for stills —
WebM/VP9 already has broad-enough browser support in 2026 and MP4/H.264
isn't needed for these silent, short, low-bitrate loops.

## 3. Progressive loading (non-blocking, three tiers)

The existing carousel/role-rotation code already uses a "stack of layers,
crossfade opacity on load" idiom (`.carousel-layer.is-active` in
`css/style.css`, `showCarouselSlide()` in `js/main.js`). Video assets reuse
the same idiom instead of inventing a new one:

1. **Tier 0 — inline placeholder, zero network cost.** The
   `<name>.placeholder.txt` data-URI goes directly into the element's
   `style` attribute (`background-image: url(data:...)`) so it paints on
   first byte of HTML, before any image/video request fires.
2. **Tier 1 — poster frame.** `<video poster="<name>.jpg">` — the browser
   fetches this small JPEG immediately (default image loading priority);
   once it loads, JS toggles an `is-loaded` class that fades it in over
   tier 0, exactly like `.carousel-layer.is-active` does today.
3. **Tier 2 — full video, deferred.** `preload="none"` on the `<video>` so
   the browser never eagerly fetches video bytes. A small
   IntersectionObserver-based helper (new function alongside `initCarousel`
   in `js/main.js`) only sets `src` once the element nears the viewport,
   then fades the `<video>` in over the poster on its `canplay` event.

Markup shape:

```html
<div class="media-progressive" style="background-image:url(data:image/jpeg;base64,...)">
  <video class="media-video" muted loop playsinline preload="none"
         poster="<name>.jpg" data-src="<name>.webm"></video>
</div>
```

New CSS lives in `css/style.css` (shared visual styles, per the
`/staging`-first convention — `staging.css` stays layout/spacing-only): a
`.media-progressive` stack with `.media-video` opacity-transitioning in on
an `is-loaded` class, mirroring `.carousel-layer` transition timing.

This scaffolding (CSS + JS helper + the script's placeholder output) is
independent of any specific clip landing — it ships regardless of whether
the actual ingestion batch (§5) completes in this environment or gets
deferred.

## 4. Generation pipeline: `scripts/generate-video-variants.py`

Same shape as `scripts/generate-image-variants.py`: a one-off script (not a
build step) a maintainer runs manually, wrapping `ffmpeg` via subprocess.

```
python3 scripts/generate-video-variants.py <path-to-source.gif|webm|mov>
python3 scripts/generate-video-variants.py --all
```

Requires `ffmpeg` on PATH (`apt-get install ffmpeg` in a fresh environment
— not installed by default here). Caps height at 720px, writes the
`.webm`/`.jpg`/`.placeholder.txt` trio, and removes the original source
file once the canonical outputs exist (same stale-source cleanup the image
script does).

## 5. MP4 hosting policy

No MP4s exist in the source material today. If a future reel needs to ship
as MP4 (e.g. a compiled highlight reel Dani supplies directly as .mp4):

- Prefer **linking the Drive file directly** (its `viewUrl`, or a
  `uc?export=download` link if the file is set to "anyone with the link")
  over committing it to the repo, since Drive already serves it from
  Google's CDN.
- If Drive linking is unworkable (private sharing, playback UX), the next
  option is a small static asset host (e.g. Cloudflare R2, Bunny Stream) —
  not committing large MP4s into git.
- This mirrors the existing "revisit only if the corpus grows unwieldy"
  threshold from `docs/specs/2026-07-16-media-delivery.md` §1 — don't
  add a hosting dependency until the file sizes actually force it.

## 6. Brainstorm: automating future ingestion (not decided, not adopted)

Ideas for eventually syncing new Drive uploads into the repo without a
manual `generate-video-variants.py` run each time:

- **Trigger**: either Drive API `changes.watch` push notifications on the
  shared folder, or — simpler to operate, since this repo has no server —
  a scheduled GitHub Action (`schedule:` cron) that polls the folder via a
  service account and a stored `modifiedTime` cursor (a small
  `.last-sync` marker file) to find files added since the last run.
- **Pipeline**: the Action installs `ffmpeg`, downloads new sources,
  runs `generate-video-variants.py`, and commits the results.
- **Where it commits**: committing straight to `main` from CI is a
  deviation from this repo's "commit and push directly to `main`, no
  automation" spirit (`CLAUDE.md`) — treat this as needing explicit
  sign-off before ever wiring it up, not something to build silently.
- **Storage for originals**: git isn't a great long-term home for growing
  raw media (the ARCHIVO DIGITAL GIFs alone are ~290MB). If the corpus
  keeps growing, a bucket (Cloudflare R2, Bunny Stream, S3) could hold
  *original* sources, with the repo only ever holding the small
  webm/jpg/placeholder derivatives. Not adopted now — same "revisit when
  it's actually unwieldy" threshold as the MP4 policy above.

None of this is committed to — it's a starting point for a future
conversation, not a spec to implement.

## Out of scope for this phase

- Actually running the automated pipeline above.
- Object storage migration for originals.
- Backfilling MP4 support — no MP4 sources exist yet.
