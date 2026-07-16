# danivponce.xyz Initial Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a static landing page at danivponce.xyz with fade role rotation + ES/EN i18n, and a spacing-only wireframe at /staging matching the hand-drawn sketch.

**Architecture:** Plain HTML/CSS/JS, no build step, no frameworks. `css/style.css` and `js/` are shared by both pages. All copy lives in `js/translations.js`; `js/main.js` handles language detection, role rotation, and toggle. Landing and staging each add a `page-*` body class to scope their layouts without conflicts.

**Tech Stack:** HTML5, CSS3 (custom properties, transitions), vanilla JS (ES6+), static file hosting (Netlify / Vercel / GitHub Pages / Cloudflare Pages).

---

### Task 1: Scaffold

**Files:**
- Create: `.gitignore`
- Create directories: `css/`, `js/`, `staging/`

- [x] **Step 1: Create `.gitignore`**

```
.superpowers/
.DS_Store
```

- [x] **Step 2: Create directories**

```bash
mkdir -p css js staging
```

- [x] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "scaffold: project structure"
```

---

### Task 2: js/translations.js

**Files:**
- Create: `js/translations.js`

- [x] **Step 1: Create the file**

```js
const T = {
  es: {
    roles: [
      "dirección creativa",
      "artista audiovisual",
      "production designer",
      "art historian",
      "set dresser"
    ],
    nav: {
      about:    "sobre mí",
      projects: "proyectos",
      contact:  "contacto"
    },
    langBtn: "idiomas"
  },
  en: {
    roles: [
      "creative director",
      "audiovisual artist",
      "production designer",
      "art historian",
      "set dresser"
    ],
    nav: {
      about:    "about me",
      projects: "projects",
      contact:  "contact"
    },
    langBtn: "language"
  }
};
```

- [x] **Step 2: Verify in browser console**

Create a temporary `test.html` in the project root, open it, and paste in the console:

```js
// Paste into devtools console after <script src="js/translations.js"></script> is loaded
console.assert(T.es.roles.length === 5,           'ES roles count wrong');
console.assert(T.en.roles.length === 5,           'EN roles count wrong');
console.assert(T.es.langBtn === 'idiomas',        'ES langBtn wrong');
console.assert(T.en.langBtn === 'language',       'EN langBtn wrong');
console.assert(T.es.nav.about === 'sobre mí',     'ES nav.about wrong');
console.assert(T.en.nav.about === 'about me',     'EN nav.about wrong');
console.assert(T.es.nav.projects === 'proyectos', 'ES nav.projects wrong');
console.assert(T.en.nav.contact === 'contact',    'EN nav.contact wrong');
// Expected: no assertion errors in console
```

Delete `test.html` after verifying.

- [x] **Step 3: Commit**

```bash
git add js/translations.js
git commit -m "add ES/EN translations"
```

---

### Task 3: css/style.css

**Files:**
- Create: `css/style.css`

- [x] **Step 1: Create the file**

```css
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Custom properties (placeholders — iterate colors/fonts on landing) ── */
:root {
  --color-bg:        #ffffff;
  --color-text:      #111111;
  --color-muted:     #666666;
  --color-border:    #cccccc;
  --font-main:       sans-serif;
  --transition-fade: opacity 0.5s ease;
}

/* ── Base ── */
body {
  background:  var(--color-bg);
  color:       var(--color-text);
  font-family: var(--font-main);
}

/* ── Typography ── */
h1 {
  font-size:      clamp(2.2rem, 9vw, 5.5rem);
  font-weight:    700;
  letter-spacing: 0.02em;
  line-height:    1.1;
}

.role {
  color:      var(--color-muted);
  font-size:  clamp(0.9rem, 2.5vw, 1.25rem);
  transition: var(--transition-fade);
  min-height: 1.5em;
}

/* ── Language toggle button ── */
#lang-toggle {
  background:  none;
  border:      1px solid var(--color-border);
  border-radius: 2em;
  padding:     0.3em 1em;
  cursor:      pointer;
  font-size:   0.85rem;
  color:       var(--color-text);
  font-family: var(--font-main);
}

#lang-toggle:hover { border-color: var(--color-text); }

/* ── Landing page layout ── */
body.page-landing {
  min-height:   100vh;
  display:      grid;
  grid-template-rows: 1fr auto;
}

body.page-landing main {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  text-align:      center;
  padding:         2rem;
  gap:             0.75rem;
}

body.page-landing footer {
  padding:         1.5rem;
  display:         flex;
  justify-content: center;
}
```

No commit yet — style is unverifiable without HTML.

---

### Task 4: js/main.js

**Files:**
- Create: `js/main.js`

- [x] **Step 1: Create the file**

```js
(function () {

  // ── Helpers ──

  function detectLang() {
    var stored = localStorage.getItem('lang');
    if (stored && T[stored]) return stored;
    return navigator.language.startsWith('es') ? 'es' : 'en';
  }

  function getNestedKey(obj, path) {
    return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj);
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = getNestedKey(T[lang], el.dataset.i18n);
      if (val !== undefined) el.textContent = val;
    });
    initRoleRotation(lang);
  }

  // ── Role rotation (fade) ──

  var _roleInterval = null;

  function initRoleRotation(lang) {
    var el = document.querySelector('.role');
    if (!el) return;

    if (_roleInterval) clearInterval(_roleInterval);

    var roles = T[lang].roles;
    var idx = 0;

    el.textContent = roles[0];
    el.style.opacity = '1';

    _roleInterval = setInterval(function () {
      el.style.opacity = '0';
      setTimeout(function () {
        idx = (idx + 1) % roles.length;
        el.textContent = roles[idx];
        el.style.opacity = '1';
      }, 500); // matches --transition-fade duration
    }, 3500); // 3s hold + 0.5s fade out
  }

  // ── Init ──

  document.addEventListener('DOMContentLoaded', function () {
    var langs = Object.keys(T);
    var currentLang = detectLang();
    applyLang(currentLang);

    var btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        currentLang = langs[(langs.indexOf(currentLang) + 1) % langs.length];
        applyLang(currentLang);
      });
    }
  });

})();
```

No commit yet — verify after index.html is wired up.

---

### Task 5: index.html — landing page

**Files:**
- Create: `index.html`

- [x] **Step 1: Create the file**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dani Ponce</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body class="page-landing">
  <main>
    <h1>Dani Ponce</h1>
    <p class="role" aria-live="polite"></p>
  </main>
  <footer>
    <button id="lang-toggle" data-i18n="langBtn"></button>
  </footer>
  <script src="js/translations.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [x] **Step 2: Open in browser and verify**

Open `index.html` (file:// or a local server). Check all of:
- "Dani Ponce" renders as large heading centered on the page
- Subtitle shows first role ("dirección creativa" in ES, "creative director" in EN)
- Role fades out and next role fades in every ~3.5 seconds
- All 5 roles cycle correctly
- Button label reads "idiomas" for ES browsers, "language" for EN browsers
- Clicking the button toggles label between "idiomas" and "language"
- Role text switches to the other language's roles on toggle
- Reload the page — previously chosen language persists

- [x] **Step 3: Commit landing page**

```bash
git add index.html css/style.css js/translations.js js/main.js
git commit -m "landing page: hero name, fade role rotation, ES/EN toggle"
```

---

### Task 6: staging/staging.css

**Files:**
- Create: `staging/staging.css`

- [x] **Step 1: Create the file**

```css
/* Staging wireframe — spacing and layout only, no new visual styles */

body.page-staging {
  min-height:   100vh;
  display:      grid;
  grid-template-rows: 1fr auto;
}

body.page-staging main {
  max-width:       820px;
  margin:          0 auto;
  width:           100%;
  padding:         3rem 2rem;
  display:         flex;
  flex-direction:  column;
  gap:             3rem;
}

body.page-staging .hero {
  text-align:      center;
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  gap:             0.75rem;
}

.carousel-placeholder {
  border:        2px solid var(--color-border);
  border-radius: 0.5rem;
  min-height:    320px;
  display:       flex;
  align-items:   center;
  justify-content: center;
  color:         var(--color-muted);
  font-size:     0.9rem;
  padding:       1rem;
  text-align:    center;
}

.staging-nav {
  display:         flex;
  justify-content: center;
  gap:             1.5rem;
  flex-wrap:       wrap;
}

.staging-nav a {
  border:        1px solid var(--color-border);
  border-radius: 2em;
  padding:       0.35em 1.1em;
  text-decoration: none;
  color:         var(--color-text);
  font-family:   var(--font-main);
  font-size:     0.9rem;
}

.staging-nav a:hover { border-color: var(--color-text); }

body.page-staging footer {
  padding:         1.5rem;
  display:         flex;
  justify-content: center;
}
```

No commit yet — verify after staging/index.html exists.

---

### Task 7: staging/index.html — wireframe

**Files:**
- Create: `staging/index.html`

- [x] **Step 1: Create the file**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dani Ponce — staging</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="staging.css">
</head>
<body class="page-staging">
  <main>
    <section class="hero">
      <h1>Dani Ponce</h1>
      <p class="role" aria-live="polite"></p>
    </section>

    <div class="carousel-placeholder">
      * carrusel cambiante de stills de mis proyectos
    </div>

    <nav class="staging-nav">
      <a href="#" data-i18n="nav.about"></a>
      <a href="#" data-i18n="nav.projects"></a>
      <a href="#" data-i18n="nav.contact"></a>
    </nav>
  </main>

  <footer>
    <button id="lang-toggle" data-i18n="langBtn"></button>
  </footer>

  <script src="../js/translations.js"></script>
  <script src="../js/main.js"></script>
</body>
</html>
```

- [x] **Step 2: Open in browser and verify**

Open `staging/index.html`. Check all of:
- Layout top-to-bottom: hero → carousel box → nav pills → lang toggle
- Carousel placeholder is a large bordered rectangle with the placeholder label
- Nav pills read "sobre mí / proyectos / contacto" (ES) or "about me / projects / contact" (EN)
- Role fades correctly, same as landing page
- Lang toggle works and persists (same localStorage key — shared with landing page)
- No visual styles beyond what landing page has: only layout and spacing differ

- [x] **Step 3: Commit staging page**

```bash
git add staging/index.html staging/staging.css
git commit -m "staging wireframe: layout matches hand-drawn sketch"
```
