/* Teléfono sólido: marco con grosor, vidrio frontal, pantalla viva (lienzo 2D), tapa trasera con cámaras, botones y puerto.
   Dos variantes: 'iphone' (titanio oscuro, isla dinámica, 3 lentes) y 'android' (marco plano plateado, perforación, barra de cámaras). */
import { Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, BoxGeometry, CylinderGeometry, TorusGeometry,
  CircleGeometry, PlaneGeometry, CanvasTexture, SRGBColorSpace, Object3D, LinearFilter } from 'three';
import { slab, flat, canvasTex, rrPath, FONT } from './util.js';

export var PH = { W: 128, H: 264, D: 14.5, SW: 122.4, SH: 258.4 };

/* ---------- pantalla (todo en "unidades de pantalla": 122.4 x 258.4) ---------- */
export function drawScreen(x, W, H, S) {
  var k = W / PH.SW, ihp = S.kind === 'iphone';
  x.clearRect(0, 0, W, H);
  var g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#202028'); g.addColorStop(.5, '#0c0c10'); g.addColorStop(1, '#050507');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  /* resplandor del color de batería detrás del anillo */
  var rg = x.createRadialGradient(61.2 * k, 128 * k, 4 * k, 61.2 * k, 128 * k, 64 * k);
  rg.addColorStop(0, S.lv + '2e'); rg.addColorStop(1, S.lv + '00');
  x.fillStyle = rg; x.fillRect(0, 60 * k, W, 150 * k);

  /* foto de fondo (la foto que luego "sale" del teléfono) */
  if (S.photo && S.photoA > .003) {
    var iw = S.photo.naturalWidth || S.photo.width, ih = S.photo.naturalHeight || S.photo.height;
    if (iw) {
      var sc = Math.max(W / iw, H / ih) * S.photoScale;
      x.save(); x.globalAlpha = S.photoA;
      x.drawImage(S.photo, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc);
      var tg = x.createLinearGradient(0, 0, 0, 64 * k); tg.addColorStop(0, 'rgba(0,0,0,.55)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = tg; x.fillRect(0, 0, W, 64 * k);
      x.restore();
    }
  }

  /* isla dinámica / perforación */
  x.fillStyle = '#000';
  if (ihp) { rrPath(x, 44 * k, 5 * k, 34.4 * k, 10.6 * k, 5.3 * k); x.fill(); }
  else { x.beginPath(); x.arc(61.2 * k, 9.5 * k, 3.1 * k, 0, 6.2832); x.fill(); x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = .7 * k; x.stroke(); }

  /* barra de estado */
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left';
  x.font = '700 ' + (7.4 * k) + 'px ' + FONT;
  x.fillText('8:12', 9.5 * k, 10.5 * k);
  var bx = PH.SW - 9.5 - 19.5, by = 7;
  x.strokeStyle = 'rgba(255,255,255,.72)'; x.lineWidth = 1 * k; rrPath(x, bx * k, by * k, 17.5 * k, 7.6 * k, 2.4 * k); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.72)'; rrPath(x, (bx + 18.4) * k, (by + 2.4) * k, 1.4 * k, 2.8 * k, .7 * k); x.fill();
  x.fillStyle = S.lv; rrPath(x, (bx + 1) * k, (by + 1) * k, Math.max(1.2, 15.5 * S.pct / 100) * k, 5.6 * k, 1.4 * k); x.fill();
  if (S.bolt) {
    var bX = (bx - 7) * k, bY = 6.2 * k; x.fillStyle = '#FFFFFF'; x.beginPath();
    x.moveTo(bX + 3.6 * k, bY); x.lineTo(bX, bY + 4.5 * k); x.lineTo(bX + 2.4 * k, bY + 4.5 * k); x.lineTo(bX + 1.8 * k, bY + 8.6 * k);
    x.lineTo(bX + 6 * k, bY + 3.2 * k); x.lineTo(bX + 3.4 * k, bY + 3.2 * k); x.closePath(); x.fill();
  }

  /* anillo + porcentaje + leyenda */
  var cx = 61.2 * k, cy = 130 * k, R = 33.5 * k, shake = S.shake || 0;
  x.save(); x.translate(shake * k, 0);
  x.lineWidth = 6 * k; x.lineCap = 'round';
  x.strokeStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); x.stroke();
  if (S.pct > 0.5) {
    x.save(); x.shadowColor = S.lv; x.shadowBlur = 9 * k; x.strokeStyle = S.lv;
    x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 6.2832 * Math.min(1, S.pct / 100)); x.stroke(); x.restore();
  }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 ' + (21 * k) + 'px ' + FONT; x.fillText(Math.round(S.pct) + '%', cx, cy + .5 * k);
  x.restore();
  if (S.cap) { x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.82)'; x.font = '600 ' + (8 * k) + 'px ' + FONT; x.fillText(S.cap, cx, cy + R + 15 * k); }

  /* tarjetas de aviso (mensaje y batería baja) */
  function card(p, y, ico, icoCol, t1, t1Col, t2, still) {
    if (p < .01) return;
    var off = still ? 0 : (1 - p) * -18;
    x.save(); x.globalAlpha = p;
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10 * k; x.shadowOffsetY = 3 * k;
    x.fillStyle = 'rgba(52,52,60,.94)'; rrPath(x, 5.5 * k, (y + off) * k, 111.4 * k, 27 * k, 9 * k); x.fill();
    x.shadowColor = 'transparent'; x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = .6 * k; x.stroke();
    x.fillStyle = icoCol; rrPath(x, 10.5 * k, (y + off + 4.5) * k, 18 * k, 18 * k, 5 * k); x.fill();
    x.strokeStyle = '#3A000E'; x.lineWidth = 1.2 * k; rrPath(x, 14.5 * k, (y + off + 9.5) * k, 10 * k, 7.5 * k, 1.4 * k); x.stroke();
    if (ico === 'bat') { x.fillStyle = '#3A000E'; x.fillRect(16 * k, (y + off + 11.4) * k, 2.4 * k, 3.6 * k); }
    else { x.fillStyle = '#3A000E'; x.fillRect(14.8 * k, (y + off + 12.2) * k, 9.4 * k, 1.1 * k); }
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = t1Col; x.font = '700 ' + (8.8 * k) + 'px ' + FONT; x.fillText(t1, 33 * k, (y + off + 9.6) * k);
    x.fillStyle = 'rgba(255,255,255,.68)'; x.font = '500 ' + (7.4 * k) + 'px ' + FONT; x.fillText(t2, 33 * k, (y + off + 18.6) * k);
    x.restore();
  }
  card(S.alertP, 24, 'msg', '#FFFFFF', S.ev, '#fff', S.when);
  card(S.lowP, 55, 'bat', '#FF0040', 'Batería baja', '#FFFFFF', '3% restante', true);

  /* indicador de inicio */
  x.fillStyle = 'rgba(255,255,255,.4)'; rrPath(x, 40.6 * k, (PH.SH - 5) * k, 41.2 * k, 1.9 * k, 1 * k); x.fill();
}

/* ---------- modelo ---------- */
export function buildPhone(kind) {
  var iph = kind === 'iphone', W = PH.W, H = PH.H, D = PH.D;
  var root = new Group(), model = new Group(); root.add(model);

  var frame = new MeshStandardMaterial({ color: iph ? 0x5a5a62 : 0xc4c7ce, metalness: 1, roughness: iph ? .3 : .26, envMapIntensity: 1.25 });
  var glassBack = new MeshPhysicalMaterial({ color: iph ? 0x1d1d22 : 0x222a33, roughness: .32, metalness: .1, clearcoat: .6, clearcoatRoughness: .25 });
  var glassFront = new MeshPhysicalMaterial({ color: 0x040405, roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .04 });
  var black = new MeshStandardMaterial({ color: 0x050507, roughness: .4, metalness: .2 });

  /* chasis */
  var R = iph ? 21 : 15;
  var body = new Mesh(slab(W, H, R, D, iph ? 1.9 : 1.3, 8), [frame, frame]); model.add(body);

  /* vidrio frontal + pantalla */
  var fg = new Mesh(flat(W - 2.5, H - 2.5, R - 1.25), glassFront); fg.position.z = D / 2 + .03; model.add(fg);
  var sc = document.createElement('canvas'); sc.width = 480; sc.height = Math.round(480 * PH.SH / PH.SW);
  var sx = sc.getContext('2d'), stex = new CanvasTexture(sc); stex.colorSpace = SRGBColorSpace; stex.anisotropy = 8; stex.minFilter = LinearFilter;
  var smat = new MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: stex, emissiveIntensity: 1, roughness: .1, metalness: 0,
    clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .55, toneMapped: false });
  var screen = new Mesh(flat(PH.SW, PH.SH, R - 2.6), smat); screen.position.z = D / 2 + .07; model.add(screen);

  /* tapa trasera (en coordenadas "mirando la tapa": x hacia la derecha del que mira, z hacia afuera) */
  var back = new Group(); back.position.z = -D / 2 - .03; back.rotation.y = Math.PI; model.add(back);
  var bg = new Mesh(flat(W - 2.5, H - 2.5, R - 1.25), glassBack); back.add(bg);

  function lens(parent, x, y, r) {
    var g = new Group(); g.position.set(x, y, 0);
    var ring = new Mesh(new TorusGeometry(r, r * .16, 14, 40), frame); ring.position.z = .5; g.add(ring);
    var cyl = new Mesh(new CylinderGeometry(r, r, 1.2, 40).rotateX(Math.PI / 2), black); cyl.position.z = .1; g.add(cyl);
    var gl = new Mesh(new CircleGeometry(r * .8, 36), new MeshPhysicalMaterial({ color: 0x07090f, roughness: .04, metalness: 0, clearcoat: 1, envMapIntensity: 1.6 }));
    gl.position.z = .72; g.add(gl);
    var dot = new Mesh(new CircleGeometry(r * .3, 24), new MeshBasicMaterial({ color: 0x2a2a30 })); dot.position.set(-r * .18, r * .2, .74); g.add(dot);
    parent.add(g);
  }
  var camMat = new MeshPhysicalMaterial({ color: iph ? 0x26262b : 0x14171c, roughness: .35, metalness: .15, clearcoat: .5 });
  if (iph) {
    var pl = new Mesh(slab(45, 45, 11, 2.6, .8, 5), camMat); pl.position.set(-35, 104, 1.1); back.add(pl);
    lens(back, -43.5, 112, 8.6); lens(back, -43.5, 94, 8.6); lens(back, -26.5, 103, 8.6);
    var fl = new Mesh(new CircleGeometry(2.3, 20), new MeshBasicMaterial({ color: 0xf4f4f4 })); fl.position.set(-25.5, 117.5, 2.5); back.add(fl);
    var lidar = new Mesh(new CircleGeometry(2.6, 20), black); lidar.position.set(-25.5, 89.5, 2.5); back.add(lidar);
    var mag = new Mesh(new TorusGeometry(25.5, .22, 6, 90), new MeshBasicMaterial({ color: 0x3b3b42 })); mag.position.set(0, 24, .02); back.add(mag);
  } else {
    var bar = new Mesh(slab(W - 2.5, 25, 5, 2.4, .7, 5), camMat); bar.position.set(0, 96, 1.0); back.add(bar);
    lens(back, -24, 96, 7.8); lens(back, -4, 96, 7.8);
    var fl2 = new Mesh(new CircleGeometry(2.4, 20), new MeshBasicMaterial({ color: 0xf4f4f4 })); fl2.position.set(17, 96, 2.2); back.add(fl2);
  }

  /* botones laterales */
  function btn(side, y, h) {
    var m = new Mesh(new BoxGeometry(1.6, h, 4.6), frame); m.position.set(side * (W / 2 + .1), y, 0); model.add(m);
  }
  btn(1, 56, 26);
  if (iph) { btn(-1, 84, 9); btn(-1, 62, 15); btn(-1, 40, 15); } else { btn(1, 92, 15); }

  /* puerto inferior + rejillas */
  var portTex = canvasTex(256, 48, function (x, w, h) {
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#030304'; rrPath(x, 96, 14, 64, 20, 9); x.fill();
    x.fillStyle = '#1b1b1f'; rrPath(x, 106, 20, 44, 8, 4); x.fill();
    x.fillStyle = '#050506';
    for (var i = 0; i < 5; i++) { x.beginPath(); x.arc(28 + i * 12, 24, 3.2, 0, 6.2832); x.fill(); x.beginPath(); x.arc(184 + i * 12, 24, 3.2, 0, 6.2832); x.fill(); }
  });
  var portPl = new Mesh(new PlaneGeometry(40, 7.5), new MeshBasicMaterial({ map: portTex, transparent: true, depthWrite: false }));
  portPl.rotation.x = Math.PI / 2; portPl.position.set(0, -H / 2 - .05, 0); model.add(portPl);
  var port = new Object3D(); port.position.set(0, -H / 2, 0); root.add(port);

  var last = '';
  return {
    root: root, model: model, kind: kind, port: port, screenMat: smat,
    setScreen: function (S) {
      var key = [S.kind, S.photo && S.photo.src, S.photoA.toFixed(3), S.photoScale.toFixed(3), S.pct.toFixed(1), S.lv, S.cap, S.alertP.toFixed(3), S.lowP.toFixed(3), S.ev, S.when, S.bolt ? 1 : 0, (S.shake || 0).toFixed(2), S.pctLow ? 1 : 0].join('|');
      if (key === last) return; last = key;
      drawScreen(sx, sc.width, sc.height, S); stex.needsUpdate = true;
    },
    invalidate: function () { last = ''; }
  };
}
