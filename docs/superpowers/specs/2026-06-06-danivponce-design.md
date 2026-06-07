# danivponce.xyz — Initial Site Design

**Date:** 2026-06-06
**Scope:** Landing page (root) + wireframe staging page (/staging)

## Goals

1. Ship a live landing page at `danivponce.xyz` with hero name and role-switching subtitle ASAP — serves as the iteration surface for fonts, colors, and animations.
2. Serve a semantic HTML wireframe at `danivponce.xyz/staging` matching the hand-drawn sketch — no new visual styles beyond what the landing page already defines, plus spacing.

## Non-goals

- No carousel content (no assets yet)
- No about/projects/contact page content
- No build tooling or frameworks — plain HTML, CSS, JS only
- Full i18n beyond ES/EN (architecture supports it; only two languages ship now)

## File Structure

```
cadavapo/
├── index.html            # landing page
├── staging/
│   ├── index.html        # wireframe
│   └── staging.css       # spacing/layout only — no new visual styles
├── css/
│   └── style.css         # shared visual styles
├── js/
│   ├── translations.js   # all copy keyed by language
│   └── main.js           # i18n init + role rotation
└── .gitignore
```

`staging/index.html` imports `../css/style.css` and a local `staging/staging.css` for layout/spacing only — no new colors, no new typography.

## Landing Page (`index.html`)

### Structure

```html
<header>
  <h1>Dani Ponce</h1>
  <p class="role" aria-live="polite"></p>
</header>
<footer>
  <button id="lang-toggle"></button>
</footer>
```

Minimal semantic HTML. No nav. The `aria-live="polite"` attribute announces role changes to screen readers without interrupting.

### Role Rotation

- JS reads `T[currentLang].roles` array
- Interval: fade out current text (CSS `opacity: 0`, `transition: opacity 0.5s ease`), swap text content, fade back in
- Interval between swaps: 3 seconds (hold) + 0.5s fade = 3.5s total cycle time

## Staging Page (`staging/index.html`)

Matches the wireframe exactly:

- Hero section: same `<h1>` + `.role` as landing
- Carousel placeholder: `<div class="carousel-placeholder">` — large bordered box, label inside
- Nav: three `<a>` links — about me / proyectos / contacto — displayed as pill buttons
- Language toggle button (same as landing)

Layout is handled entirely by spacing in `staging/staging.css`. No visual style additions.

## i18n Architecture

`js/translations.js` exports a single object:

```js
const T = {
  es: {
    roles: ["dirección creativa", "artista audiovisual", "production designer", "art historian", "set dresser"],
    nav: { about: "sobre mí", projects: "proyectos", contact: "contacto" },
    langBtn: "idiomas"
  },
  en: {
    roles: ["creative director", "audiovisual artist", "production designer", "art historian", "set dresser"],
    nav: { about: "about me", projects: "projects", contact: "contact" },
    langBtn: "language"
  }
}
```

`js/main.js` responsibilities:
1. Detect language: `navigator.language.startsWith('es') ? 'es' : 'en'`
2. Call `applyLang(lang)` — updates all DOM nodes by ID/class
3. Lang toggle button cycles `Object.keys(T)` and calls `applyLang` again
4. Persist selection to `localStorage` so preference survives page reload

Adding a third language later = one new key in `T` + nothing else.

## Deployment

Static host (Netlify / Vercel / GitHub Pages / Cloudflare Pages). No server required. `staging/` is a subfolder — served automatically at `danivponce.xyz/staging`.

## Out of scope for this phase

- Actual color scheme (to be iterated on landing page)
- Font choices (to be iterated on landing page)
- Carousel implementation (no assets yet)
- About / Projects / Contact pages
- More than ES + EN languages
