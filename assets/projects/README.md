# Project asset provenance

**Delivery format:** every still ships as a `<name>.avif` + `<name>.jpg`
pair (see `docs/superpowers/specs/2026-07-16-media-delivery.md`). Some of the
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

## Reality Club Cinépolis (`reality-club-cinepolis/`)

- Dir: Agustín Calles - Bárbara Merlos
- DP: Pablo Chávez
- Diseño de producción: Natalia Aguilera
- Decoración: **Daniela Ponce** - Gabriel García
- 1 still (`still-01.avif`), pulled from a browser HAR capture at 1200×600
  (same LQIP situation as above — solved via HAR, not manual save-as).

## Coffee Mate - Nescafé / Bomba Films (`coffee-mate-nescafe/`)

- Dir: Nico Ureta
- Dop: Yordi Planell
- Dirección de arte: Natalia Aguilera
- Mexico, 2023
- 6 stills, full resolution from the site export.

## Didi Food (`didi-food/`)

- Dir: Sebastián Teitán
- Diseño de prod: Natalia Aguilera
- Productora: Central Films
- Mexico, 2025
- 4 stills, full resolution from the site export. Only found after a full
  28-page site export — the initial single-page export missed this case
  study entirely (it's a separate page on the source site).
