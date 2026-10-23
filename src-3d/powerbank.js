/* Power Bank Maison Pastrana, modelada pieza por pieza a partir de las fotos reales:
   - Cuerpo con esquinas muy redondeadas y aristas suaves (150 x 100 x 34).
   - Frente: carga inalámbrica MagSafe (anillo estriado + disco oscuro), LED de batería con barras y monograma MSP grabado.
   - Borde superior: botón redondo, botón de carga rápida, ranura con el USB-C integrado (el cable forma una agarradera).
   - Borde inferior: Lightning integrado en su canal y, a su lado, el puerto USB-C de carga rápida. */
import { Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CylinderGeometry, TorusGeometry, CircleGeometry, PlaneGeometry,
  Vector3, AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';
import { slab, canvasTex, rrPath, FONT } from './util.js';

export var PB = { W: 150, H: 100, D: 34, R: 24, BEV: 7, MX: 28, MY: -2, MR: 41.2 };

var VARIANTS = {
  ivory: { body: 0xe9e3d4, rough: .6, ring: '#e4ddcc', tick: 'rgba(118,110,96,.55)', logo: 'rgba(104,100,92,.92)', cable: 0xe7e0ce, btn: 0xdcd5c3,
    led: '#a6f3ff', ledGlow: '#7fe3f0', groove: 'rgba(60,52,40,.28)', recess: '#c9c2b1' },
  black: { body: 0x19191c, rough: .5, ring: '#1b1b1e', tick: 'rgba(88,88,98,.62)', logo: 'rgba(92,92,104,.9)', cable: 0x141416, btn: 0x121214,
    led: '#46bfff', ledGlow: '#2e9bff', groove: 'rgba(0,0,0,.55)', recess: '#0b0b0d' }
};

function arcText(x, text, cx, cy, r, c, bottom, font, color, gap) {
  x.save(); x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  var ch = text.split(''), w = ch.map(function (t) { return x.measureText(t).width + gap; }), tot = w.reduce(function (a, b) { return a + b; }, 0), a;
  if (!bottom) { a = c - tot / (2 * r); } else { a = c + tot / (2 * r); }
  for (var i = 0; i < ch.length; i++) {
    var h = w[i] / (2 * r);
    a += bottom ? -h : h;
    x.save(); x.translate(cx + r * Math.cos(a), cy + r * Math.sin(a)); x.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2); x.fillText(ch[i], 0, 0); x.restore();
    a += bottom ? -h : h;
  }
  x.restore();
}

export function buildPowerBank(variant, logoImg) {
  var V = VARIANTS[variant], W = PB.W, H = PB.H, D = PB.D;
  var root = new Group(), model = new Group(); root.add(model);

  var bodyMat = new MeshPhysicalMaterial({ color: V.body, roughness: V.rough, metalness: 0, clearcoat: .1, clearcoatRoughness: .5, emissive: 0xF2C85B, emissiveIntensity: 0 });
  var btnMat = new MeshStandardMaterial({ color: V.btn, roughness: .5, metalness: 0 });
  var body = new Mesh(slab(W, H, PB.R, D, PB.BEV, 9), [bodyMat, bodyMat]); model.add(body);
  var zF = D / 2;

  /* ---------- calcomanía del frente: monograma grabado, hueco del LED y ranura alrededor del anillo ---------- */
  var FW = 136, FH = 86, FS = 8;
  var logoTint = document.createElement('canvas');
  var faceTex = canvasTex(FW * FS, FH * FS, function () {});
  function drawFace() {
    var c = faceTex.image, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    function P(u, v) { return [(u + FW / 2) * FS, (FH / 2 - v) * FS]; }
    /* ranura oscura alrededor del anillo */
    var m = P(PB.MX, PB.MY); x.strokeStyle = V.groove; x.lineWidth = 1.5 * FS; x.beginPath(); x.arc(m[0], m[1], (PB.MR + 1.6) * FS, 0, 6.2832); x.stroke();
    /* hueco del LED */
    var l = P(-46, 12); x.fillStyle = variant === 'black' ? '#0a0a0c' : '#bdb6a5'; rrPath(x, l[0] - 10.6 * FS, l[1] - 4.7 * FS, 21.2 * FS, 9.4 * FS, 4.7 * FS); x.fill();
    x.fillStyle = '#0c0c0f'; rrPath(x, l[0] - 9.4 * FS, l[1] - 3.5 * FS, 18.8 * FS, 7 * FS, 3.5 * FS); x.fill();
    /* monograma */
    if (logoImg && logoImg.naturalWidth) {
      var lh = 30, lw = lh * logoImg.naturalWidth / logoImg.naturalHeight, p = P(-46, -19);
      logoTint.width = Math.round(lw * FS); logoTint.height = Math.round(lh * FS);
      var t = logoTint.getContext('2d'); t.clearRect(0, 0, logoTint.width, logoTint.height);
      t.drawImage(logoImg, 0, 0, logoTint.width, logoTint.height);
      t.globalCompositeOperation = 'source-in'; t.fillStyle = V.logo; t.fillRect(0, 0, logoTint.width, logoTint.height);
      t.globalCompositeOperation = 'source-over';
      x.drawImage(logoTint, p[0] - logoTint.width / 2, p[1] - logoTint.height / 2);
    }
    faceTex.needsUpdate = true;
  }
  drawFace();
  var face = new Mesh(new PlaneGeometry(FW, FH), new MeshStandardMaterial({ map: faceTex, transparent: true, roughness: .6, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  face.position.z = zF + .03; model.add(face);

  /* ---------- MagSafe: anillo estriado en relieve + disco oscuro con anillos concéntricos ---------- */
  var S = 1024, MR = PB.MR;
  function polar(x, r, a) { return [S / 2 + r * Math.cos(a), S / 2 + r * Math.sin(a)]; }
  var colMap = canvasTex(S, S, function (x) {
    x.fillStyle = V.ring; x.fillRect(0, 0, S, S);
    var R = S / 2;
    x.strokeStyle = V.tick; x.lineWidth = 5;
    for (var i = 0; i < 180; i++) { var a = i / 180 * 6.2832, p1 = polar(x, R * .855, a), p2 = polar(x, R * .985, a); x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke(); }
    x.fillStyle = '#08080a'; x.beginPath(); x.arc(R, R, R * .8, 0, 6.2832); x.fill();
    var gg = x.createRadialGradient(R * .8, R * .75, 10, R, R, R * .8); gg.addColorStop(0, '#1c1c21'); gg.addColorStop(1, '#09090b');
    x.fillStyle = gg; x.beginPath(); x.arc(R, R, R * .79, 0, 6.2832); x.fill();
    [.66, .54, .42, .3].forEach(function (k, j) {
      x.strokeStyle = '#26262c'; x.lineWidth = 8 - j; x.beginPath(); x.arc(R, R, R * k, 0, 6.2832); x.stroke();
      x.strokeStyle = '#0a0a0c'; x.lineWidth = 3; x.beginPath(); x.arc(R, R, R * k - 7, 0, 6.2832); x.stroke();
    });
    x.strokeStyle = '#34343c'; x.lineWidth = 3; x.beginPath(); x.arc(R, R, R * .8, 0, 6.2832); x.stroke();
    /* icono inalámbrico ((•)) */
    x.strokeStyle = '#8a8a93'; x.fillStyle = '#8a8a93'; x.lineWidth = 9; x.lineCap = 'round';
    x.beginPath(); x.arc(R, R, 14, 0, 6.2832); x.fill();
    [[40, .75], [68, .65]].forEach(function (q) {
      x.beginPath(); x.arc(R, R, q[0], -q[1], q[1]); x.stroke(); x.beginPath(); x.arc(R, R, q[0], Math.PI - q[1], Math.PI + q[1]); x.stroke();
    });
    arcText(x, 'Magnetic  Wireless  Charging', R, R, R * .715, -Math.PI / 2, false, '600 40px ' + FONT, '#7d7d86', 5);
    arcText(x, 'Output 5W/7.5W/10W/15W', R, R, R * .715, Math.PI / 2, true, '600 36px ' + FONT, '#6d6d76', 4);
  });
  var bumpMap = canvasTex(S, S, function (x) {
    var R = S / 2; x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#f2f2f2'; x.lineWidth = 6;
    for (var i = 0; i < 180; i++) { var a = i / 180 * 6.2832, p1 = polar(x, R * .855, a), p2 = polar(x, R * .985, a); x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke(); }
    x.fillStyle = '#6a6a6a'; x.beginPath(); x.arc(R, R, R * .8, 0, 6.2832); x.fill();
    [.66, .54, .42, .3].forEach(function (k) { x.strokeStyle = '#3c3c3c'; x.lineWidth = 8; x.beginPath(); x.arc(R, R, R * k, 0, 6.2832); x.stroke(); });
  }, { linear: true });
  var roughMap = canvasTex(S, S, function (x) {
    var R = S / 2; x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#8c8c8c'; x.beginPath(); x.arc(R, R, R * .8, 0, 6.2832); x.fill();
  }, { linear: true });
  var mag = new Group(); mag.position.set(PB.MX, PB.MY, zF); model.add(mag);
  var wall = new Mesh(new CylinderGeometry(MR + .3, MR + .5, 1.7, 96, 1, true).rotateX(Math.PI / 2), bodyMat); wall.position.z = .85; mag.add(wall);
  var topMat = new MeshPhysicalMaterial({ map: colMap, bumpMap: bumpMap, bumpScale: 2.2, roughnessMap: roughMap, roughness: 1, metalness: 0, clearcoat: 0, envMapIntensity: .22, emissive: 0xF2C85B, emissiveIntensity: 0 });
  var disc = new Mesh(new CircleGeometry(MR, 96), topMat); disc.position.z = 1.72; mag.add(disc);
  var rim = new Mesh(new TorusGeometry(MR - .1, .8, 10, 120), bodyMat); rim.position.z = 1.55; mag.add(rim);

  /* ---------- LED de batería: 5 barras ---------- */
  var ledC = document.createElement('canvas'); ledC.width = 340; ledC.height = 128;
  var ledTex = new CanvasTexture(ledC); ledTex.colorSpace = SRGBColorSpace;
  var ledMat = new MeshBasicMaterial({ map: ledTex, transparent: true, toneMapped: false, depthWrite: false });
  var led = new Mesh(new PlaneGeometry(18.8, 7), ledMat); led.position.set(-46, 12, zF + .3); model.add(led);
  var glowC = document.createElement('canvas'); glowC.width = glowC.height = 64;
  var gx = glowC.getContext('2d'), gr = gx.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, V.ledGlow + 'cc'); gr.addColorStop(1, V.ledGlow + '00'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
  var glowMat = new MeshBasicMaterial({ map: new CanvasTexture(glowC), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 });
  var glow = new Mesh(new PlaneGeometry(30, 16), glowMat); glow.position.set(-46, 12, zF + .22); model.add(glow);
  var ledKey = '';
  function setLed(level, blink) {
    var lit = Math.ceil(level * 5 - 1e-6), key = lit + '|' + (blink > .5 ? 1 : 0); if (lit > 5) lit = 5;
    if (key === ledKey) return; ledKey = key;
    var x = ledC.getContext('2d'); x.clearRect(0, 0, 340, 128);
    for (var i = 0; i < 5; i++) {
      var on = i < lit && !(i === lit - 1 && blink > .5 && level < 1);
      x.fillStyle = on ? V.led : 'rgba(120,130,140,.22)';
      if (on) { x.shadowColor = V.led; x.shadowBlur = 16; } else { x.shadowBlur = 0; }
      rrPath(x, 28 + i * 58, 30, 40, 68, 8); x.fill();
    }
    ledTex.needsUpdate = true; glowMat.opacity = lit > 0 ? (variant === 'black' ? .8 : .22) : 0;
  }
  setLed(.6, 0);

  /* ---------- borde superior: botón redondo, botón de carga rápida y ranura del USB-C ---------- */
  var topY = H / 2;
  var round = new Mesh(new CylinderGeometry(4.2, 4.4, 1.7, 40), btnMat); round.position.set(-48, topY + .6, 3.5); model.add(round);
  var rbtn = new Mesh(slab(28, 8.6, 3.6, 1.9, .55, 4).rotateX(-Math.PI / 2), btnMat); rbtn.position.set(-14, topY + .55, 3.5); model.add(rbtn);
  var iconTex = canvasTex(280, 86, function (x, w, h) {
    x.clearRect(0, 0, w, h); x.fillStyle = variant === 'black' ? '#8a8a94' : '#8d877a'; x.strokeStyle = x.fillStyle;
    x.beginPath(); x.moveTo(82, 14); x.lineTo(62, 46); x.lineTo(78, 46); x.lineTo(70, 74); x.lineTo(98, 38); x.lineTo(82, 38); x.closePath(); x.fill();
    x.lineWidth = 5; x.beginPath(); x.moveTo(140, 20); x.lineTo(140, 66); x.stroke();
    x.beginPath(); x.arc(196, 43, 9, 0, 6.2832); x.lineWidth = 5; x.stroke();
  });
  var icons = new Mesh(new PlaneGeometry(26, 8), new MeshBasicMaterial({ map: iconTex, transparent: true, depthWrite: false })); icons.rotation.x = -Math.PI / 2; icons.position.set(-14, topY + 1.52, 3.5); model.add(icons);
  var slotTex = canvasTex(256, 112, function (x, w, h) {
    x.clearRect(0, 0, w, h); x.fillStyle = V.recess; rrPath(x, 4, 4, w - 8, h - 8, 36); x.fill();
    x.fillStyle = '#050507'; rrPath(x, 14, 14, w - 28, h - 28, 28); x.fill();
  });
  var slot = new Mesh(new PlaneGeometry(27, 11.5), new MeshBasicMaterial({ map: slotTex, transparent: true, depthWrite: false })); slot.rotation.x = -Math.PI / 2; slot.position.set(25, topY + .05, 4); model.add(slot);

  /* ---------- borde inferior: canal del Lightning + puerto USB-C de carga rápida ---------- */
  var botY = -H / 2;
  var chanTex = canvasTex(512, 96, function (x, w, h) {
    x.clearRect(0, 0, w, h); x.fillStyle = V.recess; rrPath(x, 4, 4, w - 8, h - 8, 40); x.fill();
    x.fillStyle = '#050507'; rrPath(x, 14, 14, w - 28, h - 28, 32); x.fill();
  });
  var chan = new Mesh(new PlaneGeometry(50, 9.4), new MeshBasicMaterial({ map: chanTex, transparent: true, depthWrite: false })); chan.rotation.x = Math.PI / 2; chan.position.set(28, botY - .05, 0); model.add(chan);
  var cport = canvasTex(256, 112, function (x, w, h) {
    x.clearRect(0, 0, w, h); x.fillStyle = V.recess; rrPath(x, 4, 4, w - 8, h - 8, 40); x.fill();
    x.fillStyle = '#050507'; rrPath(x, 14, 14, w - 28, h - 28, 32); x.fill();
    x.fillStyle = '#2b2b31'; rrPath(x, 52, 46, w - 104, 20, 8); x.fill();
  });
  var cp = new Mesh(new PlaneGeometry(15, 6.6), new MeshBasicMaterial({ map: cport, transparent: true, depthWrite: false })); cp.rotation.x = Math.PI / 2; cp.position.set(-22, botY - .05, 0); model.add(cp);
  var fast = canvasTex(96, 96, function (x) {
    x.clearRect(0, 0, 96, 96); x.fillStyle = variant === 'black' ? '#8a8a94' : '#8d877a';
    x.beginPath(); x.moveTo(54, 8); x.lineTo(24, 54); x.lineTo(46, 54); x.lineTo(38, 88); x.lineTo(74, 38); x.lineTo(52, 38); x.closePath(); x.fill();
  });
  var fp = new Mesh(new PlaneGeometry(4.6, 4.6), new MeshBasicMaterial({ map: fast, transparent: true, depthWrite: false })); fp.rotation.x = Math.PI / 2; fp.position.set(-8, botY - .05, 0); model.add(fp);

  /* ---------- puntos de anclaje de los cables (coordenadas locales de la Power Bank) ---------- */
  var V3 = Vector3;
  var A = {
    /* USB-C integrado: nace atrás del borde superior, forma una agarradera y termina en el conector dentro de la ranura (punta hacia -x) */
    loop: [new V3(34, 47.5, -9), new V3(48, 66, -10), new V3(66, 83, -8), new V3(86, 79, -2), new V3(88, 62, 4), new V3(72, 52.4, 5), new V3(50, 51.6, 4.4), new V3(14.5, 50.7, 4)],
    loopF: new V3(34, 47.5, -9), loopTipRest: new V3(14.5, 50.7, 4),
    /* Lightning: sale del extremo derecho del canal y el conector reposa dentro de él (punta hacia -x) */
    ltF: new V3(47, -48.6, 0), ltRest: [], ltTipRest: new V3(6, -51.2, 0),
    /* puerto USB-C inferior */
    cPort: new V3(-22, -50, 0)
  };
  for (var i = 0; i < 8; i++) { A.ltRest.push(new V3(47 + (6 - 47) * i / 7, i === 0 ? -48.6 : -51.2, 0)); }

  return {
    root: root, model: model, variant: variant, V: V, anchors: A, cableColor: V.cable,
    bodyMat: bodyMat, topMat: topMat,
    setLed: setLed,
    setFlash: function (f) { bodyMat.emissiveIntensity = f * .55; topMat.emissiveIntensity = f * .35; },
    refreshFace: drawFace, _led: ledC
  };
}
