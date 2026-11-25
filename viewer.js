/* Просмотр картинок крупно для широких панорам фасада (25.11.2026). Заменяет общий lightbox.js на этом сайте:
   тот вписывал картинку в ширину экрана, и на телефоне панорама 3,4:1 выходила полоской не крупнее карточки.
   Открыть: тап по картинке. Закрыть: Esc, кнопка x, тап по тёмному полю, свайп вниз, «Назад» в браузере и на телефоне.
   Листать: стрелки на клавиатуре, кнопки внизу, свайп вбок (когда картинка не шире экрана).
   Тап по самой картинке или кнопка: «Крупнее» / «Целиком».
   На телефоне широкая картинка сразу открывается по высоте экрана и двигается пальцем вбок.
   Сначала показывается уже загруженная маленькая картинка, большая подставляется, когда догрузится. */
(function () {
  if (window.__lbReady) return; window.__lbReady = true;
  var css = '.vw{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;background:#0b0b0d;display:none;flex-direction:column;-webkit-user-select:none;user-select:none}' +
    '.vw.on{display:flex}' +
    '.vw-s{flex:1 1 auto;min-height:0;overflow:auto;display:flex;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}' +
    '.vw-s img{display:block;margin:auto;flex:none;max-width:none;border-radius:4px;cursor:zoom-in;background:#1a1a1d}' +
    '.vw-bar{flex:none;display:flex;align-items:center;gap:8px;padding:8px 10px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));color:#ddd;font:14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '.vw-c{flex:1 1 auto;min-width:0;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.vw button{flex:none;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;min-width:44px;height:44px;font:22px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;padding:0 12px}' +
    '.vw button.vw-z{font-size:14px}' +
    '.vw button.vw-x{position:absolute;top:10px;top:calc(10px + env(safe-area-inset-top,0px));right:10px;border-radius:999px;width:44px;padding:0;background:rgba(0,0,0,.6);font-size:26px;z-index:2}' +
    'figure img,.grid img{cursor:zoom-in}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var ov = document.createElement('div'); ov.className = 'vw'; ov.setAttribute('role', 'dialog');
  ov.innerHTML = '<div class="vw-s"><img alt=""></div>' +
    '<div class="vw-bar"><button class="vw-p" aria-label="Предыдущая">‹</button><span class="vw-c"></span><button class="vw-z"></button><button class="vw-n" aria-label="Следующая">›</button></div>' +
    '<button class="vw-x" aria-label="Закрыть">×</button>';
  document.body.appendChild(ov);
  var sc = ov.querySelector('.vw-s'), img = sc.querySelector('img'), cap = ov.querySelector('.vw-c');
  var bp = ov.querySelector('.vw-p'), bn = ov.querySelector('.vw-n'), bz = ov.querySelector('.vw-z'), bx = ov.querySelector('.vw-x');
  var list = [], idx = 0, open = false, pushed = false, big = false, ratio = 3, token = 0, swallow = false;
  var SEL = 'figure img, .pics img, .grid img, .gal img';

  function phone() { return Math.min(window.innerWidth || 1200, window.innerHeight || 1200) < 700; }
  function item(el) {
    var t = el.currentSrc || el.src;
    return { thumb: t, mid: el.getAttribute('data-mid') || '', full: el.getAttribute('data-full') || t, title: el.alt || '',
             r: el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 0 };
  }
  /* Размер картинки: «целиком» вписывает в экран; «крупнее» для панорамы ставит по высоте экрана, для остальных удваивает. */
  function layout() {
    var W = sc.clientWidth, H = sc.clientHeight; if (!W || !H) return;
    var fw = Math.min(W * 0.97, H * 0.97 * ratio), fh = fw / ratio, w = fw, h = fh;
    if (big) { if (fh < H * 0.6) { h = H * 0.97; w = h * ratio; } else { w = fw * 2; h = fh * 2; } }
    img.style.width = Math.round(w) + 'px'; img.style.height = Math.round(h) + 'px';
    img.style.cursor = big ? 'zoom-out' : 'zoom-in';
    bz.textContent = big ? 'Целиком' : 'Крупнее';
  }
  function center() { sc.scrollLeft = Math.max(0, (sc.scrollWidth - sc.clientWidth) / 2); sc.scrollTop = Math.max(0, (sc.scrollHeight - sc.clientHeight) / 2); }
  function label(extra) {
    var it = list[idx] || {};
    cap.textContent = (it.title || '') + (list.length > 1 ? '  ·  ' + (idx + 1) + '/' + list.length : '') + (extra ? '  ·  ' + extra : '');
  }
  function load(src, my) {
    if (!src || src === img.getAttribute('src')) { label(''); return; }
    label('загружается…');
    var im = new Image();
    im.onload = function () {
      if (my !== token || !open) return;
      img.src = src;
      if (im.naturalWidth && im.naturalHeight) { ratio = im.naturalWidth / im.naturalHeight; layout(); }
      label('');
    };
    im.onerror = function () { if (my === token && open) label('большая не загрузилась'); };
    im.src = src;
  }
  function show(i) {
    idx = (i + list.length) % list.length; var it = list[idx], my = ++token;
    if (it.r) ratio = it.r;
    img.src = it.thumb;
    big = phone() && ratio > 1.9;            /* панорама на телефоне: сразу по высоте экрана */
    bp.style.display = bn.style.display = list.length > 1 ? '' : 'none';
    layout(); center();
    load(phone() && it.mid ? it.mid : it.full, my);
  }
  function openList(items, i) {
    if (!items || !items.length) return;
    list = items; ov.classList.add('on'); open = true; document.documentElement.style.overflow = 'hidden';
    show(i || 0);
    try { history.pushState({ lb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }
  function close(fromPop) {
    if (!open) return; open = false; token++; ov.classList.remove('on'); img.removeAttribute('src'); document.documentElement.style.overflow = '';
    if (!fromPop && pushed) { pushed = false; history.back(); } else pushed = false;
  }
  function zoom() { big = !big; layout(); center(); }
  window.__viewer = { open: openList, close: close };

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.matches(SEL) && !t.closest('.vw')) {
      e.preventDefault(); e.stopPropagation();
      var els = Array.prototype.slice.call(document.querySelectorAll(SEL)).filter(function (x) { return !x.closest('.vw') && x.offsetParent !== null; });
      if (els.indexOf(t) < 0) els = [t];
      openList(els.map(item), els.indexOf(t));
    }
  }, true);
  ov.addEventListener('click', function (e) {
    if (swallow) { swallow = false; return; }
    var t = e.target;
    if (bx.contains(t)) { close(); return; }
    if (bp.contains(t)) { show(idx - 1); return; }
    if (bn.contains(t)) { show(idx + 1); return; }
    if (bz.contains(t) || t === img) { zoom(); return; }
    if (t.closest && t.closest('.vw-bar')) return;
    close();                                   /* тап по тёмному полю */
  });
  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
  });
  window.addEventListener('popstate', function () { if (open) close(true); });
  window.addEventListener('resize', function () { if (open) layout(); });
  var sx = 0, sy = 0, canX = false, canY = false;
  sc.addEventListener('touchstart', function (e) {
    var p = e.touches[0]; sx = p.clientX; sy = p.clientY;
    canX = sc.scrollWidth > sc.clientWidth + 4; canY = sc.scrollHeight > sc.clientHeight + 4;
  }, { passive: true });
  sc.addEventListener('touchend', function (e) {
    if (e.touches && e.touches.length) return;
    var p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy, did = false;
    if (!canX && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && list.length > 1) { show(idx + (dx < 0 ? 1 : -1)); did = true; }
    else if (!canY && dy > 90 && dy > Math.abs(dx) * 1.5) { close(); did = true; }
    if (did) { swallow = true; setTimeout(function () { swallow = false; }, 400); }
  }, { passive: true });
})();
