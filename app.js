/* Конструктор фасада: слои-картинки поверх фото. Состояние хранится в адресе (#k=...), ссылкой можно делиться. */
(function () {
  var D = window.DATA, $ = function (s) { return document.querySelector(s); };
  var KEYS = ['photo', 'roof', 'design', 'layout', 'gable', 'tside', 'tfront', 'sl', 'sm', 'sr'];
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
    if (st.tfront !== 'none') out.push('tfront_' + st.tfront);
    if (st.tside !== 'asis') out.push('tside_' + st.tside);
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
  var TABS = ['versions', 'builder', 'flat'];
  function tab(t) {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    TABS.forEach(function (x) { $('#' + x).hidden = x !== t; });
    writeHash();
  }
  function curTab() { return TABS.filter(function (x) { return !$('#' + x).hidden; })[0] || 'versions'; }
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { tab(b.dataset.tab); }; });

  // ---- варианты
  var grid = $('#grid');
  function card(img, full, title, desc, onbuild) {
    var fig = document.createElement('figure');
    var im = document.createElement('img'); im.loading = 'lazy'; im.src = img; im.setAttribute('data-full', full); im.alt = title;
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
    var fig = card('img/' + v.id + '_s.jpg', 'img/' + v.id + '.jpg', (v.num ? v.num + '. ' : '') + v.title, v.desc, function () { load(v.state); tab('builder'); window.scrollTo(0, 0); });
    fig.setAttribute('data-vid', v.id);
    return fig;
  }
  D.variants.forEach(function (v) { if (v.sec !== 'old') grid.appendChild(vcard(v)); });
  grid.appendChild(card('img/now_s.jpg', 'img/now.jpg', 'Как сейчас', 'Фото 19.12.2024 без изменений, для сравнения.', null));
  var olds = D.variants.filter(function (v) { return v.sec === 'old'; });
  if (olds.length || (D.sheets || []).length) {
    var vs = $('#versions');
    var oh = document.createElement('h2'); oh.textContent = 'Готовые макеты 2025 года'; vs.appendChild(oh);
    var on = document.createElement('p'); on.className = 'note'; on.textContent = 'Те макеты, что были сделаны в 2025 году, без правок. ' + (D.old_note || '').replace(' в нём', ' в них'); vs.appendChild(on);
    var og = document.createElement('div'); og.className = 'grid'; og.id = 'grid_old'; og.style.marginTop = '10px'; vs.appendChild(og);
    olds.forEach(function (v) { og.appendChild(vcard(v)); });
    (D.sheets || []).forEach(function (h) { og.appendChild(card(h.img, h.full, h.title, h.desc, null)); });
  }

  // ---- баннеры отдельно
  var flatbox = $('#flatbox');
  Object.keys(D.flat).forEach(function (did) {
    var h = document.createElement('h2'); h.textContent = D.designs[did].label; flatbox.appendChild(h);
    var p = document.createElement('p'); p.className = 'note'; p.textContent = D.designs[did].desc; flatbox.appendChild(p);
    var g = document.createElement('div'); g.className = 'grid flat';
    D.flat[did].forEach(function (f) {
      var fig = document.createElement('figure'); var im = document.createElement('img'); im.loading = 'lazy'; im.src = f.src; im.alt = f.label;
      var cap = document.createElement('figcaption'); var s = document.createElement('span'); s.textContent = D.designs[did].label + ' · ' + f.label; cap.appendChild(s);
      fig.appendChild(im); fig.appendChild(cap); g.appendChild(fig);
    });
    flatbox.appendChild(g);
  });

  // ---- сцена
  var stage = $('#stage'), pool = [];
  var bg = document.createElement('img'); bg.className = 'bgimg'; bg.alt = ''; bg.src = D.base; stage.appendChild(bg);
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
    while (pool.length < ids.length) { var im = document.createElement('img'); im.alt = ''; stage.appendChild(im); pool.push(im); }
    pool.forEach(function (im, i) { if (i < ids.length) place(im, ids[i]); else im.hidden = true; });
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
      var z = +b.dataset.zoom; stage.style.width = (z * 100) + '%';
      document.querySelectorAll('[data-zoom]').forEach(function (x) { x.classList.toggle('on', x === b); });
      var sc = $('#scroll'); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
    };
  });

  // ---- крупно: склеить фото и слои в одну картинку и открыть в общем просмотрщике (Esc, ×, тап, «Назад»)
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function big() {
    var ids = compute(state), srcs = [D.base].concat(ids.map(function (id) { return D.layers[id].src; }));
    var btn = $('#bigbtn'); btn.disabled = true;
    Promise.all(srcs.map(loadImg)).then(function (ims) {
      var c = document.createElement('canvas'); c.width = D.W; c.height = D.H; var x = c.getContext('2d');
      x.drawImage(ims[0], 0, 0, D.W, D.H);
      ids.forEach(function (id, i) { var L = D.layers[id]; x.drawImage(ims[i + 1], L.x, L.y, L.w, L.h); });
      var im = $('#bigimg'); im.src = c.toDataURL('image/jpeg', 0.9); $('#bigcap').textContent = 'Конструктор: ' + label('design', state.design);
      btn.disabled = false;
      im.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, function () { btn.disabled = false; });
  }
  $('#bigbtn').onclick = big;
  stage.onclick = big;

  $('#upd').textContent = D.updated;

  // ---- старт по адресу
  var h = decodeURIComponent(location.hash.slice(1));
  var t0 = h.split('=')[0];
  if (t0 === 'builder') {
    var p = (h.split('=')[1] || '').split('.');
    if (p.length === KEYS.length) KEYS.forEach(function (k, i) { if (ok(k, p[i])) state[k] = p[i]; });
  }
  render();
  tab(TABS.indexOf(t0) >= 0 ? t0 : 'versions');
})();
