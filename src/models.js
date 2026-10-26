import * as THREE from "three";
import maplibregl from "maplibre-gl";

/* Tourello 3D layer: procedural models for every place, a golden sand stream drifting along the
   Silk Road route, volumetric-looking clouds with ground shadows, and a flock of birds over the mausoleum.
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
    mosque() {
      const g = new THREE.Group();
      g.add(disc(16, C.clay2)); g.add(box(22, 8, 16, C.brick, 0, 0.6, 0));
      for (let i = -2; i <= 2; i++) g.add(cyl(0.6, 0.6, 8, C.gold, i * 4.4, 0.6, 8.5));             // carved wooden columns
      g.add(box(24, 1.2, 18, C.ink, 0, 8.6, 0));                                                     // flat beamed roof
      g.add(dome(3.5, C.green, 0, 9.8, -2)); g.add(cyl(0.9, 1.1, 14, C.brick, 9, 0.6, -6)); g.add(dome(1.4, C.green, 9, 14.6, -6));
      return g;
    },
    amphitheatre() {
      const g = new THREE.Group();
      g.add(disc(20, C.clay2));
      for (let r = 0; r < 5; r++) { const ring = mesh(new THREE.CylinderGeometry(8 + r * 2.4, 8 + r * 2.4, 1.6, 24, 1, false, Math.PI * 0.15, Math.PI * 0.7), C.clay, 0, 0.6 + r * 1.6, 0); g.add(ring); }
      g.add(box(14, 0.8, 8, C.ink, 0, 0.6, 9)); g.add(box(14, 7, 0.8, C.mandarin, 0, 1.4, 13));
      for (let i = -2; i <= 2; i++) g.add(mesh(new THREE.SphereGeometry(0.9, 8, 6), C.gold, i * 3, 9, 13));
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
  const KIND = { esim: ["mausoleum"], gauhar: ["mausoleum"], domalak: ["mausoleum"], juma: ["mosque"], amph: ["amphitheatre"], yasawi: ["mausoleum", true], rabiga: ["mausoleum"], arystanbab: ["mausoleum"], sayram: ["mausoleum"], hilvet: ["underground"], kultobe: ["ruins"], sauran: ["ruins"], otrar: ["ruins"], hamam: ["hammam"], museum: ["museum"], karavan: ["caravanserai"], yurt: ["yurts"], bazaar: ["bazaar"], kitchen: ["kitchen"], tulips: ["tulips"], aksu: ["mountains"] };

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
      const api = { selected: null, hover: null, zoomScale: 1, icons: false, cloudsOn: true, elevation: () => 0 };
      let scene, camera, renderer, items = [], birds = [], path = [], sand = null, clouds = [], shadows = [];
      /* ---------- golden sand: thousands of additive sprites drifting along the Silk Road ---------- */
      const N = 7000, LEG_T = 9000;            // every leg takes 9 s, so the stream lingers in town and rushes between cities
      const sandTex = (() => {
        const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
        const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,245,210,1)"); g.addColorStop(0.25, "rgba(255,200,90,0.9)"); g.addColorStop(0.6, "rgba(255,160,40,0.25)"); g.addColorStop(1, "rgba(255,140,20,0)");
        x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
      })();
      const sandMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: sandTex }, uPx: { value: 3 }, uTime: { value: 0 } },
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSize; attribute float aPhase; uniform float uPx; uniform float uTime; varying float vA;
          void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p;
            gl_PointSize = aSize * uPx; vA = 0.55 + 0.45 * sin(uTime * 2.2 + aPhase); }`,
        fragmentShader: `uniform sampler2D map; varying float vA; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(c.rgb * vA, c.a * vA); }`
      });
      const sandState = new Float32Array(N * 4);   // leg, u, speed, lateral offset
      function buildSand() {
        const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N);
        const legs = path.length - 1;
        for (let i = 0; i < N; i++) {
          sandState[i * 4] = Math.floor(Math.random() * legs); sandState[i * 4 + 1] = Math.random();
          sandState[i * 4 + 2] = 0.6 + Math.random() * 0.9; sandState[i * 4 + 3] = (Math.random() - 0.5) * 2;
          size[i] = 0.5 + Math.pow(Math.random(), 2.5) * 2.5; phase[i] = Math.random() * 6.283;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1)); geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
        sand = new THREE.Points(geo, sandMat); sand.frustumCulled = false; scene.add(sand);
      }
      let lastSand = 0;
      function updateSand(now, zs) {
        const dt = Math.min(0.05, (now - lastSand) / 1000 || 0.016); lastSand = now;
        const pos = sand.geometry.attributes.position.array, legs = path.length - 1, w = 9 * zs;
        for (let i = 0; i < N; i++) {
          let leg = sandState[i * 4], u = sandState[i * 4 + 1] + sandState[i * 4 + 2] * dt * 1000 / LEG_T;
          if (u >= 1) { u -= 1; leg = (leg + 1) % legs; sandState[i * 4] = leg; }
          sandState[i * 4 + 1] = u;
          const a = path[leg], b = path[leg + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
          const nx = -dz / len, nz = dx / len, off = sandState[i * 4 + 3] * w * (0.6 + 0.4 * Math.sin(now / 900 + i));
          const x = a[0] + dx * u + nx * off, z = a[1] + dz * u + nz * off;
          pos[i * 3] = x; pos[i * 3 + 1] = api.elevation(route[leg]) + (2 + 6 * Math.abs(sandState[i * 4 + 3])) * zs + Math.sin(now / 500 + i) * 1.5 * zs; pos[i * 3 + 2] = z;
        }
        sand.geometry.attributes.position.needsUpdate = true;
        sandMat.uniforms.uTime.value = now / 1000;
        sandMat.uniforms.uPx.value = (1.6 + Math.min(6, Math.max(0, 15.6 - Math.log2(zs) - 9)) * 0.55) * (window.devicePixelRatio > 1 ? 1.4 : 1);
      }
      /* ---------- clouds: soft fBm billboards high above the city, each with a ground shadow ---------- */
      const cloudTex = (() => {
        const S = 256, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d"); const img = x.createImageData(S, S), d = img.data;
        const rnd = new Float32Array(64 * 64); for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
        const val = (px, py) => { const x0 = Math.floor(px) & 63, y0 = Math.floor(py) & 63, fx = px - Math.floor(px), fy = py - Math.floor(py), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const a = rnd[y0 * 64 + x0], b = rnd[y0 * 64 + ((x0 + 1) & 63)], cc = rnd[((y0 + 1) & 63) * 64 + x0], dd = rnd[((y0 + 1) & 63) * 64 + ((x0 + 1) & 63)];
          return (a + (b - a) * sx) + ((cc + (dd - cc) * sx) - (a + (b - a) * sx)) * sy; };
        for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
          let n = 0, amp = 0.5, f = 3 / S; for (let o = 0; o < 5; o++) { n += val(xx * f, y * f) * amp; amp *= 0.5; f *= 2; }
          const dx = xx / S - 0.5, dy = y / S - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2;
          const mask = Math.max(0, 1 - r * r), a = Math.max(0, Math.min(1, (n - 0.42) * 3.2)) * mask;
          const i = (y * S + xx) * 4, lum = 235 + n * 20; d[i] = lum; d[i + 1] = lum; d[i + 2] = lum + 6; d[i + 3] = a * 255;
        }
        x.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
      })();
      function buildClouds() {
        const cm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.9, color: 0xfff8ee });
        const sm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.34, color: 0x3a2410 });
        for (let i = 0; i < 16; i++) {
          const puff = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) { const sp = new THREE.Sprite(cm); const sc = 0.5 + Math.random() * 0.7; sp.scale.set(sc, sc * (0.55 + Math.random() * 0.3), 1); sp.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.3) * 0.25, (Math.random() - 0.5) * 0.3); puff.add(sp); }
          const shadow = new THREE.Sprite(sm); shadow.scale.set(1.3, 0.9, 1);
          scene.add(puff); scene.add(shadow);
          clouds.push({ g: puff, sh: shadow, x: (Math.random() - 0.5) * 9000, z: (Math.random() - 0.5) * 7000, size: 480 + Math.random() * 640, h: 260 + Math.random() * 120, sp: 2.2 + Math.random() * 1.6 });
        }
      }
      function updateClouds(now, zs) {
        const k = Math.max(1, zs * 0.55), t = now / 1000;
        for (const c of clouds) {
          let x = c.x + t * c.sp * 4; x = ((x + 4500) % 9000 + 9000) % 9000 - 4500;      // wind from the west, wraps around the region
          const y = api.elevation([68.27, 43.3]);
          c.g.position.set(x, y + c.h * k, c.z); c.g.scale.setScalar(c.size * k); c.g.visible = api.cloudsOn;
          c.sh.position.set(x + 60 * k, y + 2 * k, c.z + 40 * k); c.sh.scale.set(c.size * k * 1.2, c.size * k * 0.75, 1); c.sh.visible = api.cloudsOn;
        }
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
          buildSand(); buildClouds();
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
          updateSand(now, zs); updateClouds(now, zs);
          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(base);
          renderer.resetState(); renderer.render(scene, camera); map.triggerRepaint();
        }
      };
      self.api = api; return self;
    }
  };
