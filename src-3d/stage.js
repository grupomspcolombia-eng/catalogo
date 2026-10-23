/* Escena base: renderizador transparente, cámara que "ve" el lienzo de diseño 420x540 a escala 1:1 y luces de estudio. */
import { WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export var VW = 420, VH = 540, FOV = 30;

export function createStage(canvas) {
  var r = new WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.outputColorSpace = SRGBColorSpace; r.toneMapping = ACESFilmicToneMapping; r.toneMappingExposure = .92;
  r.setClearColor(0x000000, 0);
  var scene = new Scene();
  var pm = new PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), .035).texture; scene.environmentIntensity = .38; pm.dispose();
  var cam = new PerspectiveCamera(FOV, VW / VH, 100, 4000);
  var D = (VH / 2) / Math.tan(FOV * Math.PI / 360);
  cam.position.set(0, 0, D); cam.lookAt(0, 0, 0);
  var key = new DirectionalLight(0xfff1e2, 2.2); key.position.set(-260, 320, 520); scene.add(key);
  var rim = new DirectionalLight(0xffb0c4, 2.0); rim.position.set(380, 120, -220); scene.add(rim);
  var fill = new DirectionalLight(0xdfe6ff, .55); fill.position.set(300, -220, 420); scene.add(fill);
  function size(cssW) {
    var w = Math.max(2, Math.round(cssW)), h = Math.round(w * VH / VW);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(w, h, false);
  }
  return { renderer: r, scene: scene, camera: cam, size: size, D: D };
}
