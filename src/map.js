import maplibregl from "maplibre-gl";
import mlcontour from "maplibre-contour";
import { PLACES } from "./places.js";
import { TModels } from "./models.js";

/* Tourello map: MapLibre GL + OpenFreeMap vector tiles, restyled in mandarin/cream.
   Adds atmosphere (sky + ground fog), warm directional light, height-graded 3D buildings,
   a 3D model of the Yasawi mausoleum footprint, ground "spotlights" under every place,
   an animated Silk Road route, optional 3D terrain and an Esri satellite layer. */
  const CENTER = [68.2709, 43.2977];
  const LANDMARK = [68.27096, 43.29771];
  const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
  const VIEW = { zoom: 13.4, pitch: 58, bearing: -25 };
  const ORBIT = { zoom: 15.6, pitch: 64 };

  /* cartoon palette: spring, summer, autumn, winter */
  const PAL = [
    { bg: "#f2e6c4", green: "#b9dc8a", wood: "#8fc96a", sand: "#f6e3b3", res: "#f5e6c6", water: "#7fd0dc", bld: ["#f7eedb", "#eacba2", "#dba97a"], road: "#fff9ea", major: "#ffe3b0", casing: "#c9a071", ice: "#ffffff", sky: "#bfe7f2", horizon: "#fff0cf", fog: "#f3e4c2", light: "#fff6ea", shade: "#b98f6a", accent: "#ff9a5c", tint: "#ffd27a" },
    { bg: "#f3e2b8", green: "#c6dc86", wood: "#98c763", sand: "#f8e2ac", res: "#f6e3bd", water: "#6fcbd8", bld: ["#f9efdb", "#edc99b", "#dea26f"], road: "#fff8e6", major: "#ffdea4", casing: "#c69a68", ice: "#ffffff", sky: "#b3e2ef", horizon: "#ffe9c2", fog: "#f1dfb6", light: "#fff3e0", shade: "#b58a62", accent: "#ff8f4a", tint: "#ffb66a" },
    { bg: "#f1dcae", green: "#d8c877", wood: "#cfa352", sand: "#f5d99c", res: "#f3ddb3", water: "#7cc3cf", bld: ["#f8ecd6", "#eac08c", "#da9557"], road: "#fff5e0", major: "#ffd394", casing: "#bf8e5a", ice: "#ffffff", sky: "#cfe0e4", horizon: "#ffdfae", fog: "#efd7a8", light: "#ffefd6", shade: "#ad815a", accent: "#f2803a", tint: "#ff9a4a" },
    { bg: "#eef2f4", green: "#dde8e4", wood: "#c8d8d2", sand: "#f4f5f2", res: "#eceff0", water: "#a9d6e4", bld: ["#fbfbfa", "#e4e2dc", "#cfc8bf"], road: "#ffffff", major: "#f6ebdd", casing: "#b7bfc3", ice: "#ffffff", sky: "#dbe8ef", horizon: "#f6f6f3", fog: "#e9edee", light: "#f8f7f4", shade: "#a5aeb1", accent: "#e8b08f", tint: "#dbe6f0" }
  ];
  let ROADS_HIDE_IN_SAT = [];
  /* per-season grading of the imagery: spring fresh, summer golden, autumn amber, winter cool */
  const SAT_GRADE = [
    { "raster-saturation": 0.12, "raster-contrast": 0.08, "raster-brightness-min": 0.02, "raster-hue-rotate": -4 },
    { "raster-saturation": 0.05, "raster-contrast": 0.1, "raster-brightness-min": 0.04, "raster-hue-rotate": 0 },
    { "raster-saturation": -0.05, "raster-contrast": 0.1, "raster-brightness-min": 0.04, "raster-hue-rotate": 10 },
    { "raster-saturation": -0.45, "raster-contrast": 0.05, "raster-brightness-min": 0.12, "raster-brightness-max": 1, "raster-hue-rotate": 0 }
  ];
  const FILLS = ["park", "landuse_pitch", "landuse_track", "landuse_school", "landuse_cemetery", "landcover_grass"];
  const FILL_HIDE_IN_SAT = [...FILLS, "landcover_wood", "landcover_sand", "landcover_ice", "landuse_residential", "water", "landcover_wetland"];
  const bldColor = P => ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, P.bld[0], 14, P.bld[1], 40, P.bld[2]];

  function recolor(layers, set, P) {
    set("background", "background-color", P.bg);
    FILLS.forEach(id => set(id, "fill-color", P.green));
    set("park_outline", "line-color", P.green);
    set("landcover_wood", "fill-color", P.wood);
    set("landcover_sand", "fill-color", P.sand);
    set("landcover_ice", "fill-color", P.ice);
    set("landuse_residential", "fill-color", P.res);
    set("water", "fill-color", P.water);
    ["waterway_river", "waterway_other", "waterway_tunnel"].forEach(id => set(id, "line-color", P.water));
    set("building", "fill-color", P.bld[1]);
    set("building-3d", "fill-extrusion-color", bldColor(P));
    set("hillshade", "hillshade-shadow-color", P.shade);
    set("hillshade", "hillshade-accent-color", P.accent);
    set("contour-minor", "line-color", P.shade);
    set("contour-major", "line-color", P.shade);
    for (const l of layers) {
      if (l.type === "line" && /^(road|bridge|tunnel)_/.test(l.id) && !/rail|arrow|path_pedestrian/.test(l.id)) {
        if (/casing/.test(l.id)) { set(l.id, "line-opacity", 0.9); set(l.id, "line-color", P.casing); }
        else if (/trunk|primary|secondary|motorway|link/.test(l.id)) set(l.id, "line-color", P.major);
        else set(l.id, "line-color", P.road);
      }
    }
  }
  function atmosphere(map, P) {
    try {
      map.setSky({ "sky-color": P.sky, "horizon-color": P.horizon, "fog-color": P.fog, "fog-ground-blend": 0.62, "horizon-fog-blend": 0.7, "sky-horizon-blend": 0.75, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 10, 1, 14, 0.6, 17, 0.25] });
      map.setLight({ anchor: "map", position: [1.3, 55, 62], color: P.light, intensity: 0.3 });
    } catch (e) { /* older MapLibre builds have no sky */ }
  }

  /* coordinate grid: 0.1 deg over the region, 0.01 deg around the city */
  function graticule() {
    const f = [], line = (a, b, k) => f.push({ type: "Feature", properties: { k }, geometry: { type: "LineString", coordinates: [a, b] } });
    const r = v => +v.toFixed(3);
    for (let x = 66; x <= 72.001; x += 0.1) line([r(x), 40.5], [r(x), 45], "c");
    for (let y = 40.5; y <= 45.001; y += 0.1) line([66, r(y)], [72, r(y)], "c");
    for (let x = 67.9; x <= 68.701; x += 0.01) line([r(x), 43.0], [r(x), 43.6], "f");
    for (let y = 43.0; y <= 43.601; y += 0.01) line([67.9, r(y)], [68.7, r(y)], "f");
    return { type: "FeatureCollection", features: f };
  }

  /* ---------- Silk Road route: a soft curve through every place ---------- */
  const ROUTE_ORDER = ["sauran", "tulips", "kultobe", "bazaar", "juma", "mosque", "yasawi", "esim", "hilvet", "rabiga", "hamam", "museum", "kitchen", "fountain", "amph", "arbat", "theatre", "karavan", "taikazan", "gauhar", "jibek", "arena", "yurt", "arystanbab", "otrar", "sayram", "domalak", "aksu"];
  function routeGeo() {
    const pts = ROUTE_ORDER.map(id => PLACES.find(p => p.id === id)).filter(Boolean).map(p => p.ll);
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const dx = x1 - x0, dy = y1 - y0, side = i % 2 ? 1 : -1;
      /* long hops between towns get a gentle arc; short in-town legs stay almost straight */
      const k = Math.hypot(dx, dy) > 0.02 ? 0.18 : 0.04;
      const cx = (x0 + x1) / 2 - dy * k * side, cy = (y0 + y1) / 2 + dx * k * side;
      for (let t = 0; t < 1; t += 1 / 14) {
        const a = 1 - t;
        out.push([a * a * x0 + 2 * a * t * cx + t * t * x1, a * a * y0 + 2 * a * t * cy + t * t * y1]);
      }
    }
    out.push(pts[pts.length - 1]);
    return { type: "Feature", geometry: { type: "LineString", coordinates: out } };
  }
  const DASH = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];

  /* Footprint of the Yasawi mausoleum (OSM way 117854803), extruded to its real ~39 m */
  const YASAWI = [[68.270798, 43.298046], [68.27137, 43.297745], [68.271387, 43.297737], [68.271405, 43.297739], [68.271428, 43.297731], [68.271439, 43.297715], [68.271434, 43.297697], [68.271415, 43.297685], [68.27139, 43.297685], [68.271321, 43.297619], [68.271202, 43.297495], [68.271125, 43.297419], [68.271139, 43.297402], [68.271134, 43.297384], [68.271114, 43.297372], [68.27109, 43.297371], [68.27107, 43.297382], [68.271063, 43.297399], [68.271046, 43.297408], [68.270467, 43.297712], [68.270592, 43.297838], [68.270568, 43.297851], [68.27065, 43.297933], [68.270674, 43.297921], [68.270798, 43.298046]];

  const api = { map: null, season: 1, sat: false, drift: false, terrain: false, animate: true, onBearing: null, VIEW, CENTER, LANDMARK };
  export const TMap = api;
  window.TMap = api; // handy in devtools

  api.ready = (async () => {
    const style = await (await fetch(STYLE_URL)).json();
    const byId = Object.fromEntries(style.layers.map(l => [l.id, l]));
    recolor(style.layers, (id, prop, val) => { const l = byId[id]; if (l) { l.paint = l.paint || {}; l.paint[prop] = val; } }, PAL[api.season]);

    /* clean map: no labels, icons, shields or road names; only Tourello pins are shown */
    style.layers.forEach(l => { if (l.type === "symbol") l.layout = { ...(l.layout || {}), visibility: "none" }; });
    ROADS_HIDE_IN_SAT = style.layers.filter(l => l.type === "line" && /^(road|bridge|tunnel)_/.test(l.id) && /casing|minor|service|track|path|link|rail|arrow|street/.test(l.id)).map(l => l.id);
    ROADS_HIDE_IN_SAT.forEach(id => { byId[id].layout = { ...(byId[id].layout || {}), visibility: "none" }; });
    style.layers.filter(l => l.type === "line" && /^(road|bridge|tunnel)_(trunk|primary|secondary|motorway)/.test(l.id) && !/casing/.test(l.id)).forEach(l => { l.paint = { ...(l.paint || {}), "line-color": "#fff3dc", "line-opacity": 0.35 }; });
    if (byId["natural_earth"]) byId["natural_earth"].layout = { visibility: "none" };

    const dem = new mlcontour.DemSource({ url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", encoding: "terrarium", maxzoom: 14, worker: true, cacheSize: 120 });
    dem.setupMaplibre(maplibregl);
    style.sources.dem = { type: "raster-dem", tiles: [dem.sharedDemProtocolUrl], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS" };
    style.sources.contours = { type: "vector", maxzoom: 15, tiles: [dem.contourProtocolUrl({ multiplier: 1, overzoom: 1, thresholds: { 9: [100, 500], 11: [50, 250], 12: [20, 100], 13: [10, 50], 15: [5, 25] }, elevationKey: "ele", levelKey: "level", contourLayer: "contours" })] };
    style.sources.grid = { type: "geojson", data: graticule() };
    style.sources.sat = { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 16, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" };
    style.sources.places = { type: "geojson", data: { type: "FeatureCollection", features: PLACES.map(p => ({ type: "Feature", properties: { id: p.id, cat: p.cat }, geometry: { type: "Point", coordinates: p.ll } })) } };
    const routeFeature = routeGeo();
    style.sources.route = { type: "geojson", data: routeFeature };
    style.sources.landmark = { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [YASAWI] } } };

    const idx = id => style.layers.findIndex(l => l.id === id);
    style.layers.splice(idx("background") + 1, 0, { id: "sat", type: "raster", source: "sat", paint: SAT_GRADE[api.season] });
    /* warm "golden hour" tint over the imagery, drawn under roads and buildings */
    style.layers.splice(idx("sat") + 1, 0, { id: "sat-tint", type: "background", paint: { "background-color": PAL[api.season].tint, "background-opacity": 0.14 } });
    FILL_HIDE_IN_SAT.forEach(id => { if (byId[id]) byId[id].layout = { ...(byId[id].layout || {}), visibility: "none" }; });
    /* real 3D buildings, translucent sand, so the city reads as volume on the imagery */
    if (byId["building-3d"]) { byId["building-3d"].layout = { visibility: "visible" }; byId["building-3d"].minzoom = 14.5; Object.assign(byId["building-3d"].paint, { "fill-extrusion-color": "#e9d2b4", "fill-extrusion-opacity": 0.5, "fill-extrusion-vertical-gradient": true }); }
    if (byId["building"]) byId["building"].layout = { visibility: "none" };
    style.layers.splice(idx("waterway_tunnel"), 0, { id: "hillshade", type: "hillshade", source: "dem", layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.5, "hillshade-shadow-color": "#b4987c", "hillshade-highlight-color": "#ffffff", "hillshade-accent-color": "#f2944f", "hillshade-illumination-direction": 315 } },
      { id: "contour-minor", type: "line", layout: { visibility: "none" }, source: "contours", "source-layer": "contours", filter: ["!=", ["get", "level"], 1], paint: { "line-color": "#b4987c", "line-opacity": 0.3, "line-width": 0.7 } },
      { id: "contour-major", type: "line", layout: { visibility: "none" }, source: "contours", "source-layer": "contours", filter: ["==", ["get", "level"], 1], paint: { "line-color": "#b4987c", "line-opacity": 0.8, "line-width": 1.4 } },
      { id: "grid-coarse", type: "line", layout: { visibility: "none" }, source: "grid", filter: ["==", ["get", "k"], "c"], paint: { "line-color": "#4a2e1a", "line-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.22, 13, 0.1, 15, 0.04], "line-width": 1 } },
      { id: "grid-fine", type: "line", layout: { visibility: "none" }, source: "grid", filter: ["==", ["get", "k"], "f"], minzoom: 12, paint: { "line-color": "#4a2e1a", "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13.5, 0.14, 17, 0.08], "line-width": 0.8 } });
    /* ground spotlights + route sit on the ground, under the buildings */
    style.layers.splice(idx("building"), 0,
      { id: "place-glow", type: "circle", source: "places", paint: { "circle-pitch-alignment": "map", "circle-color": "#f2591f", "circle-blur": 1, "circle-opacity": 0.28, "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 6, 13, 22, 16, 90, 18, 220] } },
      { id: "place-core", type: "circle", source: "places", paint: { "circle-pitch-alignment": "map", "circle-color": "#fff3e6", "circle-blur": 0.6, "circle-opacity": 0.55, "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 1.5, 13, 5, 16, 22, 18, 60] } },
      { id: "route-base", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#e0a93a", "line-opacity": 0.18, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 1.6, 17, 2.4], "line-dasharray": [1, 3] } }
    );

    const map = new maplibregl.Map({
      container: "map", style, center: LANDMARK, zoom: ORBIT.zoom, pitch: ORBIT.pitch, bearing: VIEW.bearing,
      maxPitch: 75, minZoom: 4, antialias: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), attributionControl: false, fadeDuration: 150
    });
    api.map = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>' }), "bottom-left");
    map.on("rotate", () => api.onBearing && api.onBearing(map.getBearing()));
    let dragCount = 0;
    map.on("dragstart", () => { dragCount = 0; });
    map.on("drag", () => { if (++dragCount === 6) window.dispatchEvent(new CustomEvent("tmap:interact", { detail: "drag" })); });
    map.on("zoomstart", e => { if (e.originalEvent) window.dispatchEvent(new CustomEvent("tmap:interact", { detail: "zoom" })); });
    await new Promise(r => map.once("load", r));
    atmosphere(map, PAL[api.season]);
    api.models = TModels.layer(map, PLACES, routeFeature.geometry.coordinates, CENTER);
    map.addLayer(api.models);
    api.models.api.elevation = ll => api.terrain ? (map.queryTerrainElevation(ll) || 0) : 0;
    Object.defineProperty(api.models.api, "terrainOn", { get: () => api.terrain });
    api.setSat(api.sat);
    await Promise.race([new Promise(r => map.once("idle", r)), new Promise(r => setTimeout(r, 6000))]);

    /* intro: slow orbit around the mausoleum · route: marching dashes */
    const t0 = performance.now();
    const loop = now => {
      if (api.drift) map.jumpTo({ center: LANDMARK, zoom: ORBIT.zoom, pitch: ORBIT.pitch, bearing: VIEW.bearing + (now - t0) / 280 });
      /* icons keep a near-constant screen size: ~45 m tall at z15.6, growing as you zoom out */
      api.models.api.zoomScale = Math.max(1, Math.min(60, Math.pow(2, 15.6 - map.getZoom()))) * 2.1;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return map;
  })();

  api.setSeason = i => {
    const m = api.map; if (!m) return; api.season = i;
    recolor(m.getStyle().layers, (id, prop, val) => { if (m.getLayer(id)) m.setPaintProperty(id, prop, val); }, PAL[i]);
    Object.entries(SAT_GRADE[i]).forEach(([k, v]) => m.setPaintProperty("sat", k, v));
    m.setPaintProperty("sat-tint", "background-color", PAL[i].tint);
    atmosphere(m, PAL[i]);
  };
  /* terrain is costly: on for mountain/region views and whenever the satellite mode is active */
  api.setTerrain = on => {
    const m = api.map; if (!m) return; on = on || api.sat; if (api.terrain === on) return; api.terrain = on;
    try { m.setTerrain(on ? { source: "dem", exaggeration: 1.3 } : null); } catch (e) { /* optional */ }
  };
  api.setSat = on => {
    const m = api.map; if (!m) return; api.sat = on;
    m.setLayoutProperty("sat", "visibility", on ? "visible" : "none");
    FILL_HIDE_IN_SAT.forEach(id => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "none" : "visible"));
    ["hillshade", "contour-minor", "contour-major", "grid-coarse", "grid-fine", "building"].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "none" : "visible"));
    ROADS_HIDE_IN_SAT.forEach(id => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "none" : "visible"));
    m.setLayoutProperty("sat-tint", "visibility", on ? "visible" : "none");
    /* real OSM volumes only make sense on the imagery; the illustrated map has its own 3D icons */
    if (m.getLayer("building-3d")) m.setLayoutProperty("building-3d", "visibility", on ? "visible" : "none");
    m.setPaintProperty("place-glow", "circle-opacity", on ? 0.4 : 0.28);
    api.models.api.icons = !on;
    if (on) api.setTerrain(true);
  };
