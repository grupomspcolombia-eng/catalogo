# Animación 3D de la caja de regalo

Fuente de `assets/regalo3d.js` (Three.js). El sitio sigue siendo estático: este archivo ya está compilado y
solo se descarga cuando la sección "Caja de regalo" está por entrar en pantalla (ver `assets/site.js`).

- `phone.js`     celular sólido (iPhone y Android): marco, vidrio, pantalla viva, cámaras, botones, puerto.
- `powerbank.js` Power Bank según las fotos reales: MagSafe al frente, LED, monograma, USB-C integrado en
                 forma de agarradera arriba, Lightning integrado abajo y puerto USB-C de carga rápida al lado.
- `cables.js`    cables trenzados y enchufes USB-C / Lightning.
- `scene.js`     línea de tiempo (5 modos de carga) y control (tocar, deslizar, mantener, teclado).
- `stage.js`     renderizador, cámara y luces.

Recompilar tras cambios: `cd src-3d && npm install && npm run build` y subir el `?v=` de `regalo3d.js` en `assets/site.js`.
`src-3d` está en `.vercelignore`, no se publica.
