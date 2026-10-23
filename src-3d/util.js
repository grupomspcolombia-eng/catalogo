/* Utilidades compartidas: easing, geometría de bordes redondeados y lienzos de textura */
import { Shape, Vector2, ShapeGeometry, ExtrudeGeometry, CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export var FONT = "'Montserrat', 'Helvetica Neue', Arial, system-ui, sans-serif";

export function lerp(a, b, k) { return a + (b - a) * k; }
export function clamp(k) { return k < 0 ? 0 : (k > 1 ? 1 : k); }
export function seg(t, a, b) { return clamp((t - a) / (b - a)); }
export function inOut(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
export function inOut2(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
export function outBack(k) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
export function snap(k) { var c1 = .9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
export function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
export function inCubic(k) { return k * k * k; }
export function mix(A, B, k) { var o = {}; for (var p in A) { o[p] = lerp(A[p], B[p] === undefined ? A[p] : B[p], k); } return o; }
export function rad(d) { return d * Math.PI / 180; }

/* contorno rectangular con esquinas redondeadas, centrado en el origen */
export function rrShape(w, h, r) {
  /* contorno muestreado a mano (sin puntos repetidos) para que el biselado no genere artefactos en el cierre */
  r = Math.min(r, w / 2, h / 2);
  var pts = [], N = 16, hw = w / 2, hh = h / 2, P2 = Math.PI / 2;
  var C = [[hw - r, -hh + r, -P2], [hw - r, hh - r, 0], [-hw + r, hh - r, P2], [-hw + r, -hh + r, Math.PI]];
  for (var c = 0; c < 4; c++) {
    for (var i = 0; i <= N; i++) { var a = C[c][2] + P2 * i / N; pts.push(new Vector2(C[c][0] + r * Math.cos(a), C[c][1] + r * Math.sin(a))); }
  }
  return new Shape(pts);
}

/* pieza sólida w x h x depth con aristas biseladas (suaves), centrada. Grupo 0 = tapas, grupo 1 = laterales */
export function slab(w, h, r, depth, bev, steps) {
  var g = new ExtrudeGeometry(rrShape(w - 2 * bev, h - 2 * bev, Math.max(.2, r - bev)), {
    depth: depth - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: steps || 8, curveSegments: 28, steps: 1
  });
  g.translate(0, 0, -(depth - 2 * bev) / 2);
  return toCreasedNormals(g, Math.PI / 7);
}

/* lámina plana redondeada con UV normalizados 0..1 (para pantallas y calcomanías) */
export function flat(w, h, r) {
  var g = new ShapeGeometry(rrShape(w, h, r), 28), p = g.attributes.position, uv = g.attributes.uv;
  for (var i = 0; i < p.count; i++) { uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h); }
  return g;
}

/* lienzo 2D -> textura */
export function canvasTex(w, h, draw, opts) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d'); draw(x, w, h);
  var t = new CanvasTexture(c);
  t.colorSpace = (opts && opts.linear) ? '' : SRGBColorSpace;
  t.anisotropy = 8;
  if (opts && opts.repeat) { t.wrapS = t.wrapT = RepeatWrapping; }
  return t;
}

export function rrPath(x, a, b, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
}
