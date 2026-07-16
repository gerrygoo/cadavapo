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
    initRoleRotation(lang);
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

  function initRoleRotation(lang) {
    var el = document.querySelector('.role');
    if (!el) return;

    if (_roleTimeout) clearTimeout(_roleTimeout);

    var roles = T[lang].roles;
    var idx = 0;

    el.textContent = roles[0];
    el.style.opacity = '1';

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

  // ── Language menu (dropup) ──

  function buildLangList(list) {
    Object.keys(T).forEach(function (lang) {
      var li = document.createElement('li');
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.setAttribute('role', 'option');
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
      opt.setAttribute('aria-selected', String(opt.dataset.lang === lang));
    });
  }

  function updateScrollFade(list) {
    var atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    var overflowing = list.scrollHeight > list.clientHeight;
    list.classList.toggle('has-more', overflowing && !atBottom);
  }

  function openLangMenu(list, btn) {
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    updateScrollFade(list);
  }

  function closeLangMenu(list, btn) {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  // ── Init ──

  document.addEventListener('DOMContentLoaded', function () {
    var currentLang = detectLang();

    var btn = document.getElementById('lang-toggle');
    var list = document.getElementById('lang-list');

    if (btn && list) {
      buildLangList(list);
      list.addEventListener('scroll', function () { updateScrollFade(list); });

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (list.hidden) openLangMenu(list, btn);
        else closeLangMenu(list, btn);
      });

      list.addEventListener('click', function (e) {
        var opt = e.target.closest('[data-lang]');
        if (!opt) return;
        currentLang = opt.dataset.lang;
        applyLang(currentLang);
        closeLangMenu(list, btn);
        btn.focus();
      });

      document.addEventListener('click', function (e) {
        if (!list.hidden && !list.contains(e.target) && e.target !== btn) {
          closeLangMenu(list, btn);
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !list.hidden) {
          closeLangMenu(list, btn);
          btn.focus();
        }
      });
    }

    applyLang(currentLang);
    initCarousel();
  });

})();
