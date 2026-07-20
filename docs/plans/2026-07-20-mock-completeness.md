# Mock-completeness

**Goal:** Bring `staging/` up to full parity with the hand-drawn wireframes in
`assets/wireframes/bosquejo-0{1,2,3}.jpeg`, so `staging/` can graduate to the
live pages.

**Scope:** Only work in `staging/` (per CLAUDE.md: layout/design work lands
in `staging/` first). Shared behavior/styles still live in
`css/style.css` and `js/`; `staging.css` is spacing-only.

**Baseline coverage (2026-07-20):** landing ~60%, proyectos ~40%,
ficha de proyecto ~35%. Gaps enumerated below.

---

## bosquejo-01 — Landing (`staging/index.html`)

- [ ] **Restore rotating role text.** `<p class="role" aria-live="polite">`
  is present on live `index.html` but was removed from
  `staging/index.html` when the carousel was added. Add it back under the
  logo; the fade rotation already runs from `js/main.js` as long as the
  element exists.
- [ ] **Wire the carousel layer swap.** `staging/index.html` has two
  `.carousel-layer` `picture` elements but the second one has empty
  `src`/`srcset`. Confirm `js/projects.js` actually rotates
  stills across the two layers; if not, wire it. Success = stills visibly
  cross-fade in the browser without console errors.
- [ ] **Give `about` and `contacto` real destinations.** Both nav links
  are `href="#"`. Either create placeholder pages
  (`staging/sobre-mi.html`, `staging/contacto.html`) matching the
  wireframe's "imágen fija + texto + PDF de CV" / "imágen fija +
  imágenes y texto" specs, or downgrade the nav until those pages exist.

---

## bosquejo-02 — Proyectos (`staging/proyectos.html`)

**Categorization (decided 2026-07-20):**

- *dirección creativa* — no projects yet.
- *diseño de producción* — the 5 music videos scaffolded under
  `assets/projects/{eden-munoz-*,sophia-warren-*}/`. All 5 render as
  separate tiles for now; if space becomes tight, the 3 Sophia Warren
  visualizers can collapse into a single tile that expands to all three.
  (Wireframe called for `x2 >` — superseded, sketch is out of date.)
- *otros proyectos* — folds in **both** (a) Poli's site link and (b)
  the 4 advertising projects Dani worked on as set dresser under Natalia
  Aguilera (coffee-mate-nescafe, didi-food, luis-angel-el-flaco,
  reality-club-cinepolis). No separate "advertising" section on the page.

Concrete tasks:

- [ ] **"dirección creativa" carousel.** Currently a dashed
  wireframe placeholder ("sin proyectos asignados aún"). Leave the
  placeholder until Dani assigns content — no work here for now.
- [ ] **"diseño de producción" — 5 real tiles.** Replace the current 4
  advertising tiles (which are miscategorized here) with 5 tiles
  pointing at the new music-video ficha pages
  (`staging/proyectos/{eden-munoz-la-plata,eden-munoz-un-monton-de-estrellas,sophia-warren-purple,sophia-warren-static,sophia-warren-bor}.html`).
  Tiles render as `.proyecto-tile-placeholder` (dashed border, no img)
  until stills land per `docs/specs/2026-07-16-media-delivery.md`.
- [ ] **"diseño de producción" reel.** Reel slot above the tiles.
  Blocked on media delivery (Dani supplies a compiled reel or we embed
  the strongest of the 5 YouTube videos).
- [ ] **"otros proyectos" — Poli's site link.** Add tiles linking out
  to Poli's site (get URL from Dani).
- [ ] **"otros proyectos" — advertising tiles.** Move the 4 existing
  tiles (coffee-mate-nescafe, didi-food, luis-angel-el-flaco,
  reality-club-cinepolis) from "diseño de producción" to "otros
  proyectos". They still point at the same ficha pages.
- [ ] **Deduplicate nav.** `staging-nav` renders both mid-page and
  implicitly at the top; the wireframe places it once. Pick one location
  and remove the other on this page.

---

## bosquejo-03 — Ficha de proyecto (`staging/proyectos/*.html`)

Reference file: `staging/proyectos/coffee-mate-nescafe.html`. Apply
each fix to all four existing (advertising) ficha pages AND to the
5 new music-video ficha pages once they exist (see next section).

- [ ] **Create 5 new ficha pages for the music videos.** Copy the
  existing template to
  `staging/proyectos/{eden-munoz-la-plata,eden-munoz-un-monton-de-estrellas,sophia-warren-purple,sophia-warren-static,sophia-warren-bor}.html`.
  Each with the wireframe layout below; stills/reel blank until media
  lands.

- [ ] **Role-attribution subtitle.** Wireframe title reads "DIRIGIDO POR
  DANI PONCE / DISEÑO DE PRODUCCIÓN POR DANI PONCE". Add a subtitle
  under `.proyecto-titulo` for each project's role (varies per
  project — director / production designer / etc.).
- [ ] **Reel slot.** Wireframe shows a row of thumbnails representing
  the reel above the stills. Add a reel embed slot (or looping preview)
  per project where one exists.
- [ ] **Stills: carousel vs. grid.** Wireframe describes a carousel of
  GIFs and/or stills; current implementation is a static masonry grid.
  Decide with Dani: keep the grid (more scannable), or swap to a
  carousel (matches sketch). Note the choice in this file when made.
- [ ] **Click-to-expand on thumbnails.** Wireframe says clicking a
  thumbnail leads to ficha técnica y/o vista ampliada. Current images
  aren't interactive. Add a lightbox / expand-on-click behavior.
- [ ] **Ficha técnica: fill it out.** Every page currently has only
  `<dt>Dirección</dt><dd>Nico Ureta</dd>` (and only for
  coffee-mate-nescafe). Collect year, client, director, DP, production
  designer (Dani), full credits per project.
- [ ] **Créditos block.** Wireframe shows a "texto con créditos del
  proyecto" panel separate from the ficha técnica table. Add a
  free-text credits block below the ficha.

---

---

## Postponed / follow-up

- [ ] **URL → title mapping for the 5 music videos.** Video IDs
  `77DRtiPY9b4`, `afoiE74JpL0`, `QqonNRbqPZE`, `1ii-qhgpx_Q`,
  `KiN6by3OiZc` need to be paired to
  `{eden-munoz-la-plata, eden-munoz-un-monton-de-estrellas,
  sophia-warren-purple, sophia-warren-static, sophia-warren-bor}`.
  YouTube is proxy-blocked from this environment; Dani can do it in one
  click-through pass. Once mapped, fill the `Source:` line in each
  section of `assets/projects/README.md` and swap the reel embed URLs
  into the ficha pages.

---

## Graduation criteria

Before carrying `staging/` over to the live pages (`index.html`,
`proyectos.html`, `proyectos/*.html`):

- [ ] All boxes above checked, OR the remaining gaps are explicitly
  accepted (noted here with rationale).
- [ ] Manual pass per CLAUDE.md testing standards: browser check in
  ES + EN, mobile + desktop, no console errors, all image paths resolve.
- [ ] Lighthouse a11y pass ≥ 95 on each staged page.
