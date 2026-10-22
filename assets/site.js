
  (function () {
    /* ---------- Anatomía: puntos interactivos ---------- */
    var stage = document.getElementById('anatomia-stage');
    if (stage) {
      var card = document.getElementById('pin-card');
      var pins = stage.querySelectorAll('.pin');
      var rows = document.querySelectorAll('.anatomy-row');
      var list = document.querySelector('.anatomia-list');
      var data = [];
      rows.forEach(function (r) {
        data.push({ t: r.querySelector('.t').textContent, d: r.querySelector('.d').textContent });
      });
      var active = null;

      var leader = document.getElementById('leader');
      var lnS = document.getElementById('ln-s'), ln = document.getElementById('ln');
      var ar = document.getElementById('ar'), nd = document.getElementById('nd');

      function place(pin) {
        var sw = stage.clientWidth, sh = stage.clientHeight;
        var px = pin.offsetLeft + pin.offsetWidth / 2, py = pin.offsetTop + pin.offsetHeight / 2;
        var cw = card.offsetWidth, ch = card.offsetHeight;
        var left = px < sw * 0.5 ? 8 : sw - cw - 8;
        var top = 8;
        card.style.left = left + 'px';
        card.style.top = top + 'px';
        leader.setAttribute('width', sw); leader.setAttribute('height', sh);
        leader.setAttribute('viewBox', '0 0 ' + sw + ' ' + sh);

        var ax = Math.min(Math.max(left + 24, px), left + cw - 24);
        var ay = top + ch;
        var dx = Math.abs(ax - px);
        var ky = Math.max(ay + 14, py - dx);              // codo a 45° y luego vertical
        var kx = ax;
        // punto de partida: borde del pin sobre el primer tramo
        var L1 = Math.sqrt((kx - px) * (kx - px) + (ky - py) * (ky - py));
        var gap = 30, sx, sy, d;
        if (L1 >= gap + 2) {                              // el tramo diagonal es suficientemente largo
          var u1x = (kx - px) / L1, u1y = (ky - py) / L1;
          sx = px + u1x * gap; sy = py + u1y * gap;
          d = 'M' + sx + ' ' + sy + ' L' + kx + ' ' + ky + ' L' + ax + ' ' + ay;
        } else {                                          // casi vertical: se parte desde el borde del pin
          var L2 = Math.sqrt((ax - kx) * (ax - kx) + (ay - ky) * (ay - ky)) || 1;
          var u2x = (ax - kx) / L2, u2y = (ay - ky) / L2, rest = gap - L1;
          sx = kx + u2x * rest; sy = ky + u2y * rest;
          d = 'M' + sx + ' ' + sy + ' L' + ax + ' ' + ay;
        }
        ln.setAttribute('d', d); lnS.setAttribute('d', d);
        // flecha apuntando al pin, alineada con el inicio de la línea
        var wx = sx - px, wy = sy - py, wl = Math.sqrt(wx * wx + wy * wy) || 1;
        var ux = wx / wl, uy = wy / wl;
        var tipx = px + ux * 19, tipy = py + uy * 19;
        var bx = tipx + ux * 13, by = tipy + uy * 13, nx = -uy * 6.5, ny = ux * 6.5;
        ar.setAttribute('points', tipx + ',' + tipy + ' ' + (bx + nx) + ',' + (by + ny) + ' ' + (bx - nx) + ',' + (by - ny));
        nd.setAttribute('x', ax - 4); nd.setAttribute('y', ay - 4);
      }

      function show(i) {
        var pin = pins[i - 1];
        card.classList.remove('is-open'); leader.classList.remove('is-open');
        card.querySelector('.pc-n').textContent = 'Nº ' + String(i).padStart(2, '0');
        card.querySelector('.pc-t').textContent = data[i - 1].t;
        card.querySelector('.pc-d').textContent = data[i - 1].d;
        place(pin);
        void card.offsetWidth;                                 // reinicia las animaciones
        card.classList.add('is-open'); leader.classList.add('is-open');
      }

      function open(i, focusCard) {
        active = i;
        pins.forEach(function (p, k) { p.setAttribute('aria-expanded', k === i - 1 ? 'true' : 'false'); });
        rows.forEach(function (r, k) { r.classList.toggle('is-active', k === i - 1); });
        list.classList.add('has-active');
        show(i);
        if (focusCard) { stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      }
      function close() {
        active = null;
        card.classList.remove('is-open'); leader.classList.remove('is-open');
        pins.forEach(function (p) { p.setAttribute('aria-expanded', 'false'); });
        rows.forEach(function (r) { r.classList.remove('is-active'); });
        list.classList.remove('has-active');
      }

      pins.forEach(function (p) {
        p.addEventListener('click', function (e) {
          e.stopPropagation();
          var i = +p.getAttribute('data-i');
          if (active === i) { close(); } else { open(i); }
        });
      });
      rows.forEach(function (r, k) {
        function go() { if (active === k + 1) { close(); } else { open(k + 1, true); } }
        r.addEventListener('click', go);
        r.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
      });
      card.querySelector('.pc-x').addEventListener('click', function (e) { e.stopPropagation(); close(); });
      card.addEventListener('click', function (e) { e.stopPropagation(); });
      document.addEventListener('click', function (e) {
        if (!active || e.target.closest('.anatomy-row')) return;
        if (!stage.contains(e.target) || e.target.closest('.anatomia-shot')) { close(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && active) { var pin = pins[active - 1]; close(); pin.focus(); }
      });
      window.addEventListener('resize', function () { if (active) { place(pins[active - 1]); } });
    }


    /* ---------- Caja de regalo: foto en el teléfono -> batería baja -> la foto se vuelve Power Bank -> 5 formas de cargar ----------
       Todo cuelga de UN solo reloj (clock). Cada foto es un ciclo y cada ciclo muestra una forma de conectar
       (MagSafe, USB-C, Lightning, USB-C a USB-C, dos dispositivos). El estado visual es una función pura de (foto, tiempo):
       pausar, saltar o salir de pantalla nunca descuadra nada. */
    var deck = document.getElementById('deck');
    if (deck) {
      var mo = document.getElementById('momento');
      var fly = mo.querySelector('.mo-fly'), pb = mo.querySelector('.mo-pb'), cableSvg = mo.querySelector('.mo-cable');
      var clicks = Array.prototype.slice.call(mo.querySelectorAll('.mo-click'));
      var label = mo.querySelector('.mo-label'), lblT = label.querySelector('b'), lblD = label.querySelector('span');
      var imgs = Array.prototype.slice.call(fly.querySelectorAll('img'));
      var N = imgs.length;
      var ttl = document.getElementById('regalo-title');
      var moments = [['Propuesta', 'Hoy · 8:30 pm'], ['Entrevista', 'Mañana · 9 am'], ['Vuelo', 'Hoy · 6:45 am'], ['Brindis', 'Hoy · 11:59 pm'], ['Aniversario', 'Hoy · 9:00 pm']];
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var words = ttl ? ttl.querySelectorAll('.w').length : 0;

      /* teléfonos: el principal y un segundo (clon) que solo aparece en el modo "dos dispositivos" */
      function bind(el) {
        return { el: el, pct: el.querySelector('.mo-pct'), prg: el.querySelector('.prg'), fill: el.querySelector('.mo-bat i'), cap: el.querySelector('.mo-cap'),
          alertEl: el.querySelector('.mo-alert'), lowEl: el.querySelector('.mo-lowbat'), screen: el.querySelector('.mo-screen'),
          ev: el.querySelector('.mo-alert b'), when: el.querySelector('.mo-alert small'), lastPct: -1, lastCap: '' };
      }
      var phoneEl = mo.querySelector('.mo-phone');
      var clone = phoneEl.cloneNode(true); clone.classList.add('second'); clone.setAttribute('data-k', 'iphone');
      phoneEl.parentNode.insertBefore(clone, phoneEl.nextSibling);
      var PH = [bind(phoneEl), bind(clone)];
      var simgs = imgs.map(function (im) { var c = im.cloneNode(); c.className = ''; PH[0].screen.appendChild(c); return c; });

      /* cables (hasta 2) + enchufe del lado del Power Bank para el modo USB-C a USB-C */
      var PLUG = '<g class="p-usbc"><rect x="-6.8" y="0" width="13.6" height="19" rx="3.4" fill="#D5D9E0" stroke="#8D939E" stroke-width=".8"/><rect x="-4.3" y="1.6" width="8.6" height="3" rx="1.5" fill="#2B2E35"/><rect class="cb-collar" x="-8" y="19" width="16" height="12" rx="3.5"/></g>' +
        '<g class="p-lt"><rect x="-4.7" y="0" width="9.4" height="18" rx="1.8" fill="#D9DCE2" stroke="#8D939E" stroke-width=".8"/><rect x="-3.4" y="1.4" width="1.2" height="5" fill="#C79A2E"/><rect x="-1.5" y="1.4" width="1.2" height="5" fill="#C79A2E"/><rect x=".3" y="1.4" width="1.2" height="5" fill="#C79A2E"/><rect x="2.2" y="1.4" width="1.2" height="5" fill="#C79A2E"/><circle cx="-4.7" cy="12" r="1.3" fill="#6F7580"/><circle cx="4.7" cy="12" r="1.3" fill="#6F7580"/><rect class="cb-collar" x="-7.5" y="18" width="15" height="12" rx="3.5"/></g>';
      var NS = 'http://www.w3.org/2000/svg';
      function mk(tag, cls, parent) { var e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); parent.appendChild(e); return e; }
      var CB = [0, 1].map(function () {
        var g = mk('g', '', cableSvg), c = { g: g };
        c.out = mk('path', 'cb-out', g); c.line = mk('path', 'cb', g); c.fx = mk('path', 'cb-fx', g);
        c.plug = mk('g', 'plug', g); c.plug.innerHTML = PLUG; c.g.style.display = 'none';
        return c;
      });
      var plugA = mk('g', 'plug', cableSvg); plugA.innerHTML = PLUG; plugA.setAttribute('data-k', 'usbc'); plugA.style.display = 'none';

      /* línea de tiempo base de un ciclo (ms); cada modo añade las suyas */
      var T0 = { arr: 500, d0: 600, msg: 1500, low: 2300, out: 2900, pop: 3450, pose1: 3700, hold: 3900, m1: 4500 };
      function ext(o) { var r = {}, k; for (k in T0) r[k] = T0[k]; for (k in o) r[k] = o[k]; return r; }

      /* lienzo de diseño 420x540. Postura: x,y = centro; s = escala; rz = inclinación; ry = giro */
      var HERO = { x: 210, y: 262, s: 1.7, rz: 0, ry: 0 };
      var BW = 150, BH = 104;
      var SIDE_PH = { x: 118, y: 224, s: 1.4, rz: -6, ry: 0 }, SIDE_BK = { x: 320, y: 328, s: 1.0, r: 0 };
      var PREP = { x: 150, y: 240, s: 1.45, rz: -5, ry: 0 }, SIDE = { x: 176, y: 240, s: 1.45, rz: -5, ry: -62 }, FINAL = { x: 172, y: 240, s: 1.45, rz: -7, ry: 0 };
      var MODES = [
        { key: 'mag', t: 'MagSafe', d: 'Se pega por detrás y carga sin cables', k: ['iphone'], slots: '', T: ext({ con: 5800, c1: 7200, f1: 7800, x1: 8400 }),
          bank: { x: 340, y: 340, s: 1.0, r: 10 }, away: { x: 340, y: 340, s: 1.0, r: 10 }, ox: 18, oy: 30, cables: [] },
        { key: 'usbc', t: 'Cable USB-C integrado', d: 'Sale del lateral y también sirve de correa', k: ['android'], slots: 'l', T: ext({ g0: 4650, g1: 5300, con: 5500, c1: 6900, f1: 7500, x1: 8100 }),
          phones: [SIDE_PH], bank: SIDE_BK, exit: [46, 10], cables: [{ kind: 'usbc', col: '#E9E1CF', from: 'l', ph: 0, c1: [-10, 125] }] },
        { key: 'lt', t: 'Cable Lightning integrado', d: 'Para tu iPhone', k: ['iphone'], slots: 'l', T: ext({ g0: 4650, g1: 5300, con: 5500, c1: 6900, f1: 7500, x1: 8100 }),
          phones: [SIDE_PH], bank: SIDE_BK, exit: [46, 10], cables: [{ kind: 'lt', col: '#E9E1CF', from: 'l', ph: 0, c1: [-10, 125] }] },
        { key: 'cc', t: 'USB-C a USB-C', d: 'Con tu propio cable, desde el puerto USB-C', k: ['android'], slots: 'p', T: ext({ a0: 4500, a1: 4800, g0: 4800, g1: 5400, con: 5600, c1: 7000, f1: 7600, x1: 8200 }),
          phones: [SIDE_PH], bank: SIDE_BK, exit: [46, 10], cables: [{ kind: 'usbc', col: '#F7F7F9', from: 'p', ph: 0 }] },
        { key: 'dual', t: 'Dos dispositivos a la vez', d: 'Comparte la carga con amigos o familia', k: ['android', 'iphone'], slots: 'l r', T: ext({ g0: 5000, g1: 5700, con: 5900, c1: 7300, f1: 7900, x1: 8500 }),
          phones: [{ x: 105, y: 190, s: 1.05, rz: -4, ry: 0 }, { x: 315, y: 190, s: 1.05, rz: 4, ry: 0 }], bank: { x: 210, y: 408, s: 1.1, r: 0 }, exit: [0, 30],
          cables: [{ kind: 'usbc', col: '#E9E1CF', from: 'l', ph: 0, c1: [-62, 18], k2: 70 }, { kind: 'lt', col: '#E9E1CF', from: 'r', ph: 1, c1: [62, 18], k2: 70 }] }
      ];
      function rad(d) { return d * Math.PI / 180; }
      function portPt(p) { var z = rad(p.rz), vy = 133 * p.s; return { x: p.x - vy * Math.sin(z), y: p.y + vy * Math.cos(z) }; }
      MODES.forEach(function (m) {
        m.cables.forEach(function (c, i) {
          var p = m.phones[c.ph], b = m.bank, z = rad(p.rz), E = portPt(p), S, C1;
          var up = { x: Math.sin(z), y: -Math.cos(z) };
          if (c.from === 'p') { c.tipA = { x: b.x - 28 * b.s, y: b.y + BH / 2 * b.s - 1 }; S = { x: c.tipA.x, y: c.tipA.y + 29 }; C1 = { x: S.x, y: S.y + 70 }; }
          else { var sg = c.from === 'l' ? -1 : 1; S = { x: b.x + sg * (BW / 2 * b.s - 1), y: b.y - 13 * b.s }; C1 = { x: S.x + c.c1[0], y: S.y + c.c1[1] }; }
          var k2 = c.k2 || 84, C2 = { x: E.x - up.x * k2, y: E.y - up.y * k2 };
          c.up = up; c.E = E;
          c.pd = 'M' + S.x.toFixed(1) + ',' + S.y.toFixed(1) + ' C' + C1.x.toFixed(1) + ',' + C1.y.toFixed(1) + ' ' + C2.x.toFixed(1) + ',' + C2.y.toFixed(1) + ' ' + E.x.toFixed(1) + ',' + E.y.toFixed(1);
          CB[0].line.setAttribute('d', c.pd); c.len = CB[0].line.getTotalLength();
        });
      });

      function lerp(a, b, k) { return a + (b - a) * k; }
      function clamp(k) { return k < 0 ? 0 : (k > 1 ? 1 : k); }
      function seg(lt, a, b) { return clamp((lt - a) / (b - a)); }
      function inOut(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
      function inOut2(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
      function outBack(k) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
      function snap(k) { var c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
      function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
      function inCubic(k) { return k * k * k; }
      function mix(A, B, k) { var o = {}; for (var p in A) { o[p] = lerp(A[p], B[p], k); } return o; }

      var GS = { l: 91, t: 47.8, w: 238, h: 428.4, r: 42.5, b: 0, rot: 0 };
      var G1 = { l: 65, t: 68, w: 290, h: 387, r: 6, b: 5, rot: -3 };
      function bankRect(p) { return { l: p.x - BW / 2 * p.s, t: p.y - BH / 2 * p.s, w: BW * p.s, h: BH * p.s, r: 28 * p.s, b: 0, rot: p.r }; }

      var idx = 0, clock = 0, shownIdx = -1, lastState = '', titleDone = false, msgOn = null, lowOn = null;

      function setPct(ph, v) {
        var r = Math.round(v);
        if (r === ph.lastPct) return;
        ph.lastPct = r;
        ph.pct.textContent = r + '%';
        ph.prg.style.strokeDashoffset = 100 - r;
        ph.fill.style.width = r + '%';
        ph.el.setAttribute('data-lvl', r < 20 ? 'low' : (r < 60 ? 'mid' : 'hi'));
      }
      function titleReveal() {
        if (titleDone || !ttl) return;
        titleDone = true;
        ttl.classList.remove('is-armed');
        ttl.classList.add('is-written');
        setTimeout(function () { ttl.classList.add('is-foil'); }, words * 160 + 650);
      }
      function showPhoto(i) {
        var m = MODES[i];
        imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); simgs[k].classList.toggle('on', k === i); });
        var mm = moments[i % moments.length];
        PH[0].ev.textContent = mm[0]; PH[0].when.textContent = mm[1];
        mo.setAttribute('data-mode', m.key); mo.setAttribute('data-slots', m.slots);
        lblT.textContent = m.t; lblD.textContent = m.d;
        PH[0].el.setAttribute('data-k', m.k[0]); PH[1].el.setAttribute('data-k', m.k[1] || 'iphone');
        GS.r = ((m.k[0] === 'iphone' ? 34 : 30) - 5) * 1.7;
        CB.forEach(function (c, n) {
          var d = m.cables[n];
          c.g.style.display = d ? '' : 'none';
          if (!d) return;
          [c.out, c.line, c.fx].forEach(function (p) { p.setAttribute('d', d.pd); });
          c.line.style.setProperty('--cab', d.col); c.g.style.setProperty('--cab', d.col);
          c.plug.setAttribute('data-k', d.kind);
        });
        var cc = m.cables[0];
        if (cc && cc.tipA) { plugA.style.display = ''; plugA.setAttribute('transform', 'translate(' + cc.tipA.x.toFixed(1) + ',' + cc.tipA.y.toFixed(1) + ')'); plugA.style.opacity = 0; } else { plugA.style.display = 'none'; }
        shownIdx = i;
      }
      function place(ph, P) {
        ph.el.style.transform = 'translate(' + (P.x - 210).toFixed(2) + 'px,' + (P.y - 250).toFixed(2) + 'px) rotate(' + P.rz.toFixed(2) + 'deg) rotateY(' + P.ry.toFixed(2) + 'deg) scale3d(' + P.s.toFixed(4) + ',' + P.s.toFixed(4) + ',' + P.s.toFixed(4) + ')';
      }

      function phonePose(lt, m) {
        var t = m.T;
        if (m.key === 'mag') {
          if (lt < t.out) return HERO;
          if (lt < t.pose1) return mix(HERO, PREP, inOut(seg(lt, t.out, t.pose1)));
          if (lt < 4500) return PREP;
          if (lt < 5000) return mix(PREP, SIDE, inOut(seg(lt, 4500, 5000)));
          if (lt < 5150) return SIDE;
          if (lt < 5800) return mix(SIDE, FINAL, inOut(seg(lt, 5150, 5800)));
          if (lt < t.f1) return FINAL;
          return mix(FINAL, HERO, inOut(seg(lt, t.f1, t.x1)));
        }
        var q = lt < t.out ? 0 : (lt < t.pose1 ? inOut(seg(lt, t.out, t.pose1)) : (lt < t.f1 ? 1 : 1 - inOut(seg(lt, t.f1, t.x1))));
        return mix(HERO, m.phones[0], q);
      }

      function render() {
        var lt = clock;
        if (shownIdx !== idx) showPhoto(idx);
        var m = MODES[idx], t = m.T, mag = m.key === 'mag', dual = m.key === 'dual';

        var st, cap, pct;
        if (lt < t.out) { st = 'idle'; cap = ''; }
        else if (lt < t.m1) { st = 'low'; cap = 'Batería baja'; }
        else if (lt < t.con) { st = 'dock'; cap = 'Conectando…'; }
        else if (lt < t.c1) { st = 'charging'; cap = 'Cargando'; }
        else { st = 'full'; cap = 'Carga completa'; }
        if (st !== lastState) { mo.setAttribute('data-state', st); lastState = st; }
        PH.forEach(function (ph) { if (cap !== ph.lastCap) { ph.cap.textContent = cap; ph.lastCap = cap; } });

        if (lt < t.d0) pct = 100;
        else if (lt < t.low) pct = 100 - 97 * inCubic(seg(lt, t.d0, t.low));
        else if (lt < t.con) pct = 3;
        else if (lt < t.c1) pct = 3 + 97 * inOut2(seg(lt, t.con, t.c1));
        else pct = 100;
        setPct(PH[0], pct);
        if (dual) setPct(PH[1], lt < t.con ? 9 : (lt < t.c1 ? 9 + 91 * inOut2(seg(lt, t.con, t.c1)) : 100));
        if (lt >= t.c1 && lt < t.f1) titleReveal();

        var mOn = lt >= t.msg && lt < t.out, lOn = lt >= t.low && lt < t.out;
        if (mOn !== msgOn) { PH[0].alertEl.classList.toggle('show', mOn); msgOn = mOn; }
        if (lOn !== lowOn) { PH[0].lowEl.classList.toggle('show', lOn); lowOn = lOn; }

        /* teléfono principal */
        var P = phonePose(lt, m), nud = 0;
        if (!mag && lt >= t.con - 120 && lt < t.con + 180) nud = 5 * Math.sin(Math.PI * seg(lt, t.con - 120, t.con + 180));
        var Pn = { x: P.x, y: P.y, s: P.s, rz: P.rz, ry: P.ry };
        if (nud) { Pn.x += Math.sin(rad(P.rz)) * nud; Pn.y -= Math.cos(rad(P.rz)) * nud; }
        place(PH[0], Pn);
        /* segundo teléfono (solo "dos dispositivos") */
        if (dual) {
          var tg = m.phones[1], off = { x: 500, y: 190, s: 1.05, rz: 10, ry: 0 };
          var q2 = lt < 4300 ? 0 : (lt < 5000 ? inOut(seg(lt, 4300, 5000)) : (lt < t.f1 ? 1 : 1 - inOut(seg(lt, t.f1, t.x1))));
          var P2 = mix(off, tg, q2);
          if (lt >= t.con - 120 && lt < t.con + 180) { var n2 = 5 * Math.sin(Math.PI * seg(lt, t.con - 120, t.con + 180)); P2.x += Math.sin(rad(P2.rz)) * n2; P2.y -= Math.cos(rad(P2.rz)) * n2; }
          PH[1].el.style.display = q2 > 0 ? 'block' : 'none';
          place(PH[1], P2);
        } else { PH[1].el.style.display = 'none'; }

        /* la foto en la pantalla */
        var so = lt < T0.arr ? outCubic(seg(lt, 0, T0.arr)) : (lt < t.out ? 1 : 0);
        PH[0].screen.style.opacity = so.toFixed(3);
        simgs[idx].style.transform = 'scale(' + (1 + .12 * (1 - outCubic(seg(lt, 0, T0.arr)))).toFixed(4) + ')';

        /* la foto sale y se convierte en Power Bank */
        var B = m.bank, start = mag ? m.away : B;
        var g, fo, bR = bankRect(start);
        if (lt < t.out) { g = GS; fo = 0; }
        else if (lt < t.pop) { g = mix(GS, G1, outBack(seg(lt, t.out, t.pop))); fo = 1; }
        else if (lt < t.hold) { g = mix(G1, G1, 0); g.rot = G1.rot + 1.2 * Math.sin(seg(lt, t.pop, t.hold) * Math.PI); fo = 1; }
        else { g = mix(G1, bR, inOut(seg(lt, t.hold, t.m1))); fo = 1 - seg(lt, 4400, 4650); }
        fly.style.cssText = 'left:' + g.l.toFixed(1) + 'px;top:' + g.t.toFixed(1) + 'px;width:' + g.w.toFixed(1) + 'px;height:' + g.h.toFixed(1) +
          'px;border-radius:' + Math.max(0, g.r).toFixed(1) + 'px;border-width:' + Math.max(0, g.b).toFixed(1) + 'px;opacity:' + fo.toFixed(3) +
          ';transform:rotate(' + g.rot.toFixed(2) + 'deg)';

        /* el Power Bank */
        var po = seg(lt, 4300, 4550), fl = 0, tf;
        if (mag) {
          var k = lt < 4600 ? 0 : (lt < 5150 ? snap(seg(lt, 4600, 5150)) : 1);
          var ex = 0, A = m.away;
          if (lt >= t.f1) { var rk = seg(lt, t.f1, t.f1 + 450); ex = 150 * inOut(rk); po = 1 - rk; }
          var cx = lerp(A.x, P.x, k), cy = lerp(A.y, P.y, k), s = lerp(A.s, P.s, k), rz = lerp(A.r, P.rz, k), ry = P.ry * k;
          tf = 'translate(' + (cx - 210).toFixed(1) + 'px,' + (cy - 250).toFixed(1) + 'px) rotate(' + rz.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translate3d(' +
            ((m.ox * k + ex) * s).toFixed(1) + 'px,' + (m.oy * k * s).toFixed(1) + 'px,' + (-26 * k * s).toFixed(1) + 'px) scale3d(' + s.toFixed(4) + ',' + s.toFixed(4) + ',' + s.toFixed(4) + ')';
          fl = lt >= 5050 ? 1 - seg(lt, 5050, 5450) : 0;
        } else {
          var bx = B.x, by = B.y;
          if (lt >= t.f1) { var r2 = seg(lt, t.f1, t.f1 + 450); bx += m.exit[0] * inOut(r2); by += m.exit[1] * inOut(r2); po = 1 - r2; }
          tf = 'translate(' + (bx - 210).toFixed(1) + 'px,' + (by - 250).toFixed(1) + 'px) rotate(' + B.r.toFixed(2) + 'deg) scale3d(' + B.s.toFixed(4) + ',' + B.s.toFixed(4) + ',' + B.s.toFixed(4) + ')';
        }
        pb.style.setProperty('--bo', po.toFixed(3));
        pb.style.transform = tf;
        mo.style.setProperty('--fl', (fl * .85).toFixed(3));

        /* enchufe del Power Bank (USB-C a USB-C) */
        if (m.cables[0] && m.cables[0].tipA) {
          var ap = seg(lt, t.a0, t.a1), ar = lt >= t.f1 ? 1 - seg(lt, t.f1 + 100, t.f1 + 400) : 1;
          plugA.style.opacity = (outCubic(ap) * ar).toFixed(3);
          plugA.setAttribute('transform', 'translate(' + m.cables[0].tipA.x.toFixed(1) + ',' + (m.cables[0].tipA.y + 24 * (1 - outCubic(ap))).toFixed(1) + ')');
        }

        /* cables */
        m.cables.forEach(function (c, n) {
          var o = CB[n], cp = 0, ins = 0;
          if (lt >= t.g0 && lt < t.f1) { cp = inOut2(seg(lt, t.g0, t.g1)); ins = 14 * seg(lt, t.g1, t.con); }
          else if (lt >= t.f1) { cp = 1 - inOut2(seg(lt, t.f1 + 100, t.f1 + 500)); ins = 14 * (1 - seg(lt, t.f1, t.f1 + 100)); }
          var vis = cp > 0.005 ? 1 : 0;
          o.out.style.opacity = vis; o.line.style.opacity = vis; o.plug.style.opacity = vis;
          var L = c.len * cp, off = (c.len - L).toFixed(1);
          [o.line, o.out].forEach(function (p) { p.style.strokeDasharray = c.len.toFixed(1); p.style.strokeDashoffset = off; });
          var p1 = o.line.getPointAtLength(L), p0 = o.line.getPointAtLength(Math.max(0, L - 1.5)), p2 = o.line.getPointAtLength(Math.min(c.len, L + 1.5));
          var tx = p2.x - p0.x, ty = p2.y - p0.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
          o.plug.setAttribute('transform', 'translate(' + (p1.x + tx * ins).toFixed(1) + ',' + (p1.y + ty * ins).toFixed(1) + ') rotate(' + (Math.atan2(tx, -ty) * 180 / Math.PI).toFixed(1) + ')');
          o.fx.style.opacity = (lt >= t.con && lt < t.c1 + 200) ? 1 : 0;
          o.fx.style.strokeDashoffset = (-(lt - t.con) * .05).toFixed(1);
          var ck = seg(lt, t.con, t.con + 520), ce = clicks[n];
          if (lt >= t.con && ck < 1) { ce.style.left = c.E.x.toFixed(1) + 'px'; ce.style.top = c.E.y.toFixed(1) + 'px'; ce.style.opacity = (1 - ck).toFixed(3); ce.style.transform = 'scale(' + (.4 + 2.2 * ck).toFixed(3) + ')'; }
          else { ce.style.opacity = 0; }
        });
        if (!m.cables.length) { clicks.forEach(function (ce) { ce.style.opacity = 0; }); }

        label.style.opacity = (seg(lt, 4400, 4750) * (1 - seg(lt, t.x1 - 750, t.x1 - 450))).toFixed(3);
      }

      /* ----- reloj maestro ----- */
      var inView = !('IntersectionObserver' in window), holdP = false, manualP = false, navigating = false, raf = 0, last = 0;
      function running() { return !reduce && inView && !document.hidden && !holdP && !manualP; }
      function frame(now) {
        raf = 0;
        if (!running()) return;
        var dt = Math.min(now - last, 100); last = now;
        if (!navigating) {
          clock += dt;
          var cyc = MODES[idx].T.x1;
          if (clock >= cyc) { clock -= cyc; idx = (idx + 1) % N; }
          render();
        }
        raf = requestAnimationFrame(frame);
      }
      function sync() {
        deck.classList.toggle('is-paused', !running());
        if (!raf && running()) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }
      function go(to) {
        if (navigating) return;
        navigating = true;
        mo.style.opacity = 0;
        setTimeout(function () {
          idx = (to + N) % N;
          clock = reduce ? 1000 : 0;
          render();
          mo.style.opacity = 1;
          navigating = false;
          if (reduce) titleReveal();
        }, 160);
      }
      function next() { go(idx + 1); }
      function prev() { go(idx - 1); }

      deck.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); manualP = !manualP; sync(); }
      });

      // tocar = siguiente; deslizar = siguiente/anterior; mantener presionado = pausa mientras se sostiene (nunca queda pegado)
      var sx = 0, down = false, held = false, holdT = 0;
      function release() { clearTimeout(holdT); if (held) { held = false; holdP = false; sync(); } }
      deck.addEventListener('pointerdown', function (e) {
        down = true; held = false; sx = e.clientX;
        clearTimeout(holdT);
        holdT = setTimeout(function () { held = true; holdP = true; sync(); }, 300);
      });
      deck.addEventListener('pointerup', function (e) {
        if (!down) return;
        down = false;
        var wasHeld = held;
        release();
        if (wasHeld) return;
        var dx = e.clientX - sx;
        if (Math.abs(dx) > 50) { if (dx < 0) { next(); } else { prev(); } }
        else if (Math.abs(dx) < 8) { next(); }
      });
      deck.addEventListener('pointercancel', function () { down = false; release(); });
      deck.addEventListener('pointerleave', function () { if (down) { down = false; release(); } });
      window.addEventListener('blur', function () { down = false; release(); });
      document.addEventListener('visibilitychange', sync);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          var e = en[0];
          inView = e.isIntersecting && (e.intersectionRatio >= .5 || e.intersectionRect.height >= window.innerHeight * .6);
          sync();
        }, { threshold: [0, .25, .5, .75, 1] }).observe(deck);
      }

      function fitScene() { mo.style.setProperty('--ms', (deck.clientWidth / 420).toFixed(4)); }
      fitScene();
      if ('ResizeObserver' in window) { new ResizeObserver(fitScene).observe(deck); } else { window.addEventListener('resize', fitScene); }

      if (reduce) {
        /* con movimiento reducido la escena es fija, pero cambia de forma cada 5 s (así no parece bloqueada) */
        titleReveal();
        clock = 1000;
        render();
        setInterval(function () { if (inView && !document.hidden) go(idx + 1); }, 5000);
      }
      else if (ttl) {
        ttl.classList.add('is-armed');
        if ('IntersectionObserver' in window) {
          var tT = null;
          var tio = new IntersectionObserver(function (en) {
            clearTimeout(tT);
            if (en[0].isIntersecting && !titleDone) {
              tT = setTimeout(function () { if (!running()) { titleReveal(); tio.disconnect(); } }, 1500);
            }
          }, { threshold: .6 });
          tio.observe(ttl);
        }
      }

      render();
      sync();
    }
  })();

/* ---------- Menú: panel móvil + enlace activo ---------- */
  (function () {
    var header = document.getElementById('site-header');
    var nav = document.getElementById('site-nav');
    var toggle = document.getElementById('nav-toggle');
    if (!header || !nav || !toggle) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var mq = window.matchMedia('(max-width: 900px)');
    var open = false;

    /* el panel arranca justo debajo de la barra (y la barra siempre queda pulsable).
       Se mide el borde inferior real: la barra tiene margen negativo, así que su
       alto no coincide con su borde inferior cuando la página está arriba. */
    var lastH = 0;
    function syncHeight() {
      var b = Math.round(header.getBoundingClientRect().bottom);
      if (!b || b === lastH) return;
      lastH = b;
      document.documentElement.style.setProperty('--hdr-h', b + 'px');
    }
    syncHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(header);
    else window.addEventListener('resize', syncHeight);
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { syncHeight(); tick = false; });
    }, { passive: true });

    function setOpen(state) {
      if (state === open) return;
      open = state;
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = nav.querySelector('a');
        if (first) first.focus();
      } else if (nav.contains(document.activeElement)) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(!open); });

    // cerrar al tocar un enlace del panel (y deslocar después, con el scroll liberado)
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || !mq.matches) return;
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#') {
        var id = href.slice(1);
        var target = document.getElementById(id);
        if (!target) return;                       // ancla que no está en esta página: deja navegar
        e.preventDefault();
        setOpen(false);
        requestAnimationFrame(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (history.replaceState) history.replaceState(null, '', '#' + id);
        });
      } else {
        setOpen(false);                            // enlace a otra página o externo: cierra y deja navegar
      }
    });

    // cerrar con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); }
    });

    // cerrar al hacer clic fuera del panel (la barra del header sigue siendo accesible)
    document.addEventListener('click', function (e) {
      if (!open) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    // al pasar a escritorio el panel se cierra
    var onChange = function () { if (!mq.matches && open) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);

    /* enlace activo según la sección visible */
    var sections = links.map(function (a) {
      var id = a.getAttribute('href').slice(1);
      return document.getElementById(id);
    }).filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
        var best = null, bestRatio = 0;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; }
        });
        links.forEach(function (a) {
          var on = best && a.getAttribute('href') === '#' + best;
          a.classList.toggle('is-active', !!on);
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }, { threshold: [0, .15, .3, .5, .75, 1], rootMargin: '-100px 0px -55% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  })();
