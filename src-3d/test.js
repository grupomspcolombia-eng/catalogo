import { Group, Vector3 } from 'three';
import { createStage } from './stage.js';
import { buildPhone } from './phone.js';
import { buildPowerBank } from './powerbank.js';

var canvas = document.getElementById('c');
var st = createStage(canvas); st.size(+(new URLSearchParams(location.search).get('w') || 840));
var q = new URLSearchParams(location.search);
var logo = new Image(); logo.src = 'assets/mp-monograma-footer.png';
function go() {
  var which = q.get('m') || 'pb';
  var g = new Group(); st.scene.add(g);
  if (which === 'pb' || which === 'pbb') {
    var pb = buildPowerBank(which === 'pbb' ? 'black' : 'ivory', logo); g.add(pb.root);
    g.scale.setScalar(2.1);
    g.rotation.set(+(q.get('rx') || 0) * Math.PI / 180, +(q.get('ry') || -18) * Math.PI / 180, 0, 'ZYX');
    window.__pb = pb;
  } else {
    var ph = buildPhone(which === 'ph' ? 'iphone' : 'android'); g.add(ph.root); g.scale.setScalar(1.55);
    var lv = '#FF4D5E';
    ph.setScreen({ kind: ph.kind, photo: null, photoA: 0, photoScale: 1, pct: +(q.get('p') || 3), lv: lv, cap: 'Batería baja', alertP: 1, lowP: 1, ev: 'Propuesta', when: 'Hoy · 8:30 pm', bolt: false, pctLow: true });
    g.rotation.set(+(q.get('rx') || 0) * Math.PI / 180, +(q.get('ry') || -25) * Math.PI / 180, 0, 'ZYX');
  }
  st.renderer.render(st.scene, st.camera); window.__done = 1;
}
logo.onload = go; logo.onerror = go;
