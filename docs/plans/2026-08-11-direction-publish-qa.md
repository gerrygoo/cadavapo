# Direction section — pre-publish QA

**Goal:** Clear the defects blocking promotion of the DIRECTOR role
(`staging/directora.html` + the 9 `staging/proyectos/*.html` it links) from
`staging/` to the live site.

**Scope:** `staging/`, `css/style.css`, `js/main.js`, `js/translations.js`.
Promotion itself is a separate step and is not covered here — note that
`staging.css` has accumulated real visual styles (`.proyecto-tile`,
`.stills-grid`, `.ficha-tecnica`, `.proyecto-titulo`, `.media-progressive`,
…), so promoting is a *merge into `css/style.css`*, not a file move, and the
wireframe-only rules (`.wireframe-placeholder`, `.proyecto-tile-placeholder`)
should be left behind.

**Method (2026-08-11):** `scripts/qa-audit.mjs` — headless Chromium over
4 pages × 10 viewports, plus axe-core with the disclosure menus opened, a
`prefers-reduced-motion` pass, a flash-rate measurement, and a
portrait→landscape→portrait rotation trace. Re-run it after each fix.

**Baseline:** layout is structurally sound — zero horizontal overflow, zero
component overlap, zero text clipping, zero JS errors across the whole
matrix; no broken assets or links on any of the 10 pages. The defects are
in motion, accessibility, and untranslated content.

---

## Blockers

- [x] **Wireframe note is still user-visible.**
  `staging/proyectos/la-verticalidad-desahuciada.html:19` renders "reel
  pendiente — no hay link de YouTube en el documento fuente, confirmar con
  Dani". Either supply the reel or drop the placeholder block; it cannot
  ship as-is.

- [x] **Hover poster-flash text is unreadable.** `.proyecto-text` is
  `#111111` over a `rgba(0,0,0,0.55)` scrim over a photo — dark on dark.
  Measured contrast: **3.98:1** over a bright frame, **1.66:1** over a
  mid-grey one, **1.01:1** over a dark one (i.e. invisible). The scrim
  darkens the background but the text never lightens to match. Fix: white
  text while `.is-flashing` (`staging.css:207-222`).

- [x] **Poster-flash exceeds the seizure threshold.** Measured **4.50 Hz**;
  WCAG 2.3.1's general flash threshold is 3 Hz, and these are full-frame
  luminance changes, which is exactly what the threshold targets. The
  comment at `js/main.js:256` asserts "kept below ~4Hz" and is wrong twice
  over — 220 ms is 4.54 Hz. Raise `TILE_FLASH_INTERVAL_MS` to ≥340 ms and
  correct the comment.

- [x] **Dropdown ARIA is invalid.** `<ul role="listbox"><li><button
  role="option">` trips four axe violations on *every* page —
  `aria-required-children` and `aria-required-parent` (critical),
  `listitem` and `aria-input-field-name` (serious) — because `<li>` is not
  a permitted child of `listbox` and the options' required parent is
  therefore not their parent. Compounding it, arrow keys do nothing:
  focus stays on the toggle, so the page claims a widget it doesn't
  implement. Both menus are really *disclosure* menus; dropping
  `role="listbox"`/`role="option"` for a plain `<ul>` of links/buttons
  fixes all four violations and the keyboard expectation at once
  (`js/main.js:311-322`, `staging/index.html:33-36`, and the `lang-list`
  markup on every page).

- [x] **`prefers-reduced-motion` is only half-wired.** Honored by the logo
  drift, the carousel and the tile flash; **ignored** by the 7 looping
  clips on a project page, by `.bg-video` on the landing page, and by the
  role-text rotator (verified still rotating under `reducedMotion:
  'reduce'`). `initProgressiveVideos` and `initRoleRotation` need the same
  `matchMedia` guard the other three already use.

- [x] **No way to stop the motion (WCAG 2.2.2).** A project page autoplays
  7 looping clips, none with `controls`, and offers no pause affordance.
  Anything that starts automatically and runs past 5 s needs one.

---

## Content / i18n

- [x] **Project detail pages are ~90% untranslated.** In English the page
  showed "credits" followed by 18 Spanish labels (`Dirección`,
  `Producción`, `Dirección de fotografía`, …). All 111 `<dt>` labels across
  every project page now carry a `creditos.*` key. Scoped to labels by
  decision: credited names stay as each production credited them, and the
  values are still Spanish — including the `Tipo` values ("Videoclip",
  "Exploración de no ficción · 5'55\"") and the two synopses. Worth a second
  pass if the English page should read fully English.

- [x] **Two `aria-label`s never translate at all** — `"Vista de galería"`
  (`stills-toolbar`) and `"Filtrar por categoría"` (`proyectos-filter`);
  neither has a `data-i18n` binding.

- [x] **The Spanish role list is 3/5 English.** Was `dirección creativa`,
  `artista audiovisual`, then `production designer`, `art historian`,
  `set dresser`. Spanish now uses this file's own established terms for the
  same work (`diseño de producción`, `decoración de set`) plus
  `historiadora del arte`. **Dani should confirm the wording** — these are
  her own professional titles. The other 13 languages still carry the same
  three English entries; out of scope for this promotion.

- [ ] **Non-ES/EN languages render worse than untranslated.** No language
  beyond `es`/`en` has a `proyectos` block, so `getNestedKey` returns
  `undefined` and the element keeps its Spanish text — while
  `document.documentElement.dir` is still switched. Arabic therefore gets
  an RTL layout full of Spanish, with the `←` back arrow pointing the
  wrong way. Either gate `dir` on translation coverage or hide the
  untranslated languages from the picker.

- [x] **`&` vs `y`** — four pages join credits with `&`
  (`erade-kafi`, `hoy-erandi`, `heroes-vicente-jauregui`,
  `la-verticalidad-desahuciada`), four with `y` (`presa-alamo-paraiso`,
  `fantasma-astral`, `satelite-futura-club`, `archivo-digital`). Pick one.

- [x] **Dani's own name appeared in three forms** across the credits —
  `Dani Ponce`, `Daniela Vázquez Ponce` (presa, fantasma, satélite) and
  `Daniela V. Ponce` (archivo). Standardized to **`Daniela Ponce`**, which
  the eight non-director project pages were already using, so the director
  pages were the outliers. Scoped to `<dd>` credits only — the 26 `<title>`s,
  5 `aria-label`s and the sliced-letter wordmark keep `Dani Ponce`, which is
  the brand rather than a credit.

- [x] **Same person, two names on one page.** `fantasma-astral.html`:
  `Aza Arroyo` under Producción, `Azael Arroyo` under Dirección de
  fotografía and Edición.

- [x] **Same role, two labels.** `BTS` (westbound) vs `Behind the scenes`
  (erade-kafi); `PA` (fantasma) vs `Asistencia de producción` (presa).
  (`Gaffer`, `Data manager`, `Picture car` are standard loanwords in
  Mexican crew credits — leaving those.)

- [ ] **Title case is inconsistent.** `La Verticalidad Desahuciada` and
  `Archivo Digital` are title-cased; `Fantasma astral` and `El refinado
  arte de extrañar` are sentence-cased. Spanish convention is sentence
  case, but these are work titles — confirm before changing.

- [x] **EN category labels.** `music video` is singular for 7 items
  (→ `music videos`); `non-fiction explorations` is long enough to wrap
  the filter chip onto a second row at 390px.

- [x] **Accents on credited names.** `Vicente Jauregui` → `Vicente Jáuregui`
  (20 occurrences) and `Alamo Paraiso` → `Álamo Paraíso` (11), applied to
  every display surface including `<title>`. URL slugs stay ASCII
  (`heroes-vicente-jauregui.html`, `presa-alamo-paraiso.html`) so no links
  or asset paths moved.

---

## Layout

- [x] **Tiles are empty boxes on every touch device** — *reviewed, keeping
  as-is.* The `data-posters` imagery is bound to `mouseenter` only, so on a
  phone all 9 tiles render as blank rectangles with corner text. Raised as
  the most visible issue for the promotion; Dani confirmed the text-only
  grid is the intended minimal look and the flash is a pointer-only bonus.
  Recorded here so it doesn't get re-reported as a defect.

- [x] **Orientation is the wrong axis for the grid breakpoint.**
  `staging.css:136,144` switches on `orientation`, so a 768px iPad in
  portrait gets the *narrow* single-column layout while a 568px phone in
  landscape gets the *two-column* grid — the narrower device gets the
  wider layout. Should be a width query (~`min-width: 700px`). Keep
  `orientation` for `.bg-video` in `css/style.css`, where it is genuinely
  the right test.

- [x] **Filter state silently stops applying on rotation.** Traced:

  ```
  filtered to no-ficcion   390×844  filterBar=true   filter=no-ficcion  tiles=2
  ROTATED to landscape     844×390  filterBar=false  filter=no-ficcion  tiles=9
  rotated back             390×844  filterBar=true   filter=no-ficcion  tiles=2
  ```

  It recovers, so nothing is broken, but in landscape the filter is
  ignored *and* the bar that set it is `display:none`, so there is no way
  to see why the selection stopped mattering. Largely dissolves once the
  breakpoint above is width-based.

- [x] **`.back-link` is a 113×16px target** on all 9 project pages —
  under the WCAG 2.5.8 24×24 minimum.

- [x] **Landing page has no `<h1>`.** `role="img"` on the `<h1>`
  (`index.html:14`, `staging/index.html:15`) strips its heading
  semantics; axe reports `page-has-heading-one`. Also `aria-live="polite"`
  on `.role` announces a new role every 3–4 s indefinitely to screen
  readers — it should not be a live region while it rotates on a timer.

---

## Follow-ups (not blocking)

- [ ] **Add visual-regression coverage.** `scripts/qa-audit.mjs` asserts
  structure, which is why it reported a clean layout while the tiles were
  rendering as empty boxes — assertions cannot catch "looks wrong". Per
  viewport screenshot baselines (Playwright `toHaveScreenshot`, or
  BackstopJS) would close that gap, and this design *is* the product.

- [ ] **Real-device rotation — untested, not a known break.** The harness's
  "rotation" step only resizes the viewport box. Measured, that means:

  ```
  events fired         : resize            (no orientationchange, no
                                            screen.orientation change)
  screen.orientation   : angle 0, "landscape-primary"  — before AND after
                         being resized to a 390×844 portrait box
  window.orientation   : undefined
  ```

  Two of those don't matter here: nothing in the site's JS listens for
  rotation (layout is pure CSS reflow), and since the proyectos grid moved
  off `orientation:` to width queries, no layout depends on the orientation
  media feature at all.

  What a desktop browser genuinely cannot reproduce is **`100vh` under a
  mobile URL bar**. On iOS Safari and Chrome Android `100vh` resolves to the
  *large* viewport (toolbars retracted), which is taller than what's on
  screen while they're shown — and rotating changes that geometry, which is
  where it surfaces. Affected:

  - `css/style.css:696` `body.page-landing { min-height: 100vh }`
  - `staging/staging.css:4` `body.page-staging { min-height: 100vh }`
  - `css/style.css:656` `.lang-list { max-height: 60vh }`
  - `css/style.css:741-742` `.bg-video` portrait `width:100vh; height:100vw`

  For the first three the fix is the standard two-line progressive
  enhancement (`min-height: 100vh; min-height: 100dvh;`) — old browsers keep
  `vh`, new ones track the dynamic viewport. `.bg-video` is the subtle one:
  it's a `position:fixed` cover, so `dvh` would make it resize as the
  toolbar collapses mid-scroll, and `lvh` (largest viewport) is probably
  what it wants instead. That one should be confirmed on a real phone
  before changing, since it's on the live landing page.

- [ ] **Tier 1 of the progressive-video system never displays.** Found while
  adding the pause control. `is-loaded` is toggled on the *video's*
  `canplay`, so the element sits at `opacity: 0` until video data arrives
  and the poster JPEG — already downloaded — is never shown on its own.
  Measured on a 120 kB/s throttle: first visible at **t=5145ms, readyState
  3**. So the viewer watches the 16px tier-0 blur for five seconds with a
  sharp poster decoded and hidden behind it. The three tiers in
  `docs/specs/2026-08-02-video-ingestion.md` §3 are really two in the normal
  playback path. Fix is small (reveal at observe time, not at `canplay`);
  see that spec's "Implementation notes" for why the spec's "fade the video
  in over the poster" isn't literally achievable.

---

## Consolidated backlog (2026-08-11)

Everything still open across all three plan documents, in one place. Each
line says which document owns it.

**Needs Dani — nothing can proceed without an answer:**

| Item | Owner doc |
|---|---|
| Title casing: `La Verticalidad Desahuciada` vs `Fantasma astral` | this |
| `sophia-warren-bor` / `KiN6by3OiZc` — real title, or drop/rename? | director-role |
| Advertising tiles listed on *both* `diseno-produccion` and `decoracion` — intended? | mock-completeness |
| "diseño de producción" reel — compiled reel, or embed one of the 5? | mock-completeness |
| Poli's site URL for "otros trabajos" | mock-completeness |
| Stills carousel vs. grid (the grid/list toggle may already settle it) | mock-completeness |
| Separate free-text "créditos" block — still wanted now the ficha is full? | mock-completeness |
| Wireframe "row of thumbnails" reel treatment — still wanted? | mock-completeness |
| Short/feature films + "Robe Grill" — undocumented anywhere | director-role |

**Actionable without input:**

| Item | Owner doc |
|---|---|
| Tier 1 poster never displays (above) | this |
| `dvh` fallback for the three straightforward `100vh` uses | this |
| `.bg-video` `lvh` — needs a real phone first | this |
| `about` nav link is still `href="#"` | mock-completeness |
| 6 pages still render `wireframe-placeholder` (none on the direction path) | mock-completeness |
| Click-to-expand / lightbox on stills | mock-completeness |
| 13 partial languages apply `dir="rtl"` over Spanish fallback text | this |
| Visual-regression baselines (see below) | this |
| Lighthouse run (axe leg is clean; Lighthouse itself unrun) | mock-completeness |

**Promotion mechanics, when the direction section ships:** `staging.css`
carries real visual styles now, so it is a *merge into `css/style.css`*,
not a file move — and `.wireframe-placeholder` / `.proyecto-tile-placeholder`
must be left behind.
