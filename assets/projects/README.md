# Project asset provenance

**Delivery format:** every still ships as a `<name>.avif` + `<name>.jpg`
pair (see `docs/specs/2026-07-16-media-delivery.md`). Some of the
files originally sourced below had mislabeled extensions (AVIF-encoded bytes
saved as `.png`/`.jpg`); these were corrected in place. When adding a new
still, run `python3 scripts/generate-image-variants.py <path-to-source>` to
generate the avif/jpg pair — don't hand-add files with the wrong extension.

Stills below were sourced from a Wix export of `www.nataliaaguilera.com`
(Dani's former employer — Dani worked as Natalia Aguilera's direct report on
these projects). Cross-referenced against the project list Dani provided.
Not a general asset library — only include what's credited to Dani's work.

**Rights note:** these are production stills crediting a full crew (director,
DP, production designer, stylist, etc.) beyond just Dani and Natalia. Confirm
usage rights before publishing any of these publicly.

No YouTube/Vimeo links exist for any of these four projects — checked both a
static HTML export and a full page-load HAR capture of the site; the only
YouTube embeds on the whole site are on unrelated music-video case studies.

## Luis Ángel - El Flaco (`luis-angel-el-flaco/`)

- Concierto
- 1 still (`still-01.avif`), pulled from a browser HAR capture at
  2154×726 — the static crawler only ever captured a 111×47 LQIP placeholder
  for this image; the HAR capture solved it, no manual save-as needed after all.
- A 2026-07-16 re-supply attempt (11 named frames) only yielded two usable
  stills (a higher-res version of the existing angle, plus one new wide/smoke
  shot); the other nine were duplicated title/credits-card frames — one of
  which was actually mislabeled Reality Club Cinépolis content, not this
  project's. Not incorporated yet — pending a clean re-capture.

## Reality Club Cinépolis (`reality-club-cinepolis/`)

- Dir: Agustín Calles - Bárbara Merlos
- DP: Pablo Chávez
- Diseño de producción: Natalia Aguilera
- Decoración: **Daniela Ponce** - Gabriel García
- 4 stills (`bonbon_wide`, `calle_zoom`, `lab_wide_rayos`, `luna`), 2026-07-16
  replacement of the original single 1200×600 HAR-capture still — Dani
  supplied full-resolution frames directly (~2600×1480 native), superseding
  the site-crawl capture entirely.

## Coffee Mate - Nescafé / Bomba Films (`coffee-mate-nescafe/`)

- Dir: Nico Ureta
- Dop: Yordi Planell
- Dirección de arte: Natalia Aguilera
- Mexico, 2023
- 6 stills, full resolution from the site export. A 2026-07-16 re-supply
  attempt only yielded one usable frame (a duplicate of the existing
  `still-01` angle) plus five duplicated title/credits-card frames, so it
  was not incorporated — these stills are still pending a clean re-capture.

## Didi Food (`didi-food/`)

- Dir: Sebastián Teitán
- Diseño de prod: Natalia Aguilera
- Productora: Central Films
- Mexico, 2025
- 7 stills (`mesa_cenital`, `repartidor`, `sala_4_amix`, `escaleras_4_amix`,
  `junta_close`, `junta_kangre`, `junta_wide`), 2026-07-16 replacement of the
  original 4-still site-crawl export — Dani supplied full-resolution frames
  directly (~2260×1270 native), superseding the site-crawl captures entirely.
