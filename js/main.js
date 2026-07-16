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
