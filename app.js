/* Конструктор фасада: слои-картинки поверх фото. Состояние хранится в адресе (#k=...), ссылкой можно делиться. */
(function () {
  var D = window.DATA, $ = function (s) { return document.querySelector(s); };
  var KEYS = ['photo', 'roof', 'design', 'layout', 'gable', 'tside', 'tfront', 'sl', 'sm', 'sr', 'fresh'];   /* новые ключи только в конец: старые ссылки остаются рабочими */
  var ALL = D.groups.concat(D.mix);
  var state = {};
  KEYS.forEach(function (k) { state[k] = D.defaults[k]; });

  function group(id) { return ALL.filter(function (g) { return g.id === id; })[0]; }
  function ok(id, v) { var g = group(id); return !!g && g.options.some(function (o) { return o.id === v; }); }
  function label(id, v) { var o = group(id).options.filter(function (x) { return x.id === v; })[0]; return o ? o.label : v; }

  /* Какие слои и в каком порядке лежат на фото. Та же логика в build_site.py (resolve). */
  function compute(st) {
    var out = [];
    if (st.roof !== 'asis') out.push('roof_' + st.roof);
    if (st.fresh === 'yes') out.push('fresh_' + st.roof);
    var sfx = (D.extra_style && D.extra_style[st.design]) || '';       /* вывеска и баннер башни в стиле выбранного готового макета */
    if (st.tfront !== 'none') out.push('tfront_' + st.tfront + sfx);
    if (st.tside !== 'asis') out.push('tside_' + st.tside + (st.tside === 'plitka' ? sfx : ''));
    [['sl', 'left', null], ['sm', 'mid', 'mid_p'], ['sr', 'right', 'right_g']].forEach(function (p) {
      var did = st[p[0]] === 'same' ? st.design : st[p[0]];
      var slots = D.designs[did].slots;
      var slot = (st.layout === 'c' && p[2] && slots[p[2]]) ? p[2] : p[1];
      out.push(slots[slot]);
    });
    if (st.gable === 'signs') out.push('sign_l', 'sign_r');
    if (st.photo === 'orig') out.push('obj_pallet', 'obj_stand_l', 'obj_stand_r');
    return out;
  }
  window.__compute = compute;

  // ---- tabs
  var TABS = ['versions', 'old', 'builder', 'flat'];
  function small() { return Math.min(window.innerWidth || 1200, (window.screen && window.screen.width) || 1200) < 700; }   /* телефон */
  function tab(t) {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    TABS.forEach(function (x) { $('#' + x).hidden = x !== t; });
    if (t === 'builder') render();          /* сцена конструктора грузится только когда его открыли */
    writeHash();
  }
  function curTab() { return TABS.filter(function (x) { return !$('#' + x).hidden; })[0] || 'versions'; }
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { tab(b.dataset.tab); }; });

  // ---- варианты
  var grid = $('#grid');
  function card(img, full, title, desc, onbuild, o) {
    var fig = document.createElement('figure');
    var im = document.createElement('img'); im.loading = 'lazy'; im.decoding = 'async';
    if (o && o.w) { im.width = o.w; im.height = o.h; }             /* место под картинку держится до загрузки: страница не прыгает */
    if (o && o.mid) im.setAttribute('data-mid', o.mid);            /* средний размер для телефона */
    im.src = img; im.setAttribute('data-full', full); im.alt = title;
    var cap = document.createElement('figcaption'); var b = document.createElement('b'); b.textContent = title; var s = document.createElement('span'); s.textContent = desc;
    cap.appendChild(b); cap.appendChild(s); fig.appendChild(im); fig.appendChild(cap);
    if (onbuild) {
      var bar = document.createElement('div'); bar.className = 'cardbar'; var btn = document.createElement('button'); btn.textContent = 'В конструктор';
      btn.onclick = onbuild; bar.appendChild(btn); fig.appendChild(bar);
    }
    return fig;
  }
  /* Новые варианты и «как сейчас» - в первой сетке; готовые макеты 2025 года - отдельным блоком ниже.
     Номер закреплён за вариантом (v.num): снятый номер не переиспользуется. */
  function vcard(v) {
    var fig = card('img/' + v.id + '_s.jpg', 'img/' + v.id + '.jpg', (v.num ? v.num + '. ' : '') + v.title, v.desc, function () { load(v.state); tab('builder'); window.scrollTo(0, 0); }, { mid: 'img/' + v.id + '_m.jpg', w: 1280, h: 380 });
    fig.setAttribute('data-vid', v.id);
    return fig;
  }
  D.variants.forEach(function (v) { if (v.sec !== 'old') grid.appendChild(vcard(v)); });
  grid.appendChild(card('img/now_s.jpg', 'img/now.jpg', 'Как сейчас', 'Фото 19.12.2024 без изменений, для сравнения.', null, { mid: 'img/now_m.jpg', w: 1280, h: 380 }));

  // ---- макеты 2025 года: готовые баннеры на нашем фото и листы всех подач
  var oldbox = $('#oldbox'), byVid = {};
  D.variants.forEach(function (v) { byVid[v.id] = v; });
  (D.old || []).forEach(function (sec) {
    var h = document.createElement('h2'); h.textContent = sec.title; oldbox.appendChild(h);
    if (sec.note) { var n = document.createElement('p'); n.className = 'note'; n.textContent = sec.note; oldbox.appendChild(n); }
    var g = document.createElement('div'); g.className = 'grid'; g.style.marginTop = '10px'; oldbox.appendChild(g);
    (sec.vids || []).forEach(function (id) { g.appendChild(vcard(byVid[id])); });
    sec.sheets.forEach(function (sh) { g.appendChild(card(sh.img, sh.full, sh.title, sh.desc, null, { w: sh.w, h: sh.h })); });
  });

  // ---- баннеры отдельно
  var flatbox = $('#flatbox');
  Object.keys(D.flat).forEach(function (did) {
    var h = document.createElement('h2'); h.textContent = D.designs[did].label; flatbox.appendChild(h);
    var p = document.createElement('p'); p.className = 'note'; p.textContent = D.designs[did].desc; flatbox.appendChild(p);
    var g = document.createElement('div'); g.className = 'grid flat';
    D.flat[did].forEach(function (f) {
      var fig = document.createElement('figure'); var im = document.createElement('img'); im.loading = 'lazy'; im.decoding = 'async';
      if (f.w) { im.width = f.w; im.height = f.h; }
      im.src = f.src; im.alt = D.designs[did].label + ' \u00B7 ' + f.label;
      var cap = document.createElement('figcaption'); var s = document.createElement('span'); s.textContent = D.designs[did].label + ' · ' + f.label; cap.appendChild(s);
      fig.appendChild(im); fig.appendChild(cap); g.appendChild(fig);
    });
    flatbox.appendChild(g);
  });

  // ---- сцена
  var stage = $('#stage'), pool = [];
  var bg = document.createElement('img'); bg.className = 'bgimg'; bg.alt = ''; stage.appendChild(bg);
  var zoomLevel = 1;
  function baseSrc() { return (small() && zoomLevel === 1 && D.base_m) ? D.base_m : D.base; }   /* на телефоне фон вдвое легче, пока сцена не увеличена */
  function place(im, id) {
    var L = D.layers[id];
    if (im.getAttribute('data-id') !== id) { im.src = L.src; im.setAttribute('data-id', id); }
    im.style.left = (L.x / D.W * 100) + '%'; im.style.top = (L.y / D.H * 100) + '%';
    im.style.width = (L.w / D.W * 100) + '%'; im.hidden = false;
  }

  // ---- кнопки
  var ctl = $('#ctl'), buttons = {};
  function opts(box, g) {
    g.options.forEach(function (o) {
      var b = document.createElement('button'); b.textContent = o.label;
      b.onclick = function () {
        state[g.id] = o.id;
        if (g.id === 'design') { state.sl = state.sm = state.sr = 'same'; }
        render();
      };
      box.appendChild(b); (buttons[g.id] = buttons[g.id] || []).push([o.id, b]);
    });
  }
  D.groups.forEach(function (g) {
    var r = document.createElement('div'); r.className = 'row';
    var lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = g.label;
    if (g.id === 'layout') { var hn = document.createElement('span'); hn.className = 'hint'; hn.id = 'layhint'; lab.appendChild(hn); }
    var box = document.createElement('div'); box.className = 'opts'; r.appendChild(lab); r.appendChild(box); opts(box, g); ctl.appendChild(r);
  });
  var det = document.createElement('details'); det.className = 'row';
  var sum = document.createElement('summary'); sum.textContent = 'Смешать: свой дизайн на каждом месте'; det.appendChild(sum);
  var sub = document.createElement('div'); sub.className = 'sub'; det.appendChild(sub);
  D.mix.forEach(function (g) {
    var lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = g.label;
    var box = document.createElement('div'); box.className = 'opts'; sub.appendChild(lab); sub.appendChild(box); opts(box, g);
  });
  ctl.appendChild(det);

  function hasAlt() {
    return [['sm', 'mid_p'], ['sr', 'right_g']].some(function (p) { var did = state[p[0]] === 'same' ? state.design : state[p[0]]; return !!D.designs[did].slots[p[1]]; });
  }
  function render() {
    var ids = compute(state);
    if (curTab() === 'builder') {          /* пока конструктор закрыт, его картинки не грузятся */
      var bs = baseSrc(); if (bg.getAttribute('data-src') !== bs) { bg.src = bs; bg.setAttribute('data-src', bs); }
      while (pool.length < ids.length) { var im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; stage.appendChild(im); pool.push(im); }
      pool.forEach(function (im, i) { if (i < ids.length) place(im, ids[i]); else im.hidden = true; });
    }
    var alt = hasAlt();
    Object.keys(buttons).forEach(function (k) {
      buttons[k].forEach(function (p) {
        p[1].classList.toggle('on', p[0] === state[k]);
        if (k === 'layout') p[1].disabled = !alt && p[0] === 'c';
      });
    });
    var hn = $('#layhint'); if (hn) hn.textContent = alt ? '' : 'для этого дизайна есть только вариант «справа»';
    if (state.sl !== 'same' || state.sm !== 'same' || state.sr !== 'same') det.open = true;
    $('#code').textContent = code();
    writeHash();
  }
  function key() { return KEYS.map(function (k) { return state[k]; }).join('.'); }
  function code() {
    var parts = D.groups.map(function (g) { return g.label + ': ' + label(g.id, state[g.id]); });
    D.mix.forEach(function (g) { if (state[g.id] !== 'same') parts.push(g.label + ': ' + label(g.id, state[g.id])); });
    return parts.join(' | ') + '  [' + key() + ']';
  }
  function load(st) { KEYS.forEach(function (k) { if (st[k] !== undefined && ok(k, st[k])) state[k] = st[k]; }); render(); }
  function writeHash() {
    var t = curTab();
    try { history.replaceState(history.state, '', '#' + t + (t === 'builder' ? '=' + key() : '')); } catch (e) {}
  }
  function copy(btn, text, okText) {
    var back = btn.textContent;
    var done = function () { btn.textContent = okText; setTimeout(function () { btn.textContent = back; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Скопируйте:', text); });
    else window.prompt('Скопируйте:', text);
  }
  $('#copy').onclick = function () { copy($('#copy'), $('#code').textContent, 'Скопировано'); };
  $('#copylink').onclick = function () { copy($('#copylink'), location.href, 'Ссылка скопирована'); };

  // ---- размер сцены: вписать, x2, x3 (на телефоне листается вбок)
  document.querySelectorAll('[data-zoom]').forEach(function (b) {
    b.onclick = function () {
      var z = +b.dataset.zoom; stage.style.width = (z * 100) + '%'; zoomLevel = z; render();
      document.querySelectorAll('[data-zoom]').forEach(function (x) { x.classList.toggle('on', x === b); });
      var sc = $('#scroll'); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
    };
  });

  // ---- крупно: склеить фото и слои в одну картинку и открыть в общем просмотрщике (Esc, ×, тап, «Назад»)
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function big() {
    var ids = compute(state), srcs = [D.base].concat(ids.map(function (id) { return D.layers[id].src; }));
    var btn = $('#bigbtn'), back = 'Открыть крупно'; btn.disabled = true; btn.textContent = 'Собираю картинку\u2026';
    var done = function () { btn.disabled = false; btn.textContent = back; };
    Promise.all(srcs.map(loadImg)).then(function (ims) {
      var k = small() ? 2560 / D.W : 1;                      /* на телефоне картинка поменьше: быстрее и без нехватки памяти */
      var c = document.createElement('canvas'); c.width = Math.round(D.W * k); c.height = Math.round(D.H * k); var x = c.getContext('2d');
      x.drawImage(ims[0], 0, 0, c.width, c.height);
      ids.forEach(function (id, i) { var L = D.layers[id]; x.drawImage(ims[i + 1], L.x * k, L.y * k, L.w * k, L.h * k); });
      var url = c.toDataURL('image/jpeg', 0.88);
      done();
      if (window.__viewer) window.__viewer.open([{ thumb: url, full: url, mid: '', title: 'Конструктор: ' + label('design', state.design), r: D.W / D.H }], 0);
    }, done);
  }
  $('#bigbtn').onclick = big;
  stage.onclick = big;

  $('#upd').textContent = D.updated;
  var u2 = $('#upd2'); if (u2) u2.textContent = 'обновлено ' + D.updated;
  var sb = $('#sites');
  if (sb) (D.sites || []).forEach(function (x) { var a = document.createElement('a'); a.href = x.url; a.textContent = 'сайт ' + x.name; a.className = 'other'; sb.appendChild(a); });

  // ---- вкладка открыта давно, а сайт обновился: показать полосу «есть новая версия»
  function checkVersion() {
    if (typeof fetch !== 'function') return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var bar = $('#newver'); if (bar && j && j.v && j.v !== D.version) { bar.hidden = false; }
    }).catch(function () {});
  }
  var nb = $('#newverbtn'); if (nb) nb.onclick = function () { location.reload(); };
  if (typeof setInterval === 'function') { setInterval(checkVersion, 60000); checkVersion(); }
  if (document.addEventListener) document.addEventListener('visibilitychange', function () { if (!document.hidden) checkVersion(); });

  // ---- старт по адресу
  var h = decodeURIComponent(location.hash.slice(1));
  var t0 = h.split('=')[0];
  if (t0 === 'builder') {
    var p = (h.split('=')[1] || '').split('.');
    if (p.length >= 7) KEYS.forEach(function (k, i) { if (i < p.length && ok(k, p[i])) state[k] = p[i]; });
  }
  render();
  tab(TABS.indexOf(t0) >= 0 ? t0 : 'versions');
})();
