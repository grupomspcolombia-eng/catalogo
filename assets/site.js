
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


    /* ---------- Caja de regalo: la animación 3D (celular + Power Bank) vive en assets/regalo3d.js.
       Se descarga solo cuando la sección está por entrar en pantalla; mientras tanto (o si el dispositivo no soporta WebGL) se ve el póster. ---------- */
    var deck = document.getElementById('deck');
    if (deck) {
      var loaded = false;
      var webgl = (function () { try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } })();
      var ttl0 = document.getElementById('regalo-title');
      function loadDeck() {
        if (loaded) return; loaded = true;
        if (!webgl) { deck.classList.add('no-3d'); return; }
        var sc = document.createElement('script'); sc.src = 'assets/regalo3d.js?v=7'; sc.async = true;
        sc.onerror = function () { deck.classList.add('no-3d'); };
        document.head.appendChild(sc);
      }
      if ('IntersectionObserver' in window) {
        var lio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { loadDeck(); lio.disconnect(); } }, { rootMargin: '900px 0px' });
        lio.observe(deck);
      } else { loadDeck(); }
      /* sin 3D, el título aparece completo y sin esperar a la animación */
      if (!webgl && ttl0) { ttl0.classList.add('is-written'); }
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
          if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
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

  /* enlaces internos (#esenciales, #pedidos…): desplazan a la sección sin dejar el "#nombre" en la barra de direcciones */
  (function () {
    function clean() {
      if (location.hash && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = (a.getAttribute('href') || '').slice(1);
      var t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'auto', block: 'start' });   // el scroll suave lo da el CSS (y respeta "reducir movimiento")
      clean();
    });
    if (location.hash) setTimeout(clean, 400);                   // llegada desde otra página (/#esenciales)
  })();
