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

  // ── Carousel (fade, single-element content swap — same shape as role rotation) ──

  var _carouselSlides = [];
  var _carouselIndex = 0;
  var _carouselInterval = null;

  function buildCarouselSlides() {
    if (typeof PROJECTS === 'undefined') return [];
    var slides = [];
    PROJECTS.forEach(function (project) {
      project.stills.forEach(function (still) {
        var base = '/assets/projects/' + project.slug + '/' + still;
        slides.push({ avif: base + '.avif', jpg: base + '.jpg', alt: project.title });
      });
    });
    return slides;
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
    var img = el.querySelector('img');
    img.style.opacity = '0';
    setTimeout(function () {
      renderCarouselSlide(el, _carouselSlides[_carouselIndex]);
      img.style.opacity = '1';
    }, 500); // matches --transition-fade duration
  }

  function startCarouselAutoplay(el) {
    if (_carouselInterval) clearInterval(_carouselInterval);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    _carouselInterval = setInterval(function () {
      showCarouselSlide(el, _carouselIndex + 1);
    }, 3500); // 3s hold + 0.5s fade out, same cadence as role rotation
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
