(function () {

  // ── Helpers ──

  function detectLang() {
    var stored = localStorage.getItem('lang');
    if (stored && T[stored]) return stored;
    var candidates = navigator.languages || [navigator.language];
    for (var i = 0; i < candidates.length; i++) {
      var primary = candidates[i].split('-')[0].toLowerCase();
      if (T[primary]) return primary;
    }
    return 'en';
  }

  function getNestedKey(obj, path) {
    return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj);
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = T[lang].dir || 'ltr';
    localStorage.setItem('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = getNestedKey(T[lang], el.dataset.i18n);
      if (val !== undefined) el.textContent = val;
    });
    // Group labels are announced but never rendered, so they need the same
    // treatment as visible copy — otherwise they stay Spanish in every language.
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var val = getNestedKey(T[lang], el.dataset.i18nAria);
      if (val !== undefined) el.setAttribute('aria-label', val);
    });
    if (document.body.classList.contains('page-landing')) initRoleRotation(lang);
    updateLangList(lang);
  }

  // ── Role rotation (fade) ──

  // Randomized hold time so the role text and carousel don't fade in lockstep.
  var ROTATION_HOLD_MIN = 2800;
  var ROTATION_HOLD_MAX = 4200;

  function randomHold() {
    return ROTATION_HOLD_MIN + Math.random() * (ROTATION_HOLD_MAX - ROTATION_HOLD_MIN);
  }

  var _roleTimeout = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initRoleRotation(lang) {
    var el = document.querySelector('.role');
    if (!el) return;

    if (_roleTimeout) clearTimeout(_roleTimeout);

    var roles = T[lang].roles;
    var idx = 0;

    el.textContent = roles[0];
    el.style.opacity = '1';

    // Rotating on a timer is motion, and it's also why `.role` can't be a live
    // region — it would announce a new role every few seconds forever.
    if (prefersReducedMotion()) return;

    (function scheduleNext() {
      _roleTimeout = setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () {
          idx = (idx + 1) % roles.length;
          el.textContent = roles[idx];
          el.style.opacity = '1';
          scheduleNext();
        }, 500); // matches --transition-fade duration
      }, randomHold()); // re-rolled each cycle, independent of the carousel's
    })();
  }

  // ── Carousel (two-layer crossfade) ──
  //
  // The carousel is two stacked <picture> layers. The visible one carries the
  // `is-active` class (opacity 1 in CSS); the other sits behind it at opacity 0.
  // To advance we load the next slide into the *hidden* layer, wait for it to
  // decode, then just move the `is-active` class over — CSS transitions the two
  // layers' opacity, so the crossfade is entirely CSS-driven. Because the
  // visible layer never changes its own source, it can't briefly show a stale
  // frame the way a single swapping <img> did.

  // Carousel images stay up longer than the role text, since there's more to look at.
  var CAROUSEL_HOLD_MIN = 5500;
  var CAROUSEL_HOLD_MAX = 9000;

  var _carouselSlides = [];
  var _carouselIndex = 0;
  var _carouselTimeout = null;
  var _carouselGeneration = 0;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function buildCarouselSlides() {
    if (typeof PROJECTS === 'undefined') return [];
    var slides = [];
    PROJECTS.forEach(function (project) {
      project.stills.forEach(function (still) {
        var base = '/assets/projects/' + project.slug + '/' + still;
        slides.push({ avif: base + '.avif', jpg: base + '.jpg', alt: project.title });
      });
    });
    return shuffle(slides);
  }

  function renderCarouselSlide(layer, slide) {
    var source = layer.querySelector('source[type="image/avif"]');
    var img = layer.querySelector('img');
    source.srcset = slide.avif;
    img.src = slide.jpg;
    img.alt = slide.alt;
    return img;
  }

  function showCarouselSlide(el, index) {
    _carouselIndex = (index + _carouselSlides.length) % _carouselSlides.length;
    var slide = _carouselSlides[_carouselIndex];

    var layers = el.querySelectorAll('.carousel-layer');
    var active = el.querySelector('.carousel-layer.is-active') || layers[0];
    var incoming = active === layers[0] ? layers[1] : layers[0];

    // Each call bumps the generation; a decode from an older call that resolves
    // late checks its generation and bails, so it can't hand the class to a
    // slide a newer advance has already moved past.
    var gen = ++_carouselGeneration;

    // Load the next slide into the hidden layer, then crossfade only once it
    // has decoded — the visible layer keeps its own (already loaded) image the
    // whole time, so there is no stale frame to flash.
    var img = renderCarouselSlide(incoming, slide);
    var crossfade = function () {
      if (gen !== _carouselGeneration) return;
      incoming.classList.add('is-active');
      active.classList.remove('is-active');
    };
    if (img.decode) {
      img.decode().then(crossfade, crossfade);
    } else {
      crossfade();
    }
  }

  function startCarouselAutoplay(el) {
    if (_carouselTimeout) clearTimeout(_carouselTimeout);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    (function scheduleNext() {
      _carouselTimeout = setTimeout(function () {
        showCarouselSlide(el, _carouselIndex + 1);
        scheduleNext();
      }, CAROUSEL_HOLD_MIN + Math.random() * (CAROUSEL_HOLD_MAX - CAROUSEL_HOLD_MIN)); // longer, independent of the role rotation's
    })();
  }

  function initCarousel() {
    var el = document.querySelector('.carousel');
    if (!el) return;

    _carouselSlides = buildCarouselSlides();
    if (!_carouselSlides.length) return;

    // Open on the (already shuffled) first slide instead of the static poster
    // baked into the HTML, so the carousel isn't identical on every load. This
    // goes straight into the active layer; the poster it replaces is simply
    // swapped out once the slide decodes.
    _carouselIndex = 0;
    var first = el.querySelector('.carousel-layer.is-active') || el.querySelector('.carousel-layer');
    renderCarouselSlide(first, _carouselSlides[0]);

    el.addEventListener('click', function () {
      showCarouselSlide(el, _carouselIndex + 1);
      startCarouselAutoplay(el);
    });

    startCarouselAutoplay(el);
  }

  // ── Progressive video loading (tier 2 of docs/specs/2026-08-02-video-ingestion.md) ──
  //
  // `.media-video` elements ship with `preload="none"` and their real source
  // in `data-src`, so the browser never fetches video bytes up front. An
  // IntersectionObserver assigns `src` only once a clip nears the viewport;
  // once it can play, it crossfades in over its poster via the `is-loaded`
  // class, the same opacity-transition idiom the carousel's `is-active` uses.

  // When we aren't going to play a clip, reveal the element without fetching
  // any video bytes: `<video poster>` (tier 1) paints on its own, which is
  // exactly the still we want. Deliberately *not* done by loading the video
  // and leaving it paused — with `preload="none"` a load() that is never
  // followed by play() doesn't actually fetch, so the element would sit at
  // readyState 0 behind opacity 0 and the viewer would keep staring at the
  // blurred tier-0 background.
  function revealPosterOnly(video) {
    video.classList.add('is-loaded');
  }

  function loadProgressiveVideo(video) {
    if (!video.dataset.src) {           // bytes already fetched on an earlier pass
      if (!_clipsPaused) video.play().catch(function () {});
      return;
    }
    if (_clipsPaused) { revealPosterOnly(video); return; }

    video.addEventListener('canplay', function () {
      video.classList.add('is-loaded');
      video.play().catch(function () {}); // muted autoplay can still be blocked in rare cases
    }, { once: true });
    video.src = video.dataset.src;
    video.removeAttribute('data-src');
    // `preload="none"` suppresses the implicit fetch that setting `src` would
    // otherwise trigger — without an explicit load() call here, Chromium never
    // requests the video bytes at all and the element sits at readyState 0.
    video.load();
  }

  // WCAG 2.2.2: a project page autoplays every clip in the gallery on a loop,
  // which is motion that starts on its own and never stops, so there has to be
  // a way to stop it. Seeded from prefers-reduced-motion at startup, but it is
  // the single source of truth from then on — pressing "play clips" has to be
  // able to override the media query, otherwise a reduced-motion visitor has no
  // way to opt back in and never gets to see the work move at all.
  var _clipsPaused = false;

  function applyClipsPaused(paused) {
    _clipsPaused = paused;
    document.querySelectorAll('.media-video').forEach(function (v) {
      if (paused) { v.pause(); return; }
      // Resuming has to cover clips that were only ever revealed as posters
      // while paused; the observer already let those go, and it won't re-fire
      // for anything that is on screen right now. Offscreen ones stay deferred.
      var r = v.getBoundingClientRect();
      if (r.bottom > -200 && r.top < window.innerHeight + 200) loadProgressiveVideo(v);
    });
    document.querySelectorAll('.clips-toggle').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(paused));
      var key = paused ? 'proyectos.reproducirClips' : 'proyectos.pausarClips';
      btn.dataset.i18n = key;
      var val = getNestedKey(T[document.documentElement.lang] || {}, key);
      if (val !== undefined) btn.textContent = val;
    });
  }

  function initClipsToggle() {
    // Seed the default even when there's no toolbar to hang a control on, so
    // reduced-motion is still honored on any page that grows clips later.
    _clipsPaused = prefersReducedMotion();

    var toolbar = document.querySelector('.stills-toolbar');
    if (!toolbar || !document.querySelector('.media-video')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clips-toggle';
    toolbar.insertBefore(btn, toolbar.firstChild);
    btn.addEventListener('click', function () { applyClipsPaused(!_clipsPaused); });

    applyClipsPaused(_clipsPaused);
  }

  function initProgressiveVideos() {
    var videos = document.querySelectorAll('.media-video[data-src]');
    if (!videos.length) return;

    if (!window.IntersectionObserver) {
      videos.forEach(loadProgressiveVideo);
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadProgressiveVideo(entry.target);
        // Only stop watching once the bytes were actually requested. While
        // clips are paused we merely show the poster and leave `data-src` in
        // place, so the clip still needs a later pass to load for real.
        if (!entry.target.dataset.src) obs.unobserve(entry.target);
      });
    }, { rootMargin: '200px' });

    videos.forEach(function (video) { observer.observe(video); });
  }

  // ── Stills view toggle (grid / list) ──

  function applyStillsView(view) {
    document.querySelectorAll('.stills-grid').forEach(function (grid) {
      grid.classList.toggle('is-list', view === 'list');
    });
    document.querySelectorAll('.stills-view-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.view === view));
    });
  }

  function initStillsView() {
    var toolbar = document.querySelector('.stills-toolbar');
    if (!toolbar) return;

    applyStillsView('grid');

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.stills-view-btn');
      if (!btn) return;
      applyStillsView(btn.dataset.view);
    });
  }

  // ── Project-tile poster flash (hover) ──
  //
  // `.proyecto-tile[data-posters]` carries a comma-separated list of poster
  // JPG paths (video tier-1 posters, or plain stills for image-only
  // projects). On hover, cycle the tile's `background-image` through that
  // list on a fast interval — a hard-cut flipbook rather than the
  // crossfade idiom the carousel/progressive-video layers use, since the
  // effect here is meant to read as a strobe preview, not a slideshow.

  // WCAG 2.3.1's general flash threshold is 3 Hz, and swapping a full-frame
  // still is a large-area luminance change — exactly what that threshold is
  // about. 340ms is 2.94 Hz. (This was 220ms, i.e. 4.5 Hz, under a comment
  // claiming it was under 4.)
  var TILE_FLASH_INTERVAL_MS = 340;

  function initProyectoTileFlash() {
    var tiles = document.querySelectorAll('.proyecto-tile[data-posters]');
    if (!tiles.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    tiles.forEach(function (tile) {
      var posters = tile.dataset.posters.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (posters.length < 2) return;

      var preloadPromise = null;
      var timer = null;
      var index = 0;

      function preload() {
        if (!preloadPromise) {
          preloadPromise = Promise.all(posters.map(function (src) {
            return new Promise(function (resolve) {
              var img = new Image();
              img.onload = img.onerror = resolve;
              img.src = src;
            });
          }));
        }
        return preloadPromise;
      }

      function start() {
        preload().then(function () {
          if (timer || !tile.matches(':hover')) return; // pointer left before preload finished
          index = 0;
          tile.style.backgroundImage = 'url(' + posters[0] + ')';
          tile.classList.add('is-flashing');
          timer = setInterval(function () {
            index = (index + 1) % posters.length;
            tile.style.backgroundImage = 'url(' + posters[index] + ')';
          }, TILE_FLASH_INTERVAL_MS);
        });
      }

      function stop() {
        clearInterval(timer);
        timer = null;
        tile.classList.remove('is-flashing');
        tile.style.backgroundImage = '';
      }

      tile.addEventListener('mouseenter', start);
      tile.addEventListener('mouseleave', stop);
    });
  }

  // ── Language menu (dropup) ──

  // These menus are disclosures, not listboxes: a button toggles a plain list
  // of controls. Marking them up as listbox/option was invalid (an <li> can't
  // be a listbox child, so the options' required parent wasn't their parent)
  // and promised arrow-key navigation that was never implemented. `aria-current`
  // marks the active language — `aria-selected` is only meaningful inside a
  // listbox/grid/tablist.
  function buildLangList(list) {
    Object.keys(T).forEach(function (lang) {
      var li = document.createElement('li');
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.dataset.lang = lang;
      opt.textContent = T[lang].name || lang;
      li.appendChild(opt);
      list.appendChild(li);
    });
  }

  function updateLangList(lang) {
    var list = document.getElementById('lang-list');
    if (!list) return;
    list.querySelectorAll('button').forEach(function (opt) {
      if (opt.dataset.lang === lang) opt.setAttribute('aria-current', 'true');
      else opt.removeAttribute('aria-current');
    });
  }

  function updateScrollFade(list) {
    var atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    var overflowing = list.scrollHeight > list.clientHeight;
    list.classList.toggle('has-more', overflowing && !atBottom);
  }

  function openMenu(list, btn) {
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    updateScrollFade(list);
  }

  function closeMenu(list, btn) {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  // Wires open/close + outside-click + Escape for any dropdown toggle
  // button, regardless of what's inside its list (language options,
  // navigational links, ...).
  function initDropdown(btn, list) {
    list.addEventListener('scroll', function () { updateScrollFade(list); });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (list.hidden) openMenu(list, btn);
      else closeMenu(list, btn);
    });

    document.addEventListener('click', function (e) {
      if (!list.hidden && !list.contains(e.target) && e.target !== btn) {
        closeMenu(list, btn);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !list.hidden) {
        closeMenu(list, btn);
        btn.focus();
      }
    });
  }

  // ── Init ──

  document.addEventListener('DOMContentLoaded', function () {
    var currentLang = detectLang();

    document.querySelectorAll('button[aria-expanded][aria-controls]').forEach(function (btn) {
      var list = document.getElementById(btn.getAttribute('aria-controls'));
      if (list) initDropdown(btn, list);
    });

    var langBtn = document.getElementById('lang-toggle');
    var langList = document.getElementById('lang-list');

    if (langBtn && langList) {
      buildLangList(langList);

      langList.addEventListener('click', function (e) {
        var opt = e.target.closest('[data-lang]');
        if (!opt) return;
        currentLang = opt.dataset.lang;
        applyLang(currentLang);
        closeMenu(langList, langBtn);
        langBtn.focus();
      });
    }

    applyLang(currentLang);
    initCarousel();
    initClipsToggle(); // before the videos load, so it can hold them paused
    initProgressiveVideos();
    initStillsView();
    initProyectoTileFlash();
  });

})();
