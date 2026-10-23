/* Cables 3D: tubo trenzado que sigue una curva, con enchufe USB-C o Lightning en la punta (y opcionalmente otro en el origen).
   Cada cuadro se recalcula a partir de puntos de control, así el cable "se despliega" desde la Power Bank hasta el puerto del teléfono. */
import { Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, BufferGeometry, BufferAttribute, CatmullRomCurve3, Vector3, Matrix4, Quaternion,
  AdditiveBlending, RepeatWrapping, PlaneGeometry } from 'three';
import { slab, canvasTex } from './util.js';

var SEG = 80, RAD = 10;

/* ---------- enchufes: la punta está en el origen y el cuerpo se extiende hacia -Y ---------- */
var shellMat = new MeshStandardMaterial({ color: 0xd3d6dc, metalness: 1, roughness: .22 });
var darkMat = new MeshBasicMaterial({ color: 0x08080a });

export function makePlug(kind, color) {
  var g = new Group(), mold = new MeshStandardMaterial({ color: color, roughness: .62, metalness: 0 });
  if (kind === 'usbc') {
    var shell = new Mesh(slab(8.8, 3.2, 1.5, 8, .45, 3).rotateX(-Math.PI / 2).translate(0, -4, 0), shellMat); g.add(shell);
    var mouth = new Mesh(new PlaneGeometry(7.4, 1.9).rotateX(-Math.PI / 2), darkMat); mouth.position.y = .02; g.add(mouth);
    var tongue = new Mesh(new PlaneGeometry(5, .7).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x3a3a42 })); tongue.position.y = .04; g.add(tongue);
    var over = new Mesh(slab(10.6, 5.6, 2.4, 10, .9, 4).rotateX(-Math.PI / 2).translate(0, -13, 0), mold); g.add(over);
    g.userData.L = 18;
  } else {
    var sh = new Mesh(slab(6.8, 1.7, .5, 6.4, .3, 2).rotateX(-Math.PI / 2).translate(0, -3.2, 0), shellMat); g.add(sh);
    var gold = new MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: .3 });
    for (var i = 0; i < 4; i++) { var c = new Mesh(new PlaneGeometry(.8, 3.6).rotateX(-Math.PI / 2), gold); c.position.set(-2.4 + i * 1.6, .86, -1.8); g.add(c); }
    var ov = new Mesh(slab(8.6, 4.8, 2, 10, .75, 4).rotateX(-Math.PI / 2).translate(0, -11.4, 0), mold); g.add(ov);
    g.userData.L = 16.4;
  }
  g.userData.mold = mold;
  return g;
}

/* base ortonormal con Y = dir y X lo más cerca posible de ref */
var _m = new Matrix4(), _x = new Vector3(), _z = new Vector3(), _q = new Quaternion();
export function orient(obj, dir, ref) {
  var y = dir.clone().normalize();
  _x.copy(ref).addScaledVector(y, -ref.dot(y));
  if (_x.lengthSq() < 1e-6) { _x.set(1, 0, 0).addScaledVector(y, -y.x); }
  _x.normalize(); _z.crossVectors(_x, y).normalize();
  _m.makeBasis(_x, y, _z); obj.quaternion.setFromRotationMatrix(_m);
}

/* ---------- cable ---------- */
var braid = canvasTex(64, 64, function (x, w, h) {
  x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f0f0f0'; x.lineWidth = 7;
  for (var i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 64, 64); x.stroke(); }
  x.strokeStyle = '#303030'; x.lineWidth = 4;
  for (var j = -2; j < 6; j++) { x.beginPath(); x.moveTo(j * 16 + 64, 0); x.lineTo(j * 16, 64); x.stroke(); }
}, { linear: true, repeat: true });
var pulseTex = canvasTex(256, 8, function (x, w, h) {
  x.clearRect(0, 0, w, h); var g = x.createLinearGradient(0, 0, 90, 0); g.addColorStop(0, 'rgba(242,200,91,0)'); g.addColorStop(.7, 'rgba(255,214,120,.55)'); g.addColorStop(1, 'rgba(255,236,170,.9)');
  x.fillStyle = g; x.fillRect(0, 0, 90, h);
}, { repeat: true });

export function Cable(parent, o) {
  this.group = new Group(); parent.add(this.group);
  this.radius = o.radius || 2.1; this.kind = o.kind; this.start = null;
  var n = (SEG + 1) * RAD;
  this.pos = new Float32Array(n * 3); this.nor = new Float32Array(n * 3); var uv = new Float32Array(n * 2);
  var idx = [];
  for (var i = 0; i < SEG; i++) for (var j = 0; j < RAD; j++) {
    var a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = (i + 1) * RAD + j, d = (i + 1) * RAD + (j + 1) % RAD;
    idx.push(a, c, b, b, c, d);
  }
  this.geo = new BufferGeometry();
  this.geo.setAttribute('position', new BufferAttribute(this.pos, 3)); this.geo.setAttribute('normal', new BufferAttribute(this.nor, 3));
  this.uv = new BufferAttribute(uv, 2); this.geo.setAttribute('uv', this.uv); this.geo.setIndex(idx);
  this.mat = new MeshStandardMaterial({ color: o.color, roughness: .8, metalness: 0, bumpMap: braid, bumpScale: .7 });
  this.mesh = new Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.group.add(this.mesh);
  this.pmat = new MeshBasicMaterial({ map: pulseTex, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  this.pulse = new Mesh(this.geo, this.pmat); this.pulse.frustumCulled = false; this.group.add(this.pulse);
  this.plug = makePlug(o.kind, o.color); this.group.add(this.plug);
  if (o.startPlug) { this.start = makePlug(o.startPlug, o.color); this.group.add(this.start); }
  this.curve = new CatmullRomCurve3([new Vector3(), new Vector3(0, 1, 0)], false, 'centripetal');
  this.T = new Vector3(); this.P = new Vector3(); this.refX = new Vector3(1, 0, 0);
}
Cable.prototype.setColor = function (c) {
  this.mat.color.setHex(c); this.plug.userData.mold.color.setHex(c); if (this.start) this.start.userData.mold.color.setHex(c);
};
/* pts: puntos de control en el espacio local del padre; frac: tramo dibujado (0..1); ins: cuánto entra el enchufe; refX: eje X del puerto */
Cable.prototype.set = function (pts, frac, ins, glow, time, refX) {
  var c = this.curve; c.points = pts; c.updateArcLengths();
  var len = c.getLength(), r = this.radius, u1 = Math.max(.001, frac);
  var pos = this.pos, nor = this.nor, uv = this.uv.array, p = new Vector3(), prev = new Vector3(), T = new Vector3(), N = new Vector3(), B = new Vector3(), tmp = new Vector3();
  for (var i = 0; i <= SEG; i++) {
    var u = u1 * i / SEG; c.getPointAt(u, p); c.getTangentAt(u, T);
    if (i === 0) { N.set(0, 0, 1); if (Math.abs(T.z) > .9) N.set(1, 0, 0); N.addScaledVector(T, -N.dot(T)).normalize(); }
    else { N.addScaledVector(T, -N.dot(T)).normalize(); }
    B.crossVectors(T, N);
    for (var j = 0; j < RAD; j++) {
      var a = j / RAD * 6.2831853, ca = Math.cos(a), sa = Math.sin(a), k = (i * RAD + j) * 3;
      tmp.set(N.x * ca + B.x * sa, N.y * ca + B.y * sa, N.z * ca + B.z * sa);
      nor[k] = tmp.x; nor[k + 1] = tmp.y; nor[k + 2] = tmp.z;
      pos[k] = p.x + tmp.x * r; pos[k + 1] = p.y + tmp.y * r; pos[k + 2] = p.z + tmp.z * r;
      var q = (i * RAD + j) * 2; uv[q] = len * u / 9; uv[q + 1] = j / RAD;
    }
  }
  this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true; this.uv.needsUpdate = true;
  this.geo.computeBoundingSphere();
  /* enchufe de la punta */
  c.getPointAt(u1, this.P); c.getTangentAt(u1, this.T);
  this.plug.position.copy(this.P).addScaledVector(this.T, ins); orient(this.plug, this.T, refX || this.refX);
  /* enchufe del origen (cable externo): su punta mira hacia donde apunta -tangente inicial */
  if (this.start) {
    c.getPointAt(0, p); c.getTangentAt(0, T); var dir = T.clone().negate();
    this.start.position.copy(p).addScaledVector(dir, this.start.userData.L); orient(this.start, dir, this.startRef || this.refX);
  }
  /* pulsos de energía */
  this.pmat.opacity = glow; pulseTex.repeat.x = 9 / 58; pulseTex.offset.x = -time * .0016;
};
