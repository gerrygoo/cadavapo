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

  // ── Carousel (fade, single-element content swap — same shape as role rotation) ──

  // Carousel images stay up longer than the role text, since there's more to look at.
  var CAROUSEL_HOLD_MIN = 5500;
  var CAROUSEL_HOLD_MAX = 9000;

  var _carouselSlides = [];
  var _carouselIndex = 0;
  var _carouselTimeout = null;
  var _carouselFadeTimeout = null;

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

  function renderCarouselSlide(el, slide) {
    var source = el.querySelector('source[type="image/avif"]');
    var img = el.querySelector('img');
    source.srcset = slide.avif;
    img.src = slide.jpg;
    img.alt = slide.alt;
  }

  function showCarouselSlide(el, index) {
    _carouselIndex = (index + _carouselSlides.length) % _carouselSlides.length;
    var slide = _carouselSlides[_carouselIndex];
    var img = el.querySelector('img');
    // Cancel any fade-in still pending from a prior call, so an overlapping
    // call can't briefly reveal that call's slide before this one takes over.
    if (_carouselFadeTimeout) clearTimeout(_carouselFadeTimeout);
    img.style.opacity = '0';
    _carouselFadeTimeout = setTimeout(function () {
      renderCarouselSlide(el, slide);
      img.style.opacity = '1';
    }, 500); // matches --transition-fade duration
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
