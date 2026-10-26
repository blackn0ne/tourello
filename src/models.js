import * as THREE from "three";
import maplibregl from "maplibre-gl";

/* Tourello 3D icons: procedural low-poly "clay" models for every place, a comet that
   travels the Silk Road route, and a flock of birds over the mausoleum.
   Rendered through a MapLibre custom layer with Three.js. */
  const C = {
    clay: 0xf1e6d4, clay2: 0xe4cfb4, brick: 0xd9b48c, ink: 0x4a2e1a, mandarin: 0xf2591f, teal: 0x2fa9b8, tealDark: 0x1a7f8d,
    gold: 0xe9b949, cream: 0xfff6ec, green: 0x9fb46a, red: 0xd9342b, white: 0xffffff, rose: 0xc2417a, slate: 0xb9a690
  };
  /* three-step toon ramp: the "animated film" look */
  const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  /* glossy, rounded "emoji" look: smooth shading + clearcoat */
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0, emissive: color, emissiveIntensity: 0.18, ...extra });
  const INK = new THREE.MeshBasicMaterial({ color: 0x4a2e1a, side: THREE.BackSide });
  /* duplicate every mesh as an inflated back-face shell: a classic cheap cartoon outline */
  function outline(group, k = 1.045) {
    const add = [];
    group.traverse(m => { if (m.isMesh && m.material !== INK && !m.material.transparent) add.push(m); });
    for (const m of add) { const o = new THREE.Mesh(m.geometry, INK); o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale).multiplyScalar(k); m.parent.add(o); }
    return group;
  }
  const M = {}; const getMat = (c, extra) => (extra ? mat(c, extra) : (M[c] = M[c] || mat(c)));
  const mesh = (geo, color, x = 0, y = 0, z = 0, extra) => { const m = new THREE.Mesh(geo, getMat(color, extra)); m.position.set(x, y, z); return m; };
  const box = (w, h, d, c, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z);
  const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);
  const cone = (r, h, c, x = 0, y = 0, z = 0, seg = 8) => mesh(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
  const dome = (r, c, x = 0, y = 0, z = 0) => mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, x, y, z);
  const disc = (r, c, x = 0, y = 0, z = 0, h = 0.6) => mesh(new THREE.CylinderGeometry(r * 0.9, r, h, 24), c === C.green ? C.green : 0xe6cfa6, x, y + h / 2, z);
  const minaret = (h, x, z) => { const g = new THREE.Group(); g.add(cyl(1.3, 1.8, h, C.brick, x, 0, z)); g.add(dome(2, C.teal, x, h, z)); g.add(cyl(0.25, 0.25, 2, C.gold, x, h + 2, z)); return g; };
  const spire = (x, y, z) => cyl(0.2, 0.2, 2.5, C.gold, x, y, z);

  const BUILD = {
    mausoleum(big) {
      const g = new THREE.Group(), s = big ? 1 : 0.7;
      g.add(disc(26 * s, C.clay2));
      g.add(box(26 * s, 16 * s, 22 * s, C.brick, 0, 0.6, 0));
      g.add(box(12 * s, 22 * s, 6 * s, C.brick, 0, 0.6, 12 * s));              // iwan portal
      g.add(box(7 * s, 15 * s, 1.2 * s, C.tealDark, 0, 0.6, 15.2 * s));           // portal arch
      g.add(cyl(9 * s, 9 * s, 4 * s, C.brick, 0, 16.6 * s, -2 * s, 20));          // drum
      g.add(dome(9.5 * s, C.teal, 0, 20.6 * s, -2 * s)); g.add(spire(0, 30 * s, -2 * s));
      g.add(dome(4 * s, C.teal, -8 * s, 16.6 * s, 6 * s)); g.add(dome(4 * s, C.teal, 8 * s, 16.6 * s, 6 * s));
      if (big) { g.add(minaret(26, -16, 12)); g.add(minaret(26, 16, 12)); }
      return g;
    },
    underground() {
      const g = new THREE.Group();
      g.add(disc(16, C.clay2)); g.add(dome(5, C.teal, 0, 0.6, 0));
      for (let i = 0; i < 5; i++) g.add(box(5, 1, 2, C.brick, 0, 0.6 + i * 0.2, 7 + i * 2 - 2)); // stairs down
      g.add(box(6, 0.8, 4, C.ink, 0, 0.6, 7));
      return g;
    },
    ruins() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.SphereGeometry(22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), C.clay2, 0, -16, 0));
      const r = 15; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, h = 3 + Math.abs(Math.sin(i * 2.7)) * 7; const w = box(5, h, 2.5, C.brick, Math.cos(a) * r, 6, Math.sin(a) * r); w.rotation.y = -a; g.add(w); }
      g.add(cyl(4, 5, 9, C.brick, 0, 6, 0, 8));
      return g;
    },
    hammam() {
      const g = new THREE.Group();
      g.add(disc(16, C.clay2)); g.add(box(22, 7, 14, C.brick, 0, 0.6, 0));
      g.add(dome(5, C.clay, 0, 7.6, 0)); g.add(dome(3.2, C.clay, -7, 7.6, 2)); g.add(dome(3.2, C.clay, 7, 7.6, -2));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(1.2 + i * 0.4, 8, 6), C.white, 0, 15 + i * 3, 0, { transparent: true, opacity: 0.6 - i * 0.15 }));
      return g;
    },
    museum() {
      const g = new THREE.Group();
      g.add(disc(18, C.clay2)); g.add(box(24, 2, 16, C.clay, 0, 0.6, 0)); g.add(box(20, 9, 12, C.brick, 0, 2.6, 0));
      for (let i = -2; i <= 2; i++) g.add(cyl(0.8, 0.8, 9, C.clay, i * 4.5, 2.6, 7.5));
      g.add(box(24, 1.5, 16, C.clay, 0, 11.6, 0)); g.add(dome(4, C.gold, 0, 13.1, 0));
      return g;
    },
    caravanserai() {
      const g = new THREE.Group();
      g.add(disc(20, C.clay2));
      g.add(box(26, 6, 3, C.brick, 0, 0.6, -11.5)); g.add(box(26, 6, 3, C.brick, 0, 0.6, 11.5));
      g.add(box(3, 6, 20, C.brick, -11.5, 0.6, 0)); g.add(box(3, 6, 20, C.brick, 11.5, 0.6, 0));
      g.add(box(9, 11, 3, C.brick, 0, 0.6, 11.5)); g.add(box(4, 7, 1, C.tealDark, 0, 0.6, 13.2));
      g.add(cyl(3, 3, 1, C.teal, 0, 0.6, 0, 16));
      for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) g.add(dome(2.2, C.teal, x, 6.6, z));
      g.add(mesh(new THREE.ConeGeometry(2, 4, 4), C.mandarin, -5, 2.6, 0)); g.add(mesh(new THREE.ConeGeometry(2, 4, 4), C.gold, 5, 2.6, 0));
      return g;
    },
    yurts() {
      const g = new THREE.Group();
      g.add(disc(22, C.green));
      for (const [x, z, s] of [[0, 0, 1.2], [-11, 6, 0.9], [10, 7, 0.9], [2, -12, 0.8]]) {
        g.add(cyl(5 * s, 5 * s, 4 * s, C.cream, x, 0.6, z, 14)); g.add(cone(5.6 * s, 4 * s, C.clay, x, 4.6 * s, z, 14));
        g.add(box(2 * s, 3 * s, 0.4, C.red, x, 0.6, z + 5 * s));
      }
      g.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), C.mandarin, 0, 1.6, 9));
      return g;
    },
    bazaar() {
      const g = new THREE.Group();
      g.add(disc(20, C.clay2));
      const cols = [C.mandarin, C.gold, C.teal, C.rose, C.red];
      for (let r = 0; r < 3; r++) for (let q = -2; q <= 2; q++) {
        const x = q * 6.5, z = (r - 1) * 8.5; g.add(box(5.5, 2, 5, C.brick, x, 0.6, z));
        g.add(cone(4.2, 3, cols[(q + r + 7) % 5], x, 2.6, z, 4));
      }
      g.add(dome(6, C.teal, 0, 0.6, -14));
      return g;
    },
    kitchen() {
      const g = new THREE.Group();
      g.add(disc(16, C.clay2));
      const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector2(3 + Math.sin(i / 8 * Math.PI / 2) * 8, i * 0.9));
      g.add(mesh(new THREE.LatheGeometry(pts, 18), C.teal, 0, 0.6, 0));
      g.add(cyl(10.5, 10.5, 1, C.gold, 0, 7.6, 0, 18));
      for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(1.2 + i * 0.5, 8, 6), C.white, Math.sin(i) * 2, 11 + i * 3.5, Math.cos(i) * 2, { transparent: true, opacity: 0.6 - i * 0.12 }));
      g.add(box(3, 0.6, 14, C.cream, 12, 0.6, 0));
      return g;
    },
    tulips() {
      const g = new THREE.Group();
      g.add(disc(24, C.green));
      const cols = [C.red, C.gold, C.mandarin, C.rose];
      for (let i = 0; i < 46; i++) { const a = i * 2.4, r = Math.sqrt(i / 46) * 21; const x = Math.cos(a) * r, z = Math.sin(a) * r; g.add(cyl(0.25, 0.25, 4, C.green, x, 0.6, z, 5)); g.add(mesh(new THREE.ConeGeometry(1.3, 2.6, 6), cols[i % 4], x, 5.6, z)); }
      return g;
    },
    mountains() {
      const g = new THREE.Group();
      g.add(disc(30, C.clay2));
      for (const [x, z, h, r] of [[-10, 4, 26, 13], [8, -2, 34, 15], [20, 8, 20, 10], [-4, -12, 18, 9]]) {
        g.add(cone(r, h, C.slate, x, 0.6, z, 7)); g.add(cone(r * 0.35, h * 0.36, C.white, x, 0.6 + h * 0.64, z, 7));
      }
      for (let i = 0; i < 12; i++) g.add(cone(1.2, 3.5, C.green, Math.sin(i * 4.1) * 24, 0.6, Math.cos(i * 3.3) * 24, 5));
      return g;
    }
  };
  const KIND = { yasawi: ["mausoleum", true], rabiga: ["mausoleum"], arystanbab: ["mausoleum"], sayram: ["mausoleum"], hilvet: ["underground"], kultobe: ["ruins"], sauran: ["ruins"], otrar: ["ruins"], hamam: ["hammam"], museum: ["museum"], karavan: ["caravanserai"], yurt: ["yurts"], bazaar: ["bazaar"], kitchen: ["kitchen"], tulips: ["tulips"], aksu: ["mountains"] };

  function bird() {
    const g = new THREE.Group(), m = getMat(C.ink);
    const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.9), m), r = l.clone();
    l.position.x = -1.5; r.position.x = 1.5; g.add(l, r); g.userData = { l, r }; return g;
  }

  export const TModels = {
    layer(map, places, route, origin) {
      const o = maplibregl.MercatorCoordinate.fromLngLat(origin, 0), s = o.meterInMercatorCoordinateUnits();
      const local = ll => { const m = maplibregl.MercatorCoordinate.fromLngLat(ll, 0); return [(m.x - o.x) / s, (m.y - o.y) / s]; };
      const base = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      const api = { selected: null, hover: null, zoomScale: 1, icons: false, elevation: () => 0 };
      let scene, camera, renderer, items = [], birds = [], path = [], ribbon = null, ribbonZs = 1, ribbonElev = false;
      /* golden Silk Road: a translucent tube with travelling pulses and fine glints (additive) over a soft gold base */
      const goldMat = new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `varying vec2 vUv; uniform float t;
          void main(){
            float u = vUv.x;
            float glint = pow(0.5 + 0.5 * sin(u * 1400.0 - t * 4.0), 14.0) * (0.6 + 0.4 * sin(u * 37.0 + t));
            float f = fract(u * 5.0 - t * 0.06);
            float pulse = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.05, 0.42, f));
            float breathe = 0.8 + 0.2 * sin(t * 1.4);
            vec3 gold = vec3(1.0, 0.72, 0.25), hi = vec3(1.0, 0.95, 0.78);
            vec3 col = mix(gold, hi, clamp(glint * 0.9 + pulse * 0.7, 0.0, 1.0));
            float a = (0.16 + 0.75 * glint + 0.55 * pulse) * breathe;
            gl_FragColor = vec4(col * a, a);
          }`
      });
      const baseMat = new THREE.MeshBasicMaterial({ color: 0xe0a93a, transparent: true, opacity: 0.32, depthWrite: false });
      function buildRibbon(zs) {
        if (ribbon) { scene.remove(ribbon); ribbon.traverse(m => m.geometry && m.geometry.dispose()); }
        const pts = path.map(([x, z], i) => new THREE.Vector3(x, api.elevation(route[i]) + 3 * zs, z));
        const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
        const segs = Math.min(3000, pts.length * 5);
        ribbon = new THREE.Group();
        ribbon.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 1.1 * zs, 6, false), baseMat));
        ribbon.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 2.3 * zs, 8, false), goldMat));
        scene.add(ribbon); ribbonZs = zs; ribbonElev = !!api.terrainOn;
        return ribbon;
      }
      const self = {
        id: "tourello-3d", type: "custom", renderingMode: "3d",
        onAdd(m, gl) {
          camera = new THREE.Camera(); scene = new THREE.Scene();
          scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7ad, 1.9));
          const sun = new THREE.DirectionalLight(0xfff4e4, 2.4); sun.position.set(-0.6, 1, 0.5); scene.add(sun);
          const fill = new THREE.DirectionalLight(0xbfe9ff, 0.9); fill.position.set(0.8, 0.4, -0.6); scene.add(fill);
          for (const p of places) {
            const [kind, big] = KIND[p.id] || ["ruins"]; const g = BUILD[kind](big);
            const [x, z] = local(p.ll); const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.add(g);
            scene.add(holder); items.push({ p, holder, g, x, z });
          }
          for (let i = 0; i < 7; i++) { const b = bird(); scene.add(b); birds.push({ b, phase: i * 0.9, r: 110 + i * 14, h: 70 + i * 6, sp: 0.00045 + i * 0.00004 }); }
          path = route.map(local);
          ribbon = buildRibbon(1);
          renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true }); renderer.autoClear = false;
        },
        render(gl, matrix) {
          const now = performance.now(), zs = api.zoomScale;
          for (const it of items) {
            it.holder.visible = api.icons; if (!api.icons) continue;
            const sel = it.p.id === api.selected, hov = it.p.id === api.hover;
            const k = zs * (sel ? 1.18 : hov ? 1.08 : 1);
            it.g.scale.setScalar(k);
            it.holder.position.y = api.elevation(it.p.ll) + (sel ? Math.sin(now / 600) * 2 * zs : 0);
            it.g.rotation.y = sel ? now / 4000 : 0;
          }
          const y0 = api.elevation(places[0].ll);
          for (const bd of birds) {
            const a = now * bd.sp + bd.phase; bd.b.position.set(items[0].x + Math.cos(a) * bd.r * zs, y0 + bd.h * zs + Math.sin(a * 3) * 6 * zs, items[0].z + Math.sin(a) * bd.r * zs);
            bd.b.rotation.y = -a + Math.PI / 2; bd.b.scale.setScalar(zs * 1.3);
            const f = Math.sin(now / 90 + bd.phase) * 0.6; bd.b.userData.l.rotation.z = f; bd.b.userData.r.rotation.z = -f;
          }
          /* ribbon follows the icon scale and the terrain; rebuilt only when the scale changes noticeably */
          if (Math.abs(zs / ribbonZs - 1) > 0.18 || ribbonElev !== !!api.terrainOn) buildRibbon(zs);
          goldMat.uniforms.t.value = now / 1000;
          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(base);
          renderer.resetState(); renderer.render(scene, camera); map.triggerRepaint();
        }
      };
      self.api = api; return self;
    }
  };
