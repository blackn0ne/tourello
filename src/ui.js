import maplibregl from "maplibre-gl";
import { TMap } from "./map.js";
import { CATS, PLACES, INFO, SEASONS } from "./places.js";
import { CREDITS } from "./credits.js";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body, T = TMap;
  const isMobile = () => innerWidth < 820;
  const touch = matchMedia("(pointer:coarse)").matches;
  let current = null, map = null, stage = 0;

  const ICONS = {
    dome: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2v3M5 14a7 7 0 0114 0M4 14h16v6H4zM9 20v-3h6v3"/></svg>',
    yurt: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3l9 8H3zM5 11v9h14v-9M10 20v-5h4v5"/></svg>',
    bowl: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 11h18a9 9 0 01-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/></svg>',
    peak: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 20l7-13 4 7 3-4 6 10zM9 7l-2 3 2 1 2-1z"/></svg>'
  };
  const cat = id => CATS.find(c => c.id === id);
  const photo = p => `assets/photos/${p.id}.jpg`, thumb = p => `assets/photos/thumb/${p.id}.jpg`;
  const CR = CREDITS;
  const gallery = p => [p.id, p.id + "-2", p.id + "-3"].filter(k => CR[k]).map(k => ({ key: k, src: `assets/photos/${k}.jpg`, thumb: `assets/photos/thumb/${k}.jpg`, c: CR[k] }));
  const creditText = c => `Photo: ${c.author || "Wikimedia Commons"} · ${c.license}`;

  /* ---------- list ---------- */
  const listEl = $("#list"), barEl = $("#bar");
  listEl.innerHTML = `<div class="grp"><button data-id="__region">Whole region</button></div>` +
    CATS.map(c => `<div class="grp"><h4>${c.name}</h4>${PLACES.filter(p => p.cat === c.id).map(p => `<button data-id="${p.id}">${p.name}</button>`).join("")}</div>`).join("");
  const setList = open => { barEl.classList.toggle("open", open); $("#btnList").setAttribute("aria-expanded", open); };
  $("#btnList").addEventListener("click", () => setList(!barEl.classList.contains("open")));
  listEl.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    setList(false);
    if (b.dataset.id === "__region") { closePanel(); regionView(); } else openPlace(b.dataset.id);
  });
  document.addEventListener("pointerdown", e => { if (!barEl.contains(e.target)) setList(false); });

  /* ---------- camera ---------- */
  const pad = () => isMobile() ? { top: 60, bottom: innerHeight * 0.58, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: Math.min(460, innerWidth) };
  const NOPAD = { top: 0, bottom: 0, left: 0, right: 0 };
  function focusOn(p) {
    T.setTerrain(p.z < 13);
    map.flyTo({ center: p.ll, zoom: p.z, pitch: p.z > 14 ? 58 : 45, bearing: T.VIEW.bearing, padding: pad(), duration: 2600, essential: true });
  }
  const overview = () => { T.setTerrain(false); map.flyTo({ center: T.CENTER, zoom: T.VIEW.zoom, pitch: T.VIEW.pitch, bearing: T.VIEW.bearing, padding: NOPAD, duration: 2200, essential: true }); };
  function regionView() {
    T.setTerrain(true);
    const b = new maplibregl.LngLatBounds();
    PLACES.forEach(p => b.extend(p.ll));
    map.fitBounds(b, { padding: isMobile() ? 50 : 90, pitch: 30, bearing: 0, duration: 2600, essential: true });
  }

  /* ---------- markers ---------- */
  const markers = [];
  function buildMarkers() {
    for (const p of PLACES) {
      const wrap = document.createElement("div"), el = document.createElement("button");
      const c = cat(p.cat);
      wrap.className = "pin-wrap"; el.className = `pin pin-${p.cat}`; el.setAttribute("aria-label", p.name);
      const n = String(PLACES.indexOf(p) + 1).padStart(2, "0");
      el.innerHTML = `${CR[p.id] ? `<img src="${thumb(p)}" alt="" loading="lazy">` : `<i>${ICONS[c.icon]}</i>`}<u>TK-${n}</u><span><small>${c.name} · TK-${n}</small><b class="t">${p.name}</b></span>`;
      el.addEventListener("click", e => { e.stopPropagation(); openPlace(p.id); });
      el.addEventListener("mouseenter", () => { T.models.api.hover = p.id; });
      el.addEventListener("mouseleave", () => { T.models.api.hover = null; });
      wrap.appendChild(el);
      /* the label floats above the 3D icon */
      const m = new maplibregl.Marker({ element: wrap, anchor: "bottom", offset: T.sat ? [0, 0] : [0, -104] }).setLngLat(p.ll).addTo(map);
      markers.push({ p, el, m });
    }
  }

  /* ---------- panel ---------- */
  const panel = $("#panel");
  function renderPanel(p) {
    const c = cat(p.cat), i = PLACES.findIndex(x => x.id === p.id);
    panel.innerHTML = `
      <button class="p-close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="p-head"><div class="p-ico">${ICONS[c.icon]}</div><div class="p-kicker">${c.name} · Turkestan region</div><h2>${p.name}</h2><p class="p-tag">${p.tag}</p></div>
      <div class="p-body">
        ${(g => g.length ? `<div class="p-gallery n${g.length}">${g.map((x, i) => `<button class="g-item" data-i="${i}" aria-label="Open photo"><img src="${i ? x.thumb : x.src}" alt="${p.name}" loading="lazy"></button>`).join("")}</div>` : "")(gallery(p))}
        ${p.body.map(t => `<p>${t}</p>`).join("")}
        <dl class="p-facts">${p.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <h3>Visitor tips</h3><ul>${p.tips.map(t => `<li>${t}</li>`).join("")}</ul>
        <a class="p-route" target="_blank" rel="noopener" href="https://www.openstreetmap.org/directions?to=${p.ll[1]}%2C${p.ll[0]}">Get directions →</a>
      </div>
      <div class="p-nav"><button data-nav="-1">← Previous</button><button data-nav="1">Next place →</button></div>`;
    panel.scrollTop = 0; panel.dataset.i = i;
  }
  function openPlace(id, fromTour) {
    const p = PLACES.find(x => x.id === id); if (!p || !map) return;
    if (!fromTour && tour.on) tour.stop();
    current = id; history.replaceState(null, "", "#" + id);
    renderPanel(p); body.classList.add("panel-open"); $("#hudName").textContent = p.name;
    T.models.api.selected = id;
    guide.place(p, fromTour ? tour.next : null);
    markers.forEach(({ p: q, el }) => el.classList.toggle("on", q.id === id));
    $$("#list button").forEach(b => b.classList.toggle("on", b.dataset.id === id));
    $("#barLabel").textContent = p.name;
    focusOn(p);
  }
  function closePanel(fromTour) {
    if (!current) return;
    if (!fromTour && tour.on) tour.stop();
    current = null; history.replaceState(null, "", location.pathname + location.search);
    body.classList.remove("panel-open");
    markers.forEach(({ el }) => el.classList.remove("on"));
    $$("#list button").forEach(b => b.classList.remove("on"));
    $("#barLabel").textContent = "Explore Turkestan"; $("#hudName").textContent = "Turkestan";
    T.models.api.selected = null; guide.stop();
    map.easeTo({ padding: NOPAD, duration: 900 });
  }
  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"); let lbItems = [], lbI = 0;
  function showLb(i) {
    lbI = (i + lbItems.length) % lbItems.length; const x = lbItems[lbI];
    $("#lbImg").src = x.src; $("#lbCap").innerHTML = `<b>${PLACES.find(q => q.id === current).name}</b> · ${lbI + 1}/${lbItems.length} · <a href="${x.c.source}" target="_blank" rel="noopener">${creditText(x.c)}</a>`;
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  }
  const closeLb = () => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
  $("#lbX").addEventListener("click", closeLb); $("#lbPrev").addEventListener("click", () => showLb(lbI - 1)); $("#lbNext").addEventListener("click", () => showLb(lbI + 1));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.id === "lbImg") closeLb(); });
  addEventListener("keydown", e => { if (!lb.classList.contains("open")) return; if (e.key === "ArrowRight") showLb(lbI + 1); if (e.key === "ArrowLeft") showLb(lbI - 1); });

  panel.addEventListener("click", e => {
    const g = e.target.closest(".g-item"); if (g) { lbItems = gallery(PLACES.find(q => q.id === current)); showLb(+g.dataset.i); return; }
    if (e.target.closest(".p-close")) return closePanel();
    const n = e.target.closest("[data-nav]");
    if (n) openPlace(PLACES[(+panel.dataset.i + +n.dataset.nav + PLACES.length) % PLACES.length].id);
  });
  $("#btnHome").addEventListener("click", () => { setList(false); closePanel(); overview(); });
  $("#compass").addEventListener("click", () => map && map.easeTo({ bearing: 0, pitch: 0, duration: 900 }));

  /* ---------- season & layer ---------- */
  const seasonBtn = $("#season"), layersBtn = $("#layers");
  $("#seasonLabel").textContent = SEASONS[T.season];
  const flash = (btn, ms = 1800) => { btn.classList.add("show"); clearTimeout(btn._t); btn._t = setTimeout(() => btn.classList.remove("show"), ms); };
  seasonBtn.addEventListener("click", () => {
    const n = (T.season + 1) % 4; T.setSeason(n); $("#seasonLabel").textContent = SEASONS[n]; flash(seasonBtn);
  });
  layersBtn.addEventListener("click", () => {
    T.setSat(!T.sat); $("#layersLabel").textContent = T.sat ? "Illustrated" : "Satellite"; flash(layersBtn);
    body.classList.toggle("sat", T.sat);
    markers.forEach(({ m }) => m.setOffset(T.sat ? [0, 0] : [0, -104]));
  });

  /* ---------- audio guide (Web Speech API, English) ---------- */
  const guide = (() => {
    const synth = window.speechSynthesis, btn = $("#btnAudio");
    let on = true, voice = null;
    /* voice: calm British male first (Edge "Ryan Natural", macOS "Daniel", Chrome "Google UK English Male"), then any neural voice */
    const PREF = [/Ryan.*Natural/i, /Thomas.*Natural/i, /Google UK English Male/i, /Daniel/i, /Sonia.*Natural/i, /Libby.*Natural/i, /Google UK English Female/i, /Natural|Neural|Premium|Enhanced/i, /en-GB|en_GB/i];
    const pick = () => { if (!synth) return; const vs = synth.getVoices().filter(v => /^en(-|_)/i.test(v.lang)); for (const r of PREF) { const v = vs.find(v => r.test(v.name) || r.test(v.lang)); if (v) { voice = v; break; } } if (!voice) voice = vs[0] || null; };
    let player = null;
    /* studio audio override: drop assets/audio/<id>.mp3 (and welcome.mp3) next to the site and it plays instead of the browser voice */
    let done = null, cur = null;
    const finish = () => { body.classList.remove("speaking"); const d = done; done = null; d && d(); };
    const playUrl = (url, fallback) => {
      const a = new Audio(url); player = a;
      a.addEventListener("playing", () => body.classList.add("speaking")); a.addEventListener("ended", () => { if (player === a) finish(); });
      a.addEventListener("error", () => { if (player === a) fallback(); }, { once: true });
      a.play().catch(() => { if (player === a) fallback(); });
    };
    /* order: pre-generated mp3 in public/assets/audio (npm run audio) → browser voice */
    const play = (id, text, cb) => {
      if (!on) { cb && setTimeout(cb, 8000); return; } stopAll(); done = cb || null;
      playUrl(`assets/audio/${id}.mp3`, () => say(text));
    };
    const stopAll = () => { if (player) { player.pause(); player = null; } if (synth) synth.cancel(); body.classList.remove("speaking"); done = null; };
    if (synth) { pick(); synth.onvoiceschanged = pick; }
    const say = text => {
      if (!on || !synth) return; synth.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; if (voice) u.voice = voice; u.rate = 0.92; u.pitch = 0.88;
      cur = u;
      /* a cancelled utterance still fires onerror later: only the current one may end the step */
      u.onstart = () => body.classList.add("speaking"); u.onend = u.onerror = () => { if (cur === u) finish(); };
      synth.speak(u);
    };
    const render = () => { btn.classList.toggle("off", !on); btn.setAttribute("aria-pressed", on); $("#audioLabel").textContent = on ? "Audio guide on" : "Audio guide off"; };
    btn.addEventListener("click", () => { on = !on; if (!on) stopAll(); render(); });
    render();
    return {
      get on() { return on; }, set(v) { on = v; if (!on) stopAll(); render(); },
      welcome: () => play("welcome", "Welcome to Turkestan, the spiritual capital of the Silk Road. Drag to move around the city, scroll to zoom, and choose any landmark to hear its story."),
      place: (p, cb) => play(p.id, `${p.name}. ${p.tag}. ${p.body.join(" ")} A tip for your visit: ${p.tips[0]}`, cb),
      stop: stopAll
    };
  })();

  /* ---------- guided tour: the guide flies from place to place and narrates each one ---------- */
  const tour = (() => {
    const btn = $("#btnTour"); let on = false, i = -1, timer = null;
    const label = () => { btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", on); $("#tourLabel").textContent = on ? `Stop tour · ${i + 1}/${PLACES.length}` : "Guided tour"; };
    const step = () => { if (!on) return; i = (i + 1) % PLACES.length; label(); openPlace(PLACES[i].id, true); };
    const t = {
      get on() { return on; },
      start() { on = true; i = -1; if (!guide.on) guide.set(true); step(); },
      stop() { on = false; clearTimeout(timer); label(); },
      next() { if (!on) return; clearTimeout(timer); timer = setTimeout(step, 1600); }
    };
    btn.addEventListener("click", () => on ? (t.stop(), closePanel()) : t.start());
    label(); return t;
  })();

  /* ---------- intro & onboarding ---------- */
  const hint = $("#hint");
  const ready = () => { body.classList.remove("exploring"); body.classList.add("ready"); };
  function startExplore() {
    if (!map) return;
    body.classList.add("exploring"); T.drift = false; guide.welcome();
    map.flyTo({ center: [68.2712, 43.2968], zoom: 15.2, pitch: 60, bearing: map.getBearing() + 40, duration: 3200, essential: true });
    $("#hintTitle").textContent = "Drag to move";
    $("#hintText").innerHTML = touch ? "Explore Turkestan by<br>dragging with your finger" : "Explore Turkestan by holding<br>and dragging the cursor";
    hint.classList.remove("zoom"); stage = 1;
  }
  window.addEventListener("tmap:interact", e => {
    if (stage === 1 && e.detail === "drag") {
      stage = 2; hint.classList.add("zoom");
      $("#hintTitle").textContent = touch ? "Pinch to zoom" : "Scroll to zoom";
      $("#hintText").innerHTML = touch ? "Dive into the landscape<br>by pinching" : "Dive into the landscape<br>by scrolling";
    } else if (stage === 2 && e.detail === "zoom") { stage = 3; ready(); }
  });
  $("#btnExplore").addEventListener("click", startExplore);
  $("#btnNoAudio").addEventListener("click", () => { guide.set(false); startExplore(); });
  $("#hintSkip").addEventListener("click", () => { stage = 3; ready(); });

  /* ---------- modal ---------- */
  const modal = $("#modal");
  $("#tab-info").innerHTML = `<h2>Travel information</h2><p class="lead">The practical basics for visiting Turkestan.</p><div class="info-grid">${INFO.map(([t, x]) => `<div><h3>${t}</h3><p>${x}</p></div>`).join("")}</div>`;
  $("#interests").innerHTML = CATS.map(c => `<label><input type="checkbox" name="i" value="${c.id}"><span>${c.name}</span></label>`).join("");
  function openModal(tab) {
    $$(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    $$(".tab").forEach(t => t.classList.toggle("on", t.id === "tab-" + tab));
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
  }
  const closeModal = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); };
  $("#btnInfo").addEventListener("click", () => openModal("info"));
  $("#btnInquire").addEventListener("click", () => openModal("inquire"));
  $("#modalX").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  $$(".tabs button").forEach(b => b.addEventListener("click", () => openModal(b.dataset.tab)));
  $("#form").addEventListener("submit", e => { e.preventDefault(); $("#thanks").textContent = "Thank you! We will be in touch soon."; e.target.reset(); });
  addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); setList(false); closePanel(); } });

  /* ---------- boot ---------- */
  const fail = () => { $("#loader").innerHTML = '<p style="font-family:Inter,sans-serif;color:#6f5a4b;text-align:center;padding:24px">The map could not be loaded.<br>Please check your connection and reload.</p>'; };
  T.ready.then(m => {
    map = m; buildMarkers();
    /* HUD telemetry: camera azimuth/elevation, zoom, GPS of the view centre, fps, mission clock */
    const tAz = $("#tAz"), tEl = $("#tEl"), tZ = $("#tZ"), tFps = $("#tFps"), tT = $("#tT"), gps = $("#hudGps"), hudName = $("#hudName");
    const tele = () => {
      const c = map.getCenter();
      tAz.textContent = ((map.getBearing() + 360) % 360).toFixed(1) + "°"; tEl.textContent = (90 - map.getPitch()).toFixed(1) + "°";
      tZ.textContent = map.getZoom().toFixed(2); gps.textContent = `GPS: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)} · Z${Math.round(map.getZoom())}`;
    };
    map.on("move", tele); tele();
    map.on("movestart", () => body.classList.add("moving")); map.on("moveend", () => body.classList.remove("moving"));
    let frames = 0, fpsT = performance.now(); const t0 = performance.now();
    const clock = now => {
      frames++;
      if (now - fpsT > 1000) { tFps.textContent = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; const s = Math.floor((now - t0) / 1000); tT.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
      requestAnimationFrame(clock);
    };
    requestAnimationFrame(clock);
    T.onBearing = b => { $("#needle").style.transform = `rotate(${-b}deg)`; $("#needle").style.transformOrigin = "23px 23px"; };
    const id = location.hash.slice(1);
    if (PLACES.some(p => p.id === id)) { stage = 3; ready(); openPlace(id); } else T.drift = true;
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(() => setTimeout(() => body.classList.remove("is-loading"), 400));
  }).catch(fail);
