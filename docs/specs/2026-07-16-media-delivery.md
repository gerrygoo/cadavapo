# danivponce.xyz — Media Content Delivery Stack

**Date:** 2026-07-16
**Scope:** Project stills storage/delivery + carousel implementation in `staging/index.html`

## Context

`docs/specs/2026-06-06-danivponce-design.md` explicitly deferred
carousel content as a non-goal ("no carousel content — no assets yet").
`assets/projects/` now has real stills for 4 projects (see
`assets/projects/README.md` for credits/provenance), and
`staging/index.html` has a `.carousel-placeholder` div waiting to be wired
up. This doc covers hosting, formats/sizing, lazy-loading, and how the
carousel cycles through stills.

## Decisions

### 1. Hosting: in-repo static assets, no external CDN/object storage

The corpus is small (12 stills, well under 1MB total after re-encoding) and
this is a static-hosted site with no server (Netlify / Vercel / GitHub Pages
/ Cloudflare Pages, no build step). Every one of those hosts already serves
static files from its own CDN edge network, so a separate object-storage
service would add an account/dependency/cost for no delivery benefit at this
scale. Revisit only if the corpus grows to the point that repo size or git
history becomes unwieldy (hundreds of MB of media).

### 2. Formats: `<picture>` with AVIF primary + JPEG fallback

Each still ships as a same-basename pair: `<name>.avif` (primary,
significantly smaller) and `<name>.jpg` (universal fallback, used as the
`<img src>`). A WebP tier was considered and dropped — AVIF browser support
is high enough in 2026 that a third tier isn't worth the extra generated
files and markup complexity; the JPEG fallback alone covers the remaining
older browsers.

```html
<picture>
  <source type="image/avif" srcset="/assets/projects/<slug>/<still>.avif">
  <img src="/assets/projects/<slug>/<still>.jpg" alt="…" loading="lazy" decoding="async">
</picture>
```

The carousel's single `<img>` uses `loading="eager"` only for the
first-painted still (progressive enhancement / no-JS fallback); any future
non-carousel use of these stills (e.g. a projects page) should use
`loading="lazy" decoding="async"`.

### 3. Sizing: no responsive `srcset` width ladder for now

A width ladder (multiple downscaled copies + `srcset`/`sizes`) only pays off
when a large source image would otherwise be over-fetched by small
viewports. Auditing the current stills found native widths ranging
471–1708px — several are already ~480px wide, and the largest (1708px) was
simply capped to 1600px. There's no meaningfully larger rung to shed for any
current asset, so building unused srcset machinery now would be pure
overhead.

**Rule for future assets:** if a new still's native width exceeds ~1600px
*and* there's a concrete case for saving bytes on small viewports, generate
one additional smaller rung (~800w) and add `srcset`/`sizes` at that point.
Below that threshold, ship the single (possibly downscaled-to-1600) size in
both formats, same as today.

### 4. Generation pipeline: `scripts/generate-image-variants.py`

A one-off Pillow-based script (not a build step — the site still has zero
build tooling) that a maintainer runs manually whenever a still is added or
replaced:

```
python3 scripts/generate-image-variants.py assets/projects/<project>/<source-image>
python3 scripts/generate-image-variants.py --all   # rebuild everything
```

It caps long-edge width at 1600px (never upscales), writes `<name>.avif` and
`<name>.jpg`, and removes the original source file if it wasn't already one
of those two canonical outputs. Running it against the existing corpus also
fixed a data-quality issue discovered during this work: several files had
mislabeled extensions (`coffee-mate-nescafe/still-01.jpg` and `still-02.png`,
and all four `didi-food/*.png`, were actually AVIF-encoded bytes), and three
`coffee-mate-nescafe` PNGs were needlessly heavy (up to 830KB for photos
under 900px wide) — both classes of issue are now normalized into properly
re-encoded avif/jpg pairs.

### 5. Carousel mechanics

Rather than mounting one DOM element per slide, the carousel is a single
`<button class="carousel">` wrapping one `<picture>` whose
`source[srcset]`/`img[src, alt]` get swapped on a timer — the same
content-swap-and-fade shape `js/main.js`'s existing role rotation already
uses (`initRoleRotation`), just applied to an image instead of text.

- **Data:** `js/projects.js` lists each project's slug, display title, and
  still basenames, mirroring the structure of `js/translations.js`. The
  carousel flattens all projects' stills into one ordered sequence.
- **Autoplay:** same 3.5s cadence as role rotation (3s hold + 0.5s fade),
  implemented in `initCarousel()`/`showCarouselSlide()` in `js/main.js`.
- **Reduced motion:** `prefers-reduced-motion: reduce` skips the autoplay
  `setInterval` entirely (CSS also drops the fade transition), so the
  carousel holds on one still until the user manually advances it.
- **Manual control:** the carousel is a real `<button>`, so click and
  keyboard (Enter/Space) both advance one slide and restart the autoplay
  timer — no separate ARIA role/tabindex plumbing needed.
- **Styling split:** per the `/staging`-first convention in `CLAUDE.md`
  (`staging.css` is layout/spacing only), the carousel's visual chrome
  (border, radius, `object-fit`, transition, focus ring) lives in the shared
  `css/style.css`; `staging/staging.css` only sets its height within the
  wireframe layout.

## Out of scope for this phase

- Video delivery (mentioned as "eventually" in the issue) — no video assets
  exist yet; revisit format/hosting decisions when they do, since video has
  very different bandwidth/hosting tradeoffs than stills.
- A projects/case-study page that would reuse these stills outside the
  carousel.
- The srcset width ladder described above, until a source asset actually
  warrants it.
- Carrying the carousel to the live `index.html` landing page — this lands
  in `staging/` first per convention and gets carried over once validated.
