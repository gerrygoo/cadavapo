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

- [ ] **"dirección creativa" carousel.** Currently a dashed
  wireframe placeholder ("sin proyectos asignados aún"). Replace with a
  real transitioning-image carousel where click leads to that project's
  detail page. Blocked on: dirección-creativa project content — check
  with Dani whether any projects should live here yet, otherwise leave
  the placeholder and note it in the file.
- [ ] **"diseño de producción" — reconcile tile count with wireframe.**
  Wireframe shows `x2 >`; grid currently renders 4 tiles
  (coffee-mate-nescafe, didi-food, reality-club-cinepolis,
  luis-angel-el-flaco). Either update the sketch or trim the grid — ask
  Dani which two are the canonical "diseño de producción" pieces.
- [ ] **"diseño de producción" reel.** The wireframe shows a wide top
  element above the tiles (the reel). Currently a "próximamente"
  placeholder. Add the reel embed slot (video or looping GIF) once
  media is delivered — see `docs/specs/2026-07-16-media-delivery.md`.
- [ ] **"otros proyectos" — link to Poli's site.** Wireframe explicitly
  notes "link directo a la web de Poli RIP". Replace the three empty
  `.proyecto-tile-placeholder` divs with three tiles that link out to
  Poli's site (get URL from Dani).
- [ ] **Deduplicate nav.** `staging-nav` renders both mid-page and
  implicitly at the top; the wireframe places it once. Pick one location
  and remove the other on this page.

---

## bosquejo-03 — Ficha de proyecto (`staging/proyectos/*.html`)

Reference file: `staging/proyectos/coffee-mate-nescafe.html`. Apply
each fix to all four ficha pages.

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

## Graduation criteria

Before carrying `staging/` over to the live pages (`index.html`,
`proyectos.html`, `proyectos/*.html`):

- [ ] All boxes above checked, OR the remaining gaps are explicitly
  accepted (noted here with rationale).
- [ ] Manual pass per CLAUDE.md testing standards: browser check in
  ES + EN, mobile + desktop, no console errors, all image paths resolve.
- [ ] Lighthouse a11y pass ≥ 95 on each staged page.
