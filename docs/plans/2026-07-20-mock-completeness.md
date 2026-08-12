# Mock-completeness

**Goal:** Bring `staging/` up to full parity with the hand-drawn wireframes in
`assets/wireframes/bosquejo-0{1,2,3}.jpeg`, so `staging/` can graduate to the
live pages.

**Scope:** Only work in `staging/` (per CLAUDE.md: layout/design work lands
in `staging/` first). Shared behavior/styles still live in
`css/style.css` and `js/`; `staging.css` is spacing-only.

**Baseline coverage (2026-07-20):** landing ~60%, proyectos ~40%,
ficha de proyecto ~35%. Gaps enumerated below.

> **Status review 2026-08-11.** This plan predates two structural changes and
> had drifted badly out of sync with the repo (20 boxes open, 1 checked,
> while most of the work had in fact shipped). Every item below was
> re-checked against the actual files and is now marked one of:
> **done** (verified in the repo), **superseded** (the plan's premise no
> longer holds), or still open. The two changes that invalidated whole
> sections:
>
> 1. **`staging/proyectos.html` never happened.** The single projects page
>    was replaced by per-role pages — `staging/{directora,diseno-produccion,
>    decoracion}.html` — so bosquejo-02's categorisation tasks are moot as
>    written. What survives of that section is folded into "Still open".
> 2. **`staging.css` is no longer spacing-only.** It now carries real
>    visual styles (`.proyecto-tile`, `.stills-grid`, `.ficha-tecnica`,
>    `.proyecto-titulo`, `.media-progressive`, …). Graduation is therefore a
>    *merge into `css/style.css`*, not a file move. See
>    `2026-08-11-direction-publish-qa.md`.

---

## bosquejo-01 — Landing (`staging/index.html`)

- [x] **Restore rotating role text.** — done; `<p class="role">` is present
  and `initRoleRotation` drives it. (The `aria-live="polite"` the original
  item called for was later *removed* on purpose: the text rotates on a
  timer, so a live region announced a new role every few seconds forever.)
- [x] **Wire the carousel layer swap.** — **superseded.** The landing page
  no longer has a carousel; it has the nav. The only remaining `.carousel`
  markup in `staging/` is `decoracion.html`. The CSS and `initCarousel()`
  still exist and still work, but nothing on the promotion path uses them.
- [ ] **Give `about` a real destination.** Still `href="#"` in
  `staging/index.html` — a visibly dead nav link. `contacto` from the
  original item no longer exists in the nav; `otros trabajos` points at
  `https://pdi.rip/`.
  **Reclassified 2026-08-11: this needs Dani, it is not actionable.** The
  design spec (`docs/specs/2026-06-06-danivponce-design.md:14`) records that
  the about copy was never written, so there is nothing to link *to*. When
  the direction section was promoted the link was simply left out of the
  live nav — a missing link beats a dead one on the front page — and it
  survives only on the staged landing page.

---

## bosquejo-02 — Proyectos — **superseded as a section**

The categorisation decided on 2026-07-20 assumed one `proyectos.html` with
*dirección creativa* / *diseño de producción* / *otros proyectos* headings.
The site instead has a page per role. Recording the outcome of each task so
the reasoning isn't lost, rather than pretending they're still pending:

- [x] **"dirección creativa" carousel** — superseded. That role became
  `staging/directora.html`, and it is no longer empty: 9 fully-credited
  projects, delivered by `2026-08-02-director-role-and-video-sync.md`.
- [x] **"diseño de producción" — 5 real tiles** — done; all five ficha
  pages exist (`eden-munoz-{la-plata,un-monton-de-estrellas}`,
  `sophia-warren-{purple,static,bor}`).
- [ ] **"diseño de producción" reel** — still open, still blocked on Dani
  supplying a compiled reel (or a decision to embed the strongest of the 5).
- [ ] **Poli's site link** — still open, still needs the URL from Dani.
- [x] **Advertising tiles moved out of "diseño de producción"** —
  superseded, and worth a look: the 4 advertising projects
  (`coffee-mate-nescafe`, `didi-food`, `luis-angel-el-flaco`,
  `reality-club-cinepolis`) are now listed on **both**
  `diseno-produccion.html` *and* `decoracion.html`. That may well be
  correct — Dani did both jobs on those shoots — but it is duplication
  rather than the "move" this item asked for. **Confirm with Dani whether
  both listings are intended.**
- [x] **Deduplicate nav** — done; each page renders `staging-nav` once.

---

## bosquejo-03 — Ficha de proyecto (`staging/proyectos/*.html`)

- [x] **Create 5 new ficha pages for the music videos.** — done.
- [x] **Role-attribution subtitle.** — done differently. Rather than a
  role subtitle, the heading splits into title + artist
  (`.proyecto-titulo-title` / `.proyecto-titulo-artist`, 18 pages). The
  role is carried by which role page you arrived from. Closing as solved.
- [ ] **Reel slot.** Partially done — 20 of 21 project pages embed a
  YouTube reel. Remaining gap is the "row of thumbnails" treatment the
  wireframe showed, which was never built; the stills grid sits where it
  would have gone. Decide whether that's still wanted.
- [ ] **Stills: carousel vs. grid.** Still undecided with Dani. Current
  implementation is a masonry grid with a grid/list toggle — note that the
  toggle is a third option the wireframe didn't have, and it may already
  settle this.
- [ ] **Click-to-expand on thumbnails.** Still open; stills are not
  interactive. (Related: the clips are `<video>` elements now, so "expand"
  means a lightbox that plays, not just a larger JPEG.)
- [x] **Ficha técnica: fill it out.** — done, and then some: 111 `<dt>`
  credits across 21 pages, all now i18n-keyed
  (`2026-08-11-direction-publish-qa.md`).
- [ ] **Créditos block.** Still open — no free-text credits panel separate
  from the ficha table. May be redundant now that the ficha is complete;
  worth confirming before building.

---

## Postponed / follow-up

- [x] **URL → title mapping for the 5 music videos — 4 of 5 resolved
  2026-08-02** via Dani's portfolio Google Doc (see
  `docs/specs/2026-08-02-video-ingestion.md` §1 for the doc link/id):
  `77DRtiPY9b4` → eden-munoz-la-plata, `afoiE74JpL0` →
  eden-munoz-un-monton-de-estrellas, `QqonNRbqPZE` → sophia-warren-purple,
  `1ii-qhgpx_Q` → sophia-warren-static.
  - [ ] **`sophia-warren-bor` / `KiN6by3OiZc` stays unmapped** — confirmed
    still unmapped 2026-08-11 (no embed on the page). The doc never mentions
    a "BOR" title. Ask Dani whether it's a real third project or should be
    dropped/renamed. Duplicated in
    `2026-08-02-director-role-and-video-sync.md`; that copy is the live one.

---

## Graduation criteria

Before carrying `staging/` over to the live pages:

- [ ] All boxes above checked, OR the remaining gaps explicitly accepted
  (noted here with rationale).
- [ ] **Six pages still render `wireframe-placeholder`** and cannot ship:
  `sophia-warren-{purple,static,bor}`, `eden-munoz-{la-plata,un-monton-de-estrellas}`,
  `bellakath-minina`. (None are on the direction path — the director pages
  are clear as of 2026-08-11.)
- [x] Manual pass per CLAUDE.md testing standards: browser check in ES + EN,
  mobile + desktop, no console errors, all image paths resolve. — automated
  as `scripts/qa-audit.mjs`; run it rather than doing this by hand.
- [ ] Lighthouse a11y pass ≥ 95 on each staged page. The axe-core leg of
  `qa-audit.mjs` reports 0 violations on the four direction pages, which is
  most of what Lighthouse's a11y score measures, but Lighthouse itself has
  not been run.
