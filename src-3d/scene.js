/* Escena "Caja de regalo": un teléfono con la batería baja -> la foto sale de la pantalla y se vuelve Power Bank -> cinco formas de cargar.
   Todo cuelga de UN solo reloj (clock). El estado visual es una función pura de (modo, tiempo): pausar, saltar o salir de pantalla nunca descuadra nada. */
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Euler, Texture, SRGBColorSpace, DataTexture, RingGeometry, MeshBasicMaterial, AdditiveBlending, RGBAFormat } from 'three';
import { createStage } from './stage.js';
import { buildPhone, PH } from './phone.js';
import { buildPowerBank, PB } from './powerbank.js';
import { Cable } from './cables.js';
import { lerp, clamp, seg, inOut, inOut2, outBack, snap, outCubic, inCubic, mix, rad } from './util.js';

var HERO = { x: 210, y: 262, s: 1.7, rz: 0, ry: 0, rx: 0 }, TILT = -17;
var T0 = { arr: 500, d0: 600, msg: 1500, low: 2300, out: 2900, pop: 3450, pose1: 3700, hold: 3900, m1: 4500 };
function ext(o) { var r = {}, k; for (k in T0) r[k] = T0[k]; for (k in o) r[k] = o[k]; return r; }

/* ---- poses de diseño (lienzo 420x540, y hacia abajo; s = escala; rz inclinación en el plano; ry giro; rx cabeceo, + = la parte de arriba hacia el espectador) ---- */
var MAG = {
  PREP: { x: 296, y: 248, s: 1.2, rz: 3, ry: -16, rx: 0 },
  SIDE: { x: 276, y: 248, s: 1.2, rz: 3, ry: 58, rx: 0 },
  FINAL: { x: 292, y: 248, s: 1.2, rz: 5, ry: 16, rx: 0 },
  away: { x: 112, y: 356, s: 1.2, rz: -7, ry: 0, rx: 0 }
};
var WP = { x: 210, y: 158, s: 1.05, rz: -2, ry: -12, rx: 0 };
var MODES = [
  { key: 'mag', t: 'MagSafe', d: 'Se pega por detrás y carga sin cables', kinds: ['iphone'], variant: 'ivory',
    T: ext({ con: 5800, c1: 7200, f1: 7800, x1: 8400 }), cables: [] },
  { key: 'usbc', t: 'Cable USB-C integrado', d: 'Sale por arriba y también sirve de agarradera', kinds: ['android'], variant: 'black',
    T: ext({ g0: 4900, g1: 5600, con: 5800, c1: 7200, f1: 7800, x1: 8400 }),
    phones: [WP], bank: { x: 210, y: 400, s: 1.05, ry: -14, rx: 20 }, exit: [0, 60], cables: [{ type: 'usbc', ph: 0 }] },
  { key: 'lt', t: 'Cable Lightning integrado', d: 'Sale por abajo, listo para tu iPhone', kinds: ['iphone'], variant: 'ivory',
    T: ext({ g0: 4900, g1: 5600, con: 5800, c1: 7200, f1: 7800, x1: 8400 }),
    phones: [WP], bank: { x: 210, y: 400, s: 1.05, ry: -14, rx: -20 }, exit: [0, 60], cables: [{ type: 'lt', ph: 0 }] },
  { key: 'cc', t: 'USB-C a USB-C', d: 'Con tu propio cable, desde el puerto de carga rápida', kinds: ['android'], variant: 'black',
    T: ext({ a0: 4800, a1: 5200, g0: 5200, g1: 5900, con: 6100, c1: 7500, f1: 8100, x1: 8700 }),
    phones: [WP], bank: { x: 210, y: 400, s: 1.05, ry: -14, rx: -20 }, exit: [0, 60], cables: [{ type: 'cc', ph: 0 }] },
  { key: 'dual', t: 'Dos dispositivos a la vez', d: 'Comparte la carga con amigos o familia', kinds: ['android', 'iphone'], variant: 'ivory',
    T: ext({ g0: 5100, g1: 5800, con: 6000, c1: 7400, f1: 8000, x1: 8600 }),
    phones: [{ x: 108, y: 168, s: 1.0, rz: -3, ry: -14, rx: 0 }, { x: 312, y: 168, s: 1.0, rz: 3, ry: -14, rx: 0 }],
    bank: { x: 210, y: 420, s: 1.0, ry: 0, rx: 12 }, exit: [0, 60],
    cables: [{ type: 'usbc', ph: 0 }, { type: 'lt', ph: 1 }] }
];
var PHOTOS = ['pb-caja.jpg', 'caja-1.jpg', 'caja-2.jpg', 'caja-3.jpg', 'caja-4.jpg'];
var MOMENTS = [['Propuesta', 'Hoy · 8:30 pm'], ['Entrevista', 'Mañana · 9 am'], ['Vuelo', 'Hoy · 6:45 am'], ['Brindis', 'Hoy · 11:59 pm'], ['Aniversario', 'Hoy · 9:00 pm']];

/* ---- foto que sale del teléfono y se convierte en Power Bank (rectángulo redondeado con borde blanco, dibujado en shader) ---- */
var CARD_V = 'uniform vec2 uSize; varying vec2 vP; void main(){ vP = position.xy * uSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 0., 1.); }';
var SDF = 'float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }';
var CARD_F = SDF + 'uniform sampler2D uTex; uniform vec2 uSize; uniform float uRadius, uBorder, uAlpha, uAsp; varying vec2 vP;' +
  'void main(){ float d = sdRR(vP, uSize * .5, uRadius); float a = 1. - smoothstep(-.7, .7, d); if (a <= 0.) discard;' +
  ' vec2 inner = max(uSize - 2. * uBorder, vec2(1.)); float rb = inner.x / inner.y; vec2 s = rb > uAsp ? vec2(1., uAsp / rb) : vec2(rb / uAsp, 1.);' +
  ' vec3 col = texture2D(uTex, (vP / inner) * s + .5).rgb; float ph = 1. - smoothstep(-uBorder - .6, -uBorder + .6, d);' +
  ' col = mix(vec3(1.), col, ph); gl_FragColor = vec4(col, a * uAlpha);' +
  '\n#include <colorspace_fragment>\n}';
var SH_F = SDF + 'uniform vec2 uSize, uInner; uniform float uRadius, uAlpha, uBlur; varying vec2 vP;' +
  'void main(){ float d = sdRR(vP - vec2(0., -uBlur * .5), uInner * .5, uRadius); gl_FragColor = vec4(0., 0., 0., (1. - smoothstep(-uBlur, uBlur, d)) * .55 * uAlpha); }';

export function initDeck(deck, cfg) {
  var canvas = deck.querySelector('.mo-canvas'), mo = deck.querySelector('.momento');
  var label = mo.querySelector('.mo-label'), lblT = label.querySelector('b'), lblD = label.querySelector('span');
  var ttl = document.getElementById('regalo-title');
  var words = ttl ? ttl.querySelectorAll('.w').length : 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var st = createStage(canvas), scene = st.scene, cam = st.camera, CAMD = st.D;
  var N = PHOTOS.length;

  /* imágenes */
  var logo = new Image(), imgs = PHOTOS.map(function (f) { var im = new Image(); im.decoding = 'async'; im.src = cfg.base + f; return im; });
  var texs = imgs.map(function (im) { var t = new Texture(im); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; im.onload = function () { t.needsUpdate = true; if (cfg.onFrame) cfg.onFrame(); }; if (im.complete && im.naturalWidth) t.needsUpdate = true; return t; });
  var blank = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat); blank.needsUpdate = true;

  /* teléfonos y power banks */
  var phones = { iphone: buildPhone('iphone'), android: buildPhone('android') };
  Object.keys(phones).forEach(function (k) { scene.add(phones[k].root); phones[k].root.visible = false; });
  var pbs = {};
  ['ivory', 'black'].forEach(function (v) {
    var pb = buildPowerBank(v, logo); scene.add(pb.root); pb.root.visible = false;
    var col = pb.cableColor;
    pbs[v] = { pb: pb, usbc: new Cable(pb.root, { kind: 'usbc', color: col, radius: 2.1 }), lt: new Cable(pb.root, { kind: 'lt', color: col, radius: 1.9 }),
      cc: new Cable(pb.root, { kind: 'usbc', color: 0xf4f4f6, radius: 1.9, startPlug: 'usbc' }) };
    pbs[v].cc.group.visible = false;
  });
  logo.onload = function () { pbs.ivory.pb.refreshFace(); pbs.black.pb.refreshFace(); if (cfg.onFrame) cfg.onFrame(); };
  logo.src = cfg.base + 'mp-monograma-footer.png';

  /* foto-tarjeta + sombra */
  var cardMat = new ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, vertexShader: CARD_V, fragmentShader: CARD_F,
    uniforms: { uTex: { value: blank }, uSize: { value: new Vector2(100, 100) }, uRadius: { value: 0 }, uBorder: { value: 0 }, uAlpha: { value: 0 }, uAsp: { value: .75 } } });
  var shMat = new ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, vertexShader: CARD_V, fragmentShader: SH_F,
    uniforms: { uSize: { value: new Vector2(100, 100) }, uInner: { value: new Vector2(100, 100) }, uRadius: { value: 0 }, uAlpha: { value: 0 }, uBlur: { value: 26 } } });
  var shadow = new Mesh(new PlaneGeometry(1, 1), shMat), card = new Mesh(new PlaneGeometry(1, 1), cardMat);
  shadow.renderOrder = 20; card.renderOrder = 21; shadow.frustumCulled = card.frustumCulled = false; shadow.visible = card.visible = false;
  scene.add(shadow); scene.add(card);

  /* anillo de "clic" al conectar (dorado, mira a la cámara) */
  var clicks = [0, 1].map(function () {
    var m = new Mesh(new RingGeometry(9, 11.5, 48), new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false }));
    m.renderOrder = 22; m.frustumCulled = false; scene.add(m); return m;
  });

  /* ---- ayudas de pose ---- */
  var eul = new Euler();
  function place(obj, P, extra) {
    obj.position.set(P.x - 210, 270 - P.y, P.z || 0);
    obj.rotation.set(rad(P.rx || 0), rad(P.ry || 0), -rad(P.rz || 0), 'ZYX');
    var s = Math.max(.0001, P.s); obj.scale.setScalar(s);
  }
  function bankRect(P, rot) { return { l: P.x - PB.W / 2 * P.s, t: P.y - PB.H / 2 * P.s, w: PB.W * P.s, h: PB.H * P.s, r: 27 * P.s, b: 0, rot: rot || 0 }; }
  /* rectángulo de la pantalla en el lienzo, con la pose HERO (para que la foto salga exactamente de ahí) */
  function screenRect(kind) {
    var R = (kind === 'iphone' ? 21 : 15) - 2.6, f = CAMD / (CAMD - (PH.D / 2 + .07) * HERO.s);
    var w = PH.SW * HERO.s * f, h = PH.SH * HERO.s * f;
    return { l: 210 - w / 2, t: 262 - h / 2, w: w, h: h, r: R * HERO.s * f, b: 0, rot: 0 };
  }
  var G1 = { l: 65, t: 68, w: 290, h: 387, r: 6, b: 5, rot: -3 };

  /* ---- estado ---- */
  var idx = 0, clock = 0, shownIdx = -1, lastState = '', titleDone = false;
  var cur = { main: null, second: null, pbs: null };
  var vA = new Vector3(), vB = new Vector3(), vC = new Vector3(), vD = new Vector3(), vE = new Vector3();

  function showMode(i) {
    var m = MODES[i];
    Object.keys(phones).forEach(function (k) { phones[k].root.visible = false; phones[k].invalidate(); });
    cur.main = phones[m.kinds[0]]; cur.second = m.kinds[1] ? phones[m.kinds[1]] : null;
    cur.main.root.visible = true;
    Object.keys(pbs).forEach(function (k) { pbs[k].pb.root.visible = false; });
    cur.pbs = pbs[m.variant];
    lblT.textContent = m.t; lblD.textContent = m.d;
    mo.setAttribute('data-mode', m.key);
    shownIdx = i;
  }

  function lvOf(p) { return p < 20 ? '#FF0040' : '#FFFFFF'; }
  function shakeAt(lt) { var q = (lt % 1100) / 1100; return q < .86 ? 0 : (q < .9 ? -1.7 * (q - .86) / .04 : (q < .94 ? -1.7 + 3.4 * (q - .9) / .04 : (q < .98 ? 1.7 - 2.6 * (q - .94) / .04 : -.9 * (1 - (q - .98) / .02)))); }
  function setPct(ph, o, pct) { ph.pctVal = pct; }

  function titleReveal() {
    if (titleDone || !ttl) return;
    titleDone = true; ttl.classList.remove('is-armed'); ttl.classList.add('is-written');
    setTimeout(function () { ttl.classList.add('is-foil'); }, words * 160 + 650);
  }

  /* ---- fotograma ---- */
  function bezPts(P0, P1, P2, P3, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push(new Vector3(a * P0.x + b * P1.x + c * P2.x + d * P3.x, a * P0.y + b * P1.y + c * P2.y + d * P3.y, a * P0.z + b * P1.z + c * P2.z + d * P3.z));
    }
    return out;
  }
  function blendPts(A, B, k) { return A.map(function (p, i) { return p.clone().lerp(B[i], k); }); }

  function render() {
    var lt = clock;
    if (shownIdx !== idx) showMode(idx);
    var m = MODES[idx], t = m.T, mag = m.key === 'mag', dual = m.key === 'dual', main = cur.main, sec = cur.second, P = cur.pbs, pb = P.pb;

    /* estado de la carga */
    var stt, cap, pct;
    if (lt < t.out) { stt = 'idle'; cap = ''; } else if (lt < t.m1) { stt = 'low'; cap = 'Batería baja'; }
    else if (lt < t.con) { stt = 'dock'; cap = 'Conectando…'; } else if (lt < t.c1) { stt = 'charging'; cap = 'Cargando'; } else { stt = 'full'; cap = 'Carga completa'; }
    if (stt !== lastState) { mo.setAttribute('data-state', stt); lastState = stt; }
    if (lt < t.d0) pct = 100; else if (lt < t.low) pct = 100 - 97 * inCubic(seg(lt, t.d0, t.low)); else if (lt < t.con) pct = 3;
    else if (lt < t.c1) pct = 3 + 97 * inOut2(seg(lt, t.con, t.c1)); else pct = 100;
    var pct2 = lt < t.con ? 9 : (lt < t.c1 ? 9 + 91 * inOut2(seg(lt, t.con, t.c1)) : 100);
    if (lt >= t.c1 && lt < t.f1) titleReveal();
    var charging = lt >= t.con && lt < t.c1 + 200, bolt = stt === 'charging' || stt === 'full';

    var so = lt < T0.arr ? outCubic(seg(lt, 0, T0.arr)) : (lt < t.out ? 1 : 0);
    var fade = 1 - seg(lt, t.out - 200, t.out);
    var mm = MOMENTS[idx % MOMENTS.length];
    main.setScreen({ kind: main.kind, photo: imgs[idx], photoA: so, photoScale: 1 + .12 * (1 - outCubic(seg(lt, 0, T0.arr))), pct: pct, lv: lvOf(pct), cap: cap,
      alertP: seg(lt, t.msg, t.msg + 300) * fade, lowP: seg(lt, t.low, t.low + 300) * fade, ev: mm[0], when: mm[1], bolt: bolt,
      shake: (stt === 'idle' || stt === 'low') ? shakeAt(lt) : 0, pctLow: stt === 'low' });

    /* ---- teléfono principal ---- */
    var Pm;
    if (mag) {
      if (lt < t.out) Pm = HERO; else if (lt < t.pose1) Pm = mix(HERO, MAG.PREP, inOut(seg(lt, t.out, t.pose1)));
      else if (lt < 4500) Pm = MAG.PREP; else if (lt < 5000) Pm = mix(MAG.PREP, MAG.SIDE, inOut(seg(lt, 4500, 5000)));
      else if (lt < 5150) Pm = MAG.SIDE; else if (lt < 5800) Pm = mix(MAG.SIDE, MAG.FINAL, inOut(seg(lt, 5150, 5800)));
      else if (lt < t.f1) Pm = MAG.FINAL; else Pm = mix(MAG.FINAL, HERO, inOut(seg(lt, t.f1, t.x1)));
    } else {
      var q = lt < t.out ? 0 : (lt < t.pose1 ? inOut(seg(lt, t.out, t.pose1)) : (lt < t.f1 ? 1 : 1 - inOut(seg(lt, t.f1, t.x1))));
      Pm = mix(HERO, m.phones[0], q);
    }
    var idl = seg(lt, 0, 600) * (1 - seg(lt, 2200, 2900));
    var pose = { x: Pm.x, y: Pm.y, s: Pm.s, rz: Pm.rz, ry: Pm.ry + idl * (TILT + 4 * Math.sin(lt / 700)), rx: (Pm.rx || 0) + idl * 6 };
    var floatY = 0;
    if (!mag && lt >= t.con - 120 && lt < t.con + 180) { var nud = 5 * Math.sin(Math.PI * seg(lt, t.con - 120, t.con + 180)); pose.y -= nud; }
    place(main.root, pose);

    /* ---- segundo teléfono ("dos dispositivos") ---- */
    if (dual && sec) {
      var tg = m.phones[1], off = { x: 520, y: 168, s: 1.0, rz: 10, ry: -14, rx: 0 };
      var q2 = lt < 4300 ? 0 : (lt < 5000 ? inOut(seg(lt, 4300, 5000)) : (lt < t.f1 ? 1 : 1 - inOut(seg(lt, t.f1, t.x1))));
      var P2 = mix(off, tg, q2);
      if (lt >= t.con - 120 && lt < t.con + 180) P2.y -= 5 * Math.sin(Math.PI * seg(lt, t.con - 120, t.con + 180));
      sec.root.visible = q2 > 0; place(sec.root, P2);
      sec.setScreen({ kind: sec.kind, photo: null, photoA: 0, photoScale: 1, pct: pct2, lv: lvOf(pct2), cap: cap, alertP: 0, lowP: 0, ev: '', when: '', bolt: bolt, shake: 0, pctLow: false });
    } else if (sec) { sec.root.visible = false; }

    /* ---- la foto sale de la pantalla y se vuelve Power Bank ---- */
    var B = mag ? MAG.away : m.bank;
    var bankFace = { x: B.x, y: B.y, s: B.s };
    var br = bankRect(bankFace, mag ? B.rz : 0), GS = screenRect(main.kind), g, fo;
    if (lt < t.out) { g = GS; fo = 0; }
    else if (lt < t.pop) { g = mix(GS, G1, outBack(seg(lt, t.out, t.pop))); fo = 1; }
    else if (lt < t.hold) { g = mix(G1, G1, 0); g.rot = G1.rot + 1.2 * Math.sin(seg(lt, t.pop, t.hold) * Math.PI); fo = 1; }
    else { g = mix(G1, br, inOut(seg(lt, t.hold, t.m1))); fo = 1 - seg(lt, 4400, 4650); }
    var showCard = fo > .002;
    card.visible = shadow.visible = showCard;
    if (showCard) {
      cardMat.uniforms.uTex.value = (imgs[idx].complete && imgs[idx].naturalWidth) ? texs[idx] : blank;
      cardMat.uniforms.uAsp.value = imgs[idx].naturalWidth ? imgs[idx].naturalWidth / imgs[idx].naturalHeight : .75;
      cardMat.uniforms.uSize.value.set(g.w, g.h); cardMat.uniforms.uRadius.value = Math.max(0, g.r); cardMat.uniforms.uBorder.value = Math.max(0, g.b); cardMat.uniforms.uAlpha.value = fo;
      card.position.set(g.l + g.w / 2 - 210, 270 - (g.t + g.h / 2), 0); card.rotation.z = -rad(g.rot);
      var pad = 60; shMat.uniforms.uSize.value.set(g.w + pad * 2, g.h + pad * 2); shMat.uniforms.uInner.value.set(g.w, g.h); shMat.uniforms.uRadius.value = Math.max(0, g.r); shMat.uniforms.uAlpha.value = fo;
      shadow.position.copy(card.position); shadow.rotation.z = card.rotation.z;
      /* el tamaño real lo da uSize en el shader: la malla se queda de 1x1 */
    }

    /* ---- la Power Bank ---- */
    var appear = lt >= 4300, vis = appear, pbPose;
    var pop = outBack(seg(lt, 4300, 4650));
    if (mag) {
      var k = lt < 4600 ? 0 : (lt < 5150 ? snap(seg(lt, 4600, 5150)) : 1);
      var Ph = pose, e = new Euler(rad(Ph.rx || 0), rad(Ph.ry), -rad(Ph.rz), 'ZYX');
      var dz = (PH.D / 2 + PB.D / 2 + 2.5) * Ph.s;
      var offv = new Vector3(-28 * Ph.s, -4 * Ph.s, -dz).applyEuler(e);
      var aw = new Vector3(MAG.away.x - 210, 270 - MAG.away.y, 0), dk = new Vector3(Ph.x - 210 + offv.x, 270 - Ph.y + offv.y, offv.z);
      var kz = outCubic(clamp(k * 2.2)), ex = 0, sc = lerp(MAG.away.s, Ph.s, k);
      if (lt >= t.f1) { var rk = seg(lt, t.f1, t.f1 + 520); ex = inOut(rk); sc *= 1 - inCubic(rk); if (rk >= 1) vis = false; }
      var px = lerp(aw.x, dk.x, k) - ex * 120, py = lerp(aw.y, dk.y, k) - ex * 30, pz = lerp(0, dk.z, kz);
      pb.root.position.set(px, py, pz);
      pb.root.rotation.set(rad((Ph.rx || 0) * k), rad(Ph.ry * k), -rad(lerp(MAG.away.rz, Ph.rz, k)), 'ZYX');
      pb.root.scale.setScalar(Math.max(.0001, sc * pop));
      pb.setFlash(lt >= 5050 ? 1 - seg(lt, 5050, 5450) : 0);
    } else {
      var tk = inOut(seg(lt, 4550, 5300)), ex2 = 0, shrink = 1;
      if (lt >= t.f1) { var r2 = seg(lt, t.f1, t.f1 + 520); ex2 = inOut(r2); shrink = 1 - inCubic(r2); if (r2 >= 1) vis = false; }
      var wob = appear ? Math.sin(lt / 900) * 2.2 * tk : 0, bob = appear ? Math.sin(lt / 760) * 2.5 * tk : 0;
      place(pb.root, { x: m.bank.x + m.exit[0] * ex2, y: m.bank.y + m.exit[1] * ex2 + bob, s: m.bank.s * shrink * pop, rz: 0, ry: m.bank.ry * tk + wob, rx: m.bank.rx * tk });
      pb.setFlash(0);
    }
    pb.root.visible = vis;
    var level = lt < t.con ? .8 : (lt < t.c1 ? .8 : .75), blink = charging ? (Math.sin(lt / 160) > 0 ? 1 : 0) : 0;
    pb.setLed(level, blink);

    /* ---- cables ---- */
    scene.updateMatrixWorld(true);
    var used = {}; m.cables.forEach(function (c) { used[c.type] = c; });
    var A = pb.anchors, refRest = new Vector3(0, 0, 1);
    ['usbc', 'lt', 'cc'].forEach(function (type) {
      var cab = P[type], d = used[type];
      if (type === 'cc') cab.group.visible = !!d && vis;
      if (!vis || (type === 'cc' && !d)) { return; }
      var e = 0, cp = 1, ins = 0, glow = 0, ph = null, portL = null, nrm = null, px2 = null;
      var phoneObj = d ? (d.ph === 0 ? main : sec) : null;
      if (d) {
        if (lt >= t.g0 && lt < t.f1) { e = inOut2(seg(lt, t.g0, t.g1)); ins = 7 * seg(lt, t.g1, t.con); }
        else if (lt >= t.f1) { e = 1 - inOut2(seg(lt, t.f1 + 100, t.f1 + 520)); ins = 7 * (1 - seg(lt, t.f1, t.f1 + 100)); }
        glow = (lt >= t.con && lt < t.c1 + 200) ? .95 : 0;
        phoneObj.port.getWorldPosition(vA); portL = pb.root.worldToLocal(vA.clone());
        vB.set(0, -1, 0).transformDirection(phoneObj.root.matrixWorld); vC.copy(vA).add(vB);
        nrm = pb.root.worldToLocal(vC.clone()).sub(portL).normalize();
        vD.set(1, 0, 0).transformDirection(phoneObj.root.matrixWorld); vE.copy(vA).add(vD);
        px2 = pb.root.worldToLocal(vE.clone()).sub(portL).normalize();
      }
      var pts, refX = refRest;
      if (type === 'usbc') {
        var rest = A.loop.map(function (p) { return p.clone(); });
        if (d) {
          var F = A.loopF, ext1 = bezPts(F, F.clone().add(new Vector3(26, 52, -10)), portL.clone().addScaledVector(nrm, 62), portL, 8);
          pts = blendPts(rest, ext1, e); refX = refRest.clone().lerp(px2, e).normalize();
        } else pts = rest;
      } else if (type === 'lt') {
        var restL = A.ltRest.map(function (p) { return p.clone(); });
        if (d) {
          var F2 = A.ltF, L = Math.max(14, Math.min(60, portL.y - 78)), pre = portL.clone().addScaledVector(nrm, L * .45), preF = portL.clone().addScaledVector(nrm, L), e4 = new Vector3(Math.max(114, preF.x + 22), preF.y - 4, -14);
          var ext2 = [F2, new Vector3(70, -62, -6), new Vector3(114, -40, -14), new Vector3(126, 22, -16), e4, preF, pre, portL];
          pts = blendPts(restL, ext2, e); refX = refRest.clone().lerp(px2, e).normalize();
        } else pts = restL;
      } else {
        var a = 28 * (1 - outCubic(seg(lt, t.a0, t.a1))), Pc = A.cPort;
        var p0 = new Vector3(Pc.x, Pc.y - 18 - a, 0);
        var L = Math.max(14, Math.min(60, portL.y - 78)), preC = portL.clone().addScaledVector(nrm, L * .45), preCF = portL.clone().addScaledVector(nrm, L), c4 = new Vector3(Math.min(-122, preCF.x - 22), preCF.y - 4, -14);
        pts = [p0, new Vector3(Pc.x - 2, Pc.y - 30, 2), new Vector3(-62, -86, -6), new Vector3(-110, -56, -14), new Vector3(-126, 14, -16), c4, preCF, preC, portL];
        cp = (lt >= t.g0 && lt < t.f1) ? inOut2(seg(lt, t.g0, t.g1)) : (lt >= t.f1 ? 1 - inOut2(seg(lt, t.f1 + 100, t.f1 + 520)) : 0);
        cab.group.visible = lt >= t.a0 && (lt < t.f1 + 520);
        cab.plug.visible = cp > .01;
        cab.startRef = new Vector3(0, 0, 1);
        cab.set(pts, Math.max(.01, cp), ins, glow, lt, px2);
        return;
      }
      cab.set(pts, 1, ins, glow, lt, refX);
    });
    /* anillo de clic en el puerto */
    clicks.forEach(function (c, n) {
      var d = m.cables[n], ph = d ? (d.ph === 0 ? main : sec) : null;
      if (!d || !ph) { c.material.opacity = 0; return; }
      var ck = seg(lt, t.con, t.con + 520);
      if (lt >= t.con && ck < 1) { ph.port.getWorldPosition(vA); c.position.set(vA.x, vA.y - 4, vA.z + 10); c.scale.setScalar(.4 + 2.2 * ck); c.material.opacity = 1 - ck; } else { c.material.opacity = 0; }
    });

    label.style.opacity = (seg(lt, 4400, 4750) * (1 - seg(lt, t.x1 - 750, t.x1 - 450))).toFixed(3);
    st.renderer.render(scene, cam);
  }

  /* ---- reloj maestro ---- */
  var inView = !('IntersectionObserver' in window), holdP = false, manualP = false, navigating = false, raf = 0, last = 0;
  function running() { return !reduce && inView && !document.hidden && !holdP && !manualP; }
  function frame(now) {
    raf = 0; if (!running()) return;
    var dt = Math.min(now - last, 100); last = now;
    if (!navigating) { clock += dt; var cyc = MODES[idx].T.x1; if (clock >= cyc) { clock -= cyc; idx = (idx + 1) % N; } render(); }
    raf = requestAnimationFrame(frame);
  }
  function sync() { deck.classList.toggle('is-paused', !running()); if (!raf && running()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function go(to) {
    if (navigating) return; navigating = true; deck.classList.add('is-switching');
    setTimeout(function () { idx = (to + N) % N; clock = reduce ? 1000 : 0; render(); deck.classList.remove('is-switching'); navigating = false; if (reduce) titleReveal(); }, 170);
  }
  function next() { go(idx + 1); } function prev() { go(idx - 1); }

  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); manualP = !manualP; sync(); }
  });
  var sx = 0, down = false, held = false, holdT = 0;
  function release() { clearTimeout(holdT); if (held) { held = false; holdP = false; sync(); } }
  deck.addEventListener('pointerdown', function (e) { down = true; held = false; sx = e.clientX; clearTimeout(holdT); holdT = setTimeout(function () { held = true; holdP = true; sync(); }, 300); });
  deck.addEventListener('pointerup', function (e) {
    if (!down) return; down = false; var was = held; release(); if (was) return;
    var dx = e.clientX - sx; if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); } else if (Math.abs(dx) < 8) next();
  });
  deck.addEventListener('pointercancel', function () { down = false; release(); });
  deck.addEventListener('pointerleave', function () { if (down) { down = false; release(); } });
  window.addEventListener('blur', function () { down = false; release(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { var e = en[0]; inView = e.isIntersecting && (e.intersectionRatio >= .5 || e.intersectionRect.height >= window.innerHeight * .6); sync(); }, { threshold: [0, .25, .5, .75, 1] }).observe(deck);
  }

  function fit() {
    var w = deck.clientWidth; if (!w) return;
    mo.style.setProperty('--ms', (w / 420).toFixed(4)); st.size(w); render();
  }
  fit();
  if ('ResizeObserver' in window) { new ResizeObserver(fit).observe(deck); } else { window.addEventListener('resize', fit); }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); if (cfg.onFail) cfg.onFail(); });

  if (reduce) { titleReveal(); clock = 1000; render(); setInterval(function () { if (inView && !document.hidden) go(idx + 1); }, 5000); }
  else if (ttl) {
    ttl.classList.add('is-armed');
    if ('IntersectionObserver' in window) {
      var tT = null, tio = new IntersectionObserver(function (en) {
        clearTimeout(tT);
        if (en[0].isIntersecting && !titleDone) { tT = setTimeout(function () { if (!running()) { titleReveal(); tio.disconnect(); } }, 1500); }
      }, { threshold: .6 });
      tio.observe(ttl);
    }
  }
  cfg.onFrame = function () { if (!raf) render(); };
  render(); sync();
  if (cfg.onReady) cfg.onReady();
  if (/deckdebug/.test(location.search)) { window.__deck = { set: function (i, ms) { idx = i; clock = ms; navigating = false; manualP = true; sync(); shownIdx = -1; render(); }, modes: MODES }; }
}
