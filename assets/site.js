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


    /* ---------- Caja de regalo: foto en el teléfono -> batería baja -> la foto se vuelve Power Bank -> 4 formas de cargar ----------
       Todo cuelga de UN solo reloj (clock). Cada foto es un ciclo de CYCLE ms y cada ciclo muestra una forma de conectar
       (MagSafe, cable USB-C, cable Lightning, USB-C a USB-C). El estado visual es una función pura de (foto, tiempo):
       pausar, saltar o salir de pantalla nunca descuadra nada. */
    var deck = document.getElementById('deck');
    if (deck) {
      var mo = document.getElementById('momento');
      var fly = mo.querySelector('.mo-fly'), pb = mo.querySelector('.mo-pb'), phone = mo.querySelector('.mo-phone'), screen = mo.querySelector('.mo-screen');
      var alertEl = mo.querySelector('.mo-alert'), lowEl = mo.querySelector('.mo-lowbat'), clickEl = mo.querySelector('.mo-click');
      var cbOut = document.getElementById('cb-out'), cb = document.getElementById('cb'), cbFx = document.getElementById('cb-fx');
      var plugA = document.getElementById('plug-a'), plugB = document.getElementById('plug-b'), cableSvg = mo.querySelector('.mo-cable');
      var label = mo.querySelector('.mo-label'), lblT = label.querySelector('b'), lblD = label.querySelector('span');
      var dots = Array.prototype.slice.call(mo.querySelectorAll('.mo-dots i'));
      var imgs = Array.prototype.slice.call(fly.querySelectorAll('img'));
      var N = imgs.length;
      var simgs = imgs.map(function (im) {  // la misma foto vive también en la pantalla del teléfono
        var c = im.cloneNode(); c.className = ''; screen.appendChild(c); return c;
      });
      var ttl = document.getElementById('regalo-title');
      var pctEl = document.getElementById('mo-pct'), prg = document.getElementById('mo-prg'), fill = document.getElementById('mo-fill');
      var capEl = document.getElementById('mo-cap'), evEl = document.getElementById('mo-ev'), whenEl = document.getElementById('mo-when');
      var moments = [['Propuesta', 'Hoy · 8:30 pm'], ['Entrevista', 'Mañana · 9 am'], ['Vuelo', 'Hoy · 6:45 am'], ['Brindis', 'Hoy · 11:59 pm']];
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var words = ttl ? ttl.querySelectorAll('.w').length : 0;

      /* línea de tiempo de un ciclo (ms) */
      var T = { arr: 500, d0: 600, msg: 1500, low: 2300, out: 2900, pop: 3450, pose1: 3700, hold: 3900, m1: 4500, grow: 5200, con: 5400, c1: 6800, f1: 7400, x1: 8000 };
      var CYCLE = T.x1;

      /* lienzo de diseño 420x500. Postura del teléfono: x,y = centro; s = escala; rz = inclinación; ry = giro hacia la izquierda */
      var HERO = { x: 210, y: 262, s: 1.7, rz: 0, ry: 0 };
      var BW = 150, BH = 104;               // cuerpo base del Power Bank
      var MODES = [
        { key: 'mag', t: 'MagSafe', d: 'Se pega por detrás y carga sin cables',
          phone: { x: 160, y: 244, s: 1.45, rz: -7, ry: -34 }, bank: { x: 262, y: 306, s: 1.25, r: 0 }, away: { x: 352, y: 350, s: 1.05, r: 12 } },
        { key: 'usbc', t: 'Cable USB-C integrado', d: 'Sale del lateral y también sirve de correa', cable: 'usbc', ccol: '#E9E1CF', from: 'side',
          phone: { x: 118, y: 224, s: 1.4, rz: -6, ry: 0 }, bank: { x: 338, y: 328, s: 1.0, r: 0 } },
        { key: 'lt', t: 'Cable Lightning integrado', d: 'El segundo cable, para dispositivos Apple', cable: 'lt', ccol: '#E9E1CF', from: 'side',
          phone: { x: 118, y: 224, s: 1.4, rz: -6, ry: 0 }, bank: { x: 338, y: 328, s: 1.0, r: 0 } },
        { key: 'cc', t: 'USB-C a USB-C', d: 'Con tu propio cable, desde el puerto USB-C', cable: 'usbc', ccol: '#F7F7F9', from: 'port',
          phone: { x: 118, y: 224, s: 1.4, rz: -6, ry: 0 }, bank: { x: 338, y: 328, s: 1.0, r: 0 } }
      ];
      function rad(d) { return d * Math.PI / 180; }
      /* trayecto del cable de cada modo (coordenadas del lienzo) */
      MODES.forEach(function (m) {
        if (!m.cable) return;
        var p = m.phone, b = m.bank, rz = rad(p.rz);
        var up = { x: Math.sin(rz), y: -Math.cos(rz) };                       // hacia dónde "mira" la parte alta del teléfono
        var vx = 0, vy = (131 + 1) * p.s;                                      // puerto USB: centro del borde inferior del teléfono
        var E = { x: p.x + vx * Math.cos(rz) - vy * Math.sin(rz), y: p.y + vx * Math.sin(rz) + vy * Math.cos(rz) };
        var S, C1;
        if (m.from === 'side') { S = { x: b.x - BW / 2 * b.s + 4, y: b.y + 12 * b.s }; C1 = { x: S.x - 10, y: S.y + 110 }; }
        else { S = { x: b.x - 30 * b.s, y: b.y + BH / 2 * b.s - 4 + 29 }; C1 = { x: S.x, y: S.y + 70 }; m.tipA = { x: b.x - 30 * b.s, y: b.y + BH / 2 * b.s - 4 }; }
        var C2 = { x: E.x - up.x * 84, y: E.y - up.y * 84 };
        m.up = up; m.E = E;
        m.pd = 'M' + S.x.toFixed(1) + ',' + S.y.toFixed(1) + ' C' + C1.x.toFixed(1) + ',' + C1.y.toFixed(1) + ' ' + C2.x.toFixed(1) + ',' + C2.y.toFixed(1) + ' ' + E.x.toFixed(1) + ',' + E.y.toFixed(1);
        cb.setAttribute('d', m.pd); m.len = cb.getTotalLength();
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

      /* pantalla del teléfono (en postura grande) = punto de partida de la foto que sale; foto entera; cuerpo del Power Bank */
      var GS = { l: 91, t: 47.8, w: 238, h: 428.4, r: 42.5, b: 0, rot: 0 };
      var G1 = { l: 65, t: 68, w: 290, h: 387, r: 6, b: 5, rot: -3 };
      function bankRect(p) { return { l: p.x - BW / 2 * p.s, t: p.y - BH / 2 * p.s, w: BW * p.s, h: BH * p.s, r: 28 * p.s, b: 0, rot: p.r }; }

      var idx = 0, clock = 0, shownIdx = -1, lastPct = -1, lastState = '', lastCap = '', titleDone = false, msgOn = null, lowOn = null;

      function setPct(v) {
        var r = Math.round(v);
        if (r === lastPct) return;
        lastPct = r;
        pctEl.textContent = r + '%';
        prg.style.strokeDashoffset = 100 - r;
        fill.style.width = r + '%';
        mo.setAttribute('data-lvl', r < 20 ? 'low' : (r < 60 ? 'mid' : 'hi'));
      }
      function titleReveal() {              // la frase se escribe una sola vez, la primera vez que el teléfono llega al 100%
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
        evEl.textContent = mm[0]; whenEl.textContent = mm[1];
        mo.setAttribute('data-mode', m.key);
        lblT.textContent = m.t; lblD.textContent = m.d;
        dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
        if (m.cable) {
          cb.setAttribute('d', m.pd); cbOut.setAttribute('d', m.pd); cbFx.setAttribute('d', m.pd);
          cableSvg.style.setProperty('--cab', m.ccol);
          plugB.setAttribute('data-k', m.cable);
          plugA.style.display = m.from === 'port' ? '' : 'none';
          if (m.tipA) { plugA.setAttribute('transform', 'translate(' + m.tipA.x.toFixed(1) + ',' + m.tipA.y.toFixed(1) + ')'); }
        }
        shownIdx = i;
      }

      /* estado completo de la escena para (foto idx, instante lt) */
      function render() {
        /* con movimiento reducido se muestra una foto fija (carga completa) y se cambia de forma cada 5 s */
        var lt = reduce ? T.c1 : clock;
        if (shownIdx !== idx) showPhoto(idx);
        var m = MODES[idx], mag = m.key === 'mag';

        /* texto de estado dentro del teléfono + estado CSS */
        var st, cap, pct;
        if (lt < T.out) { st = 'idle'; cap = ''; }
        else if (lt < T.m1) { st = 'low'; cap = 'Batería baja'; }
        else if (lt < T.con) { st = 'dock'; cap = 'Conectando…'; }
        else if (lt < T.c1) { st = 'charging'; cap = 'Cargando'; }
        else { st = 'full'; cap = 'Carga completa'; }
        if (st !== lastState) { mo.setAttribute('data-state', st); lastState = st; }
        if (cap !== lastCap) { capEl.textContent = cap; lastCap = cap; }

        if (lt < T.d0) pct = 100;
        else if (lt < T.low) pct = 100 - 97 * inCubic(seg(lt, T.d0, T.low));   // la batería se gasta mientras se mira la foto
        else if (lt < T.con) pct = 3;
        else if (lt < T.c1) pct = 3 + 97 * inOut2(seg(lt, T.con, T.c1));
        else pct = 100;
        setPct(pct);
        if (lt >= T.c1 && lt < T.f1) titleReveal();

        /* llega el mensaje, luego el aviso de batería baja */
        var mOn = lt >= T.msg && lt < T.out, lOn = lt >= T.low && lt < T.out;
        if (mOn !== msgOn) { alertEl.classList.toggle('show', mOn); msgOn = mOn; }
        if (lOn !== lowOn) { lowEl.classList.toggle('show', lOn); lowOn = lOn; }

        /* postura del teléfono: grande y centrado con la foto; al conectar se achica, se inclina y (MagSafe) gira un poco a la izquierda */
        var q = lt < T.out ? 0 : (lt < T.pose1 ? inOut(seg(lt, T.out, T.pose1)) : (lt < T.f1 ? 1 : 1 - inOut(seg(lt, T.f1, T.x1))));
        var P = mix(HERO, m.phone, q);
        phone.style.transform = 'translate(' + (P.x - 210).toFixed(2) + 'px,' + (P.y - 250).toFixed(2) + 'px) rotate(' + P.rz.toFixed(2) + 'deg) rotateY(' + P.ry.toFixed(2) + 'deg) scale(' + P.s.toFixed(4) + ')';

        /* la foto en la pantalla (llega con un pequeño zoom) */
        var so = lt < T.arr ? outCubic(seg(lt, 0, T.arr)) : (lt < T.out ? 1 : 0);
        screen.style.opacity = so.toFixed(3);
        simgs[idx].style.transform = 'scale(' + (1 + .12 * (1 - outCubic(seg(lt, 0, T.arr)))).toFixed(4) + ')';

        /* dónde nace el Power Bank: MagSafe llega desde fuera; con cable ya está en su sitio */
        var start = mag ? m.away : m.bank;
        var g, fo, bR = bankRect(start);
        if (lt < T.out) { g = GS; fo = 0; }
        else if (lt < T.pop) { g = mix(GS, G1, outBack(seg(lt, T.out, T.pop))); fo = 1; }
        else if (lt < T.hold) { g = mix(G1, G1, 0); g.rot = G1.rot + 1.2 * Math.sin(seg(lt, T.pop, T.hold) * Math.PI); fo = 1; }
        else { g = mix(G1, bR, inOut(seg(lt, T.hold, T.m1))); fo = 1 - seg(lt, 4400, 4650); }
        fly.style.cssText = 'left:' + g.l.toFixed(1) + 'px;top:' + g.t.toFixed(1) + 'px;width:' + g.w.toFixed(1) + 'px;height:' + g.h.toFixed(1) +
          'px;border-radius:' + Math.max(0, g.r).toFixed(1) + 'px;border-width:' + Math.max(0, g.b).toFixed(1) + 'px;opacity:' + fo.toFixed(3) +
          ';transform:rotate(' + g.rot.toFixed(2) + 'deg)';

        /* el Power Bank: fundido con la foto, se conecta y al final se va */
        var B = m.bank, bp, po = seg(lt, 4300, 4550), clickK = -1;
        if (lt < T.m1) { bp = start; }
        else if (lt < T.f1) {
          if (mag) { var gk = seg(lt, T.m1, 5000); bp = mix(m.away, B, snap(gk)); if (lt >= 5000 && lt < T.con) { clickK = seg(lt, 5000, T.con); } }
          else { bp = B; }
        } else {
          var rk = seg(lt, T.f1, T.f1 + 450);
          bp = mag ? mix(B, m.away, inOut(rk)) : { x: B.x + 46 * inOut(rk), y: B.y + 10 * inOut(rk), s: B.s, r: 0 };
          po = 1 - rk;
        }
        pb.style.opacity = po.toFixed(3);
        pb.style.transform = 'translate(' + (bp.x - 210).toFixed(1) + 'px,' + (bp.y - 250).toFixed(1) + 'px) rotate(' + bp.r.toFixed(2) + 'deg) scale(' + bp.s.toFixed(4) + ')';
        /* "clic" magnético sobre la bobina */
        if (clickK >= 0) {
          clickEl.style.left = (B.x + 23 * B.s) + 'px'; clickEl.style.top = B.y + 'px';
          clickEl.style.opacity = (1 - clickK).toFixed(3);
          clickEl.style.transform = 'scale(' + (.5 + 2.6 * clickK).toFixed(3) + ')';
        } else { clickEl.style.opacity = 0; }

        /* cable: crece desde el Power Bank, el conector entra en el teléfono y la energía fluye mientras carga */
        if (m.cable) {
          var cp = 0, ins = 0;
          if (lt >= T.m1 && lt < T.f1) { cp = inOut2(seg(lt, T.m1, T.grow)); ins = 14 * seg(lt, T.grow, T.con); }
          else if (lt >= T.f1) { cp = 1 - inOut2(seg(lt, T.f1 + 100, T.f1 + 500)); ins = 14 * (1 - seg(lt, T.f1, T.f1 + 100)); }
          var vis = cp > 0.005 ? 1 : 0;
          cableSvg.style.opacity = vis;
          var L = m.len * cp, off = (m.len - L).toFixed(1);
          [cb, cbOut].forEach(function (p) { p.style.strokeDasharray = m.len.toFixed(1); p.style.strokeDashoffset = off; });
          var p1 = cb.getPointAtLength(L), p0 = cb.getPointAtLength(Math.max(0, L - 1.5)), p2 = cb.getPointAtLength(Math.min(m.len, L + 1.5));
          var tx = p2.x - p0.x, ty = p2.y - p0.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
          var ang = Math.atan2(tx, -ty) * 180 / Math.PI;
          plugB.setAttribute('transform', 'translate(' + (p1.x + tx * ins).toFixed(1) + ',' + (p1.y + ty * ins).toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
          var fx = (lt >= T.con && lt < T.c1 + 200) ? 1 : 0;
          cbFx.style.opacity = fx;
          cbFx.style.strokeDashoffset = (-(lt - T.con) * .05).toFixed(1);
        } else { cableSvg.style.opacity = 0; }

        /* rótulo de la forma de conectar */
        label.style.opacity = (seg(lt, 4400, 4750) * (1 - seg(lt, 7250, 7550))).toFixed(3);
      }

      /* ----- reloj maestro ----- */
      /* La animación NUNCA se queda pegada: solo se detiene si la pestaña está oculta,
         si la escena no se ve, o si el usuario la pausa a mano. El mouse no la congela. */
      var inView = !('IntersectionObserver' in window), manualP = false, navigating = false, raf = 0, last = 0;
      function running() { return inView && !document.hidden && !manualP; }
      function frame(now) {
        raf = requestAnimationFrame(frame);          // el reloj nunca se apaga: así nunca se queda pegado
        var dt = Math.min(now - last, 100); last = now;
        if (!running()) return;
        if (!navigating) {
          if (!reduce) {                       // con movimiento reducido el cambio de forma lo lleva su propio temporizador
            clock += dt;
            if (clock >= CYCLE) { clock -= CYCLE; idx = (idx + 1) % N; }
          }
          render();
        }
      }
      function sync() {
        deck.classList.toggle('is-paused', !running());
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }

      /* ----- navegación manual: un fundido corto y la siguiente foto arranca desde su inicio ----- */
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

      // tocar o deslizar la escena = saltar a la siguiente / anterior
      var sx = 0, down = false;
      deck.addEventListener('pointerdown', function (e) { down = true; sx = e.clientX; });
      deck.addEventListener('pointerup', function (e) {
        if (!down) return;
        down = false;
        var dx = e.clientX - sx;
        if (Math.abs(dx) > 50) { if (dx < 0) { next(); } else { prev(); } }
        else if (Math.abs(dx) < 8) { next(); }
      });
      deck.addEventListener('pointercancel', function () { down = false; });

      // con el mouse encima la animación sigue corriendo: antes se congelaba y parecía bloqueada
      document.addEventListener('visibilitychange', sync);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          var e = en[0];
          inView = e.isIntersecting && e.intersectionRatio > .05;   // basta con que se vea una parte
          sync();
        }, { threshold: [0, .05, .25, .5, .75, 1] }).observe(deck);
      }

      // el lienzo de diseño (420x500) se escala al ancho real del mazo
      function fitScene() { mo.style.setProperty('--ms', (deck.clientWidth / 420).toFixed(4)); }
      fitScene();
      if ('ResizeObserver' in window) { new ResizeObserver(fitScene).observe(deck); } else { window.addEventListener('resize', fitScene); }

      // la frase queda oculta hasta la primera carga completa; si se ve y la escena no corre, no la dejamos escondida
      if (reduce) {
        titleReveal();
        // con movimiento reducido la escena es fija, pero cambia de forma cada 5 s (así no parece bloqueada)
        render();
        setInterval(function () { if (running()) go(idx + 1); }, 5000);
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

    /* el panel arranca justo debajo de la barra (y la barra siempre queda pulsable) */
    function syncHeight() {
      var h = Math.round(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--hdr-h', h + 'px');
    }
    syncHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(header);
    else window.addEventListener('resize', syncHeight);

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
