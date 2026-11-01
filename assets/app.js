(function () {
  "use strict";

  const D = window.TRAVEL_DATA;
  const app = document.getElementById("app");
  const cityById = Object.fromEntries(D.cities.map((c) => [c.id, c]));
  const TIERS = ["eco", "mid", "lux"];
  const ICONS = { history: "🏯", nature: "⛰️", beach: "🏖️", food: "🍜", fun: "🎡" };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- أدوات مساعدة ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } },
  };
  let currency = store.get("currency", "SAR");

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
  const dayWord = (n) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم");
  const paxWord = (n) => (n === 1 ? "شخص" : n === 2 ? "شخصين" : n + " أشخاص");
  const rate = (cur = currency) => (cur === "SAR" ? D.rates.VND_PER_SAR : cur === "USD" ? D.rates.VND_PER_USD : 1);
  const curName = (cur = currency) => (cur === "SAR" ? "ريال" : cur === "USD" ? "دولار" : "دونق");

  function money(vnd, cur = currency) {
    if (vnd === 0) return "مجانًا";
    if (cur === "VND") return fmt(Math.round(vnd / 1000) * 1000) + " دونق";
    if (cur === "USD") {
      const v = vnd / D.rates.VND_PER_USD;
      return "$" + fmt(v < 20 ? Math.round(v * 2) / 2 : Math.round(v), 1);
    }
    const v = vnd / D.rates.VND_PER_SAR;
    const r = v < 20 ? Math.round(v) : v < 500 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10;
    return fmt(Math.max(r, 1)) + " ريال";
  }
  function money2(vnd) {
    if (vnd === 0 || currency === "VND") return money(vnd);
    return `${money(vnd)}<span class="sub">${money(vnd, "VND")}</span>`;
  }
  function src(id, date, id2) {
    const links = [id, id2].filter(Boolean).map((i) => {
      const s = D.sources[i];
      return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : "";
    }).join("، ");
    return `<div class="src">المصدر: ${links}${date ? `، آخر تحقق ${esc(date)}` : ""}</div>`;
  }
  const scene = (key, mid) => {
    const out = window.SCENES[key] ? window.SCENES[key]() : "";
    return mid ? out.replace("xMidYMax slice", "xMidYMid slice") : out;
  };
  const cityScene = (c, mid) => scene(c.scene || c.id, mid);

  // ---------- المسافات والتنقل ----------
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h)) * 1.3; // تقريب لمسافة الطريق
  }
  const groundLeg = (d) => ({ hours: d / 45, mode: "باص أو سيارة", cost: { eco: Math.max(120000, d * 1300), mid: Math.max(250000, d * 2200), lux: Math.max(900000, d * 11000) } });
  const flightLeg = (d) => ({ hours: 1 + d / 750, mode: "طيران", cost: { eco: 900000 + d * 700, mid: 1400000 + d * 1000, lux: 3000000 + d * 2000 } });
  const hubOf = (c) => (c.code ? c : cityById[c.hub]);

  const travelCache = new Map();
  function travel(a, b) {
    const key = a.id + ">" + b.id;
    if (travelCache.has(key)) return travelCache.get(key);
    const d = km(a, b);
    let res;
    if (d <= 380) {
      const g = groundLeg(d);
      res = { mode: g.mode, hours: g.hours, cost: g.cost };
    } else {
      const ha = hubOf(a), hb = hubOf(b);
      const legs = [];
      if (ha !== a) legs.push(groundLeg(a.hubKm));
      legs.push(flightLeg(km(ha, hb)));
      if (hb !== b) legs.push(groundLeg(b.hubKm));
      const mode = legs.map((l) => l.mode).join(" ثم ").replace("طيران", `طيران ${ha.code}←${hb.code}`);
      res = {
        mode, hours: legs.reduce((s, l) => s + l.hours, 0) + (legs.length - 1) * 1,
        cost: Object.fromEntries(TIERS.map((t) => [t, legs.reduce((s, l) => s + l.cost[t], 0)])),
      };
    }
    travelCache.set(key, res);
    return res;
  }
  const hoursText = (h) => { const r = Math.round(h); return h < 1 ? "أقل من ساعة" : h < 1.75 ? "حوالي ساعة" : r === 2 ? "حوالي ساعتين" : r <= 10 ? `حوالي ${r} ساعات` : `حوالي ${r} ساعة`; };

  // ---------- الخريطة ----------
  const OUTLINE = "M82.5,5 L117.5,15 L135,37.5 L150,50 L117.5,67.5 L100,90 L95,120 L112.5,140 L115,150 L140,175 L155,185 L172.5,210 L180,242.5 L182.5,260 L180,282.5 L180,290 L175,300 L152.5,315 L127.5,328.75 L117.5,345 L70,372.5 L70,350 L62.5,327.5 L77.5,315 L105,312.5 L110,295 L137.5,280 L140,250 L137.5,220 L140,202.5 L130,182.5 L112.5,172.5 L100,152.5 L90,132.5 L62.5,117.5 L50,105 L67.5,90 L30,72.5 L25,50 L5,30 L12.5,20 L37.5,22.5 L57.5,17.5 Z";
  const ISLAND = "M45,326 Q52,322 53,330 Q52,340 46,338 Q42,332 45,326 Z";
  const XY = (c) => ({ x: (c.lon - 102) * 25, y: (23.5 - c.lat) * 25 });
  let mapId = 0;
  function mapSVG(stops, { animate = false } = {}) {
    const id = "m" + ++mapId;
    const on = new Set(stops.map((c) => c.id));
    const d = stops.map((c, i) => {
      const p = XY(c);
      if (i === 0) return `M${p.x},${p.y}`;
      const q = XY(stops[i - 1]);
      return `Q${(p.x + q.x) / 2 + 30},${(p.y + q.y) / 2} ${p.x},${p.y}`;
    }).join(" ");
    const dots = D.cities.map((c) => {
      const p = XY(c), active = on.has(c.id);
      const left = p.x < 100;
      return `<circle class="dot ${active ? "" : "off"}" cx="${p.x}" cy="${p.y}" r="${active ? 4.5 : 2.4}"/>` +
        (active ? `<text x="${left ? p.x - 8 : p.x + 8}" y="${p.y + 4}" text-anchor="${left ? "end" : "start"}">${esc(c.short)}</text>` : "");
    }).join("");
    return `
      <svg viewBox="-60 0 300 380" role="img" aria-label="خريطة فيتنام ومسار الرحلة">
        <path class="land" d="${OUTLINE}"/><path class="land" d="${ISLAND}"/>
        ${stops.length > 1 ? `<mask id="${id}"><path class="reveal ${animate ? "draw" : ""}" d="${d}" pathLength="1" style="--len:1"/></mask><path class="route" d="${d}" mask="url(#${id})"/>` : ""}
        ${dots}
      </svg>`;
  }

  // ---------- صور الأماكن من ويكيبيديا ----------
  const photoCache = store.get("wikiPhotos", {});
  function photoBox(p) {
    return `<div class="ph" data-wiki="${esc(p.wiki || "")}" data-type="${p.type}"><span class="ph-ico" aria-hidden="true">${ICONS[p.type] || "📍"}</span></div>`;
  }
  function paintPhoto(el, info) {
    if (!info || !info.src || el.dataset.done) return;
    el.dataset.done = "1";
    const img = new Image();
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onload = () => el.classList.add("loaded");
    img.src = info.src;
    el.appendChild(img);
  }
  async function loadPhotos(root = document) {
    const els = [...root.querySelectorAll(".ph[data-wiki]:not([data-done])")].filter((e) => e.dataset.wiki);
    els.forEach((e) => paintPhoto(e, photoCache[e.dataset.wiki]));
    const need = [...new Set(els.map((e) => e.dataset.wiki).filter((t) => !(t in photoCache)))];
    for (let i = 0; i < need.length; i += 40) {
      const batch = need.slice(i, i + 40);
      const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages|langlinks&piprop=thumbnail|name&pithumbsize=800&lllang=ar&lllimit=500&titles=" + encodeURIComponent(batch.join("|"));
      try {
        const res = await fetch(url);
        const j = await res.json();
        const q = j.query || {};
        const alias = {};
        (q.normalized || []).forEach((n) => (alias[n.from] = n.to));
        (q.redirects || []).forEach((r) => (alias[r.from] = r.to));
        const byTitle = {};
        Object.values(q.pages || {}).forEach((pg) => {
          byTitle[pg.title] = {
            src: pg.thumbnail ? pg.thumbnail.source : "",
            file: pg.pageimage || "",
            ar: pg.langlinks && pg.langlinks[0] ? pg.langlinks[0]["*"] : "",
            title: pg.title,
          };
        });
        batch.forEach((t) => {
          let f = t;
          for (let k = 0; k < 3 && alias[f]; k++) f = alias[f];
          photoCache[t] = byTitle[f] || { src: "" };
        });
        store.set("wikiPhotos", photoCache);
        document.querySelectorAll(".ph[data-wiki]:not([data-done])").forEach((e) => paintPhoto(e, photoCache[e.dataset.wiki]));
      } catch (e) { /* بدون إنترنت تبقى الأيقونة */ }
    }
  }

  // ---------- بطاقة المكان ونافذة التفاصيل ----------
  const allPlaces = D.cities.flatMap((c) => c.places.map((p, i) => ({ ...p, city: c, key: c.id + ":" + i })));
  const placeByKey = Object.fromEntries(allPlaces.map((p) => [p.key, p]));

  function placeCard(p, { showCity = false } = {}) {
    return `
      <button type="button" class="pcard" data-place="${p.key}">
        ${photoBox(p)}
        <span class="pcard-body">
          ${showCity ? `<span class="pcard-city">${esc(p.city.name)}</span>` : ""}
          <span class="pcard-name">${esc(p.name)}</span>
          <span class="pcard-desc">${esc(p.desc)}</span>
          <span class="pcard-meta"><b>${p.fee ? money(p.fee) : "مجانًا"}</b><span>⏱ ${esc(p.time)}</span></span>
        </span>
      </button>`;
  }

  const dlg = document.createElement("dialog");
  dlg.className = "place-dlg";
  document.body.appendChild(dlg);
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  const pdlg = document.createElement("dialog");
  pdlg.className = "place-dlg";
  document.body.appendChild(pdlg);
  pdlg.addEventListener("click", (e) => { if (e.target === pdlg || e.target.closest("[data-close]")) pdlg.close(); });

  // ملخص المكان من ويكيبيديا العربية (لو موجود)
  const sumCache = {};
  async function fetchSummary(info, el) {
    if (!info || !info.ar || !el) return;
    let txt = sumCache[info.ar];
    if (txt === undefined) {
      try {
        const u = "https://ar.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&exsentences=4&redirects=1&titles=" + encodeURIComponent(info.ar);
        const j = await (await fetch(u)).json();
        const pg = Object.values((j.query || {}).pages || {})[0] || {};
        txt = (pg.extract || "").trim();
      } catch (e) { txt = ""; }
      sumCache[info.ar] = txt;
    }
    if (txt) { el.textContent = txt; el.closest(".about").classList.add("has-wiki"); }
  }

  function openPlace(key) {
    const p = placeByKey[key];
    if (!p) return;
    const info = photoCache[p.wiki] || {};
    const big = info.src ? info.src.replace(/\/\d+px-/, "/1280px-") : "";
    const wikiLink = info.ar ? `https://ar.wikipedia.org/wiki/${encodeURIComponent(info.ar)}` : p.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(info.title || p.wiki)}` : "";
    pdlg.innerHTML = `
      <div class="dlg-in">
        <button type="button" class="dlg-x" data-close aria-label="إغلاق">✕</button>
        <div class="dlg-ph ${big ? "" : "empty"}">${big ? `<img src="${esc(big)}" alt="${esc(p.name)}">` : `<span class="ph-ico">${ICONS[p.type] || "📍"}</span>`}</div>
        <div class="dlg-body">
          <a class="pcard-city" href="#/city/${p.city.id}" data-close>${esc(p.city.name)}</a>
          <h2>${esc(p.name)}</h2>
          <div class="about">
            <p class="about-desc">${esc(p.desc)}</p>
            <div class="about-wiki"><span class="about-label">نبذة من ويكيبيديا</span><p id="wikiSum"></p></div>
          </div>
          <div class="dlg-facts">
            <div>الدخول<b>${p.fee ? money(p.fee) : "مجانًا"}</b></div>
            <div>الوقت المقترح<b>${esc(p.time)}</b></div>
            <div>النوع<b>${ICONS[p.type]} ${esc(D.interests[p.type])}</b></div>
          </div>
          ${wikiLink ? `<p class="dlg-more"><a href="${wikiLink}" target="_blank" rel="noopener">اقرأ أكثر عنه في ويكيبيديا${info.ar ? "" : " (بالإنجليزي)"}</a></p>` : ""}
          ${info.file ? `<div class="src">الصورة: <a href="https://en.wikipedia.org/wiki/File:${encodeURIComponent(info.file)}" target="_blank" rel="noopener">ويكيميديا كومنز</a>، برخصة حرة</div>` : ""}
          ${src(p.src, p.date)}
        </div>
      </div>`;
    if (typeof pdlg.showModal === "function") pdlg.showModal(); else pdlg.setAttribute("open", "");
    fetchSummary(info, pdlg.querySelector("#wikiSum"));
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-place]");
    if (b) openPlace(b.dataset.place);
  });

  // ---------- مدخل الميزانية ----------
  const DEFAULT = { budget: 6000 * D.rates.VND_PER_SAR, days: 7, travelers: 2, interests: [], flights: false };
  const getPlan = () => ({ ...DEFAULT, ...store.get("budgetPlan", {}) });
  const presetsFor = (cur) => (cur === "SAR" ? [3000, 5000, 8000, 12000, 20000] : cur === "USD" ? [800, 1500, 2000, 3000, 5000] : [20e6, 35e6, 55e6, 80e6, 130e6]);

  // ---------- الرئيسية ----------
  function viewHome() {
    const plan = getPlan();
    const cards = D.cities.map((c) => `
      <a class="postcard" href="#/city/${c.id}">
        <div class="art">${cityScene(c)}</div>
        <span class="stamp">${esc(c.code || c.region)}<small>${c.code ? esc(c.region) : ""}</small></span>
        <div class="body">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.summary)}</p>
          <div class="foot"><span>${c.places.length} مكان</span><span>السكن من <b>${money(c.costs.hotel.eco)}</b></span></div>
        </div>
      </a>`).join("");

    const picks = ["Golden Bridge (Vietnam)", "Hạ Long Bay", "Tràng An", "Hội An", "Imperial City of Huế", "Fansipan", "Paradise Cave (Vietnam)", "Bến Thành Market"]
      .map((w) => allPlaces.find((p) => p.wiki === w)).filter(Boolean);

    app.innerHTML = `
      <section class="hero">
        <div class="art">${scene("halong")}</div>
        <div class="wrap hero-in">
          <h1 class="display">كم ميزانيتك لفيتنام؟</h1>
          <p class="lead">اكتب ميزانيتك، ونطلع لك عشرات الخيارات من ${D.cities.length} وجهة و${allPlaces.length} مكان، بالأيام والتكلفة.</p>
          <form class="budget-box" id="heroBudget">
            <label for="hb">ميزانيتي</label>
            <input id="hb" inputmode="numeric" value="${fmt(Math.round(plan.budget / rate()))}" aria-describedby="hbc">
            <span id="hbc">${curName()}</span>
            <button class="btn" type="submit">وريني الخيارات</button>
          </form>
          <div class="actions"><a class="btn glass" href="#cities" data-scroll>أو تصفح الوجهات</a></div>
        </div>
      </section>

      <div class="wrap">
        <section class="band" id="cities">
          <div class="band-head">
            <div>
              <h2 class="display">${D.cities.length} وجهة تنتظرك</h2>
              <p>من جبال الشمال لجزر الجنوب. اسحب وشوف.</p>
            </div>
            <div class="arrows no-print">
              <button type="button" data-dir="1" aria-label="السابق">→</button>
              <button type="button" data-dir="-1" aria-label="التالي">←</button>
            </div>
          </div>
          <div class="postcards" id="cards">${cards}</div>
        </section>

        <section class="band">
          <div class="band-head">
            <div><h2 class="display">أماكن لازم تشوفها</h2><p>اضغط على أي مكان وشوف صورته وتفاصيله.</p></div>
            <a class="btn ghost" href="#/places">كل الأماكن (${allPlaces.length})</a>
          </div>
          <div class="pgrid">${picks.map((p) => placeCard(p, { showCity: true })).join("")}</div>
        </section>

        <section class="band">
          <div class="tiles">
            <a class="tile" href="#/before"><div class="ico">🧳</div><h3>قائمة التجهيز</h3><p>التأشيرة والصرف والشريحة، وأشّر على اللي خلصته.</p></a>
            <a class="tile" href="#/city/hcmc"><div class="ico">🕌</div><h3>أكل حلال ومساجد</h3><p>في كل وجهة قسم للمطاعم الحلال والمساجد القريبة.</p></a>
            <div class="tile"><div class="ico">🔎</div><h3>كل رقم له مصدر</h3><p>جنب كل سعر مصدره وتاريخ آخر تحقق منه.</p></div>
          </div>
        </section>
      </div>`;

    document.getElementById("heroBudget").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = parseFloat(document.getElementById("hb").value.replace(/[^\d.]/g, ""));
      if (v > 0) store.set("budgetPlan", { ...getPlan(), budget: v * rate() });
      location.hash = "#/plan";
    });
    const cardsEl = document.getElementById("cards");
    app.querySelectorAll(".arrows button").forEach((b) => b.addEventListener("click", () => {
      const w = cardsEl.querySelector(".postcard").offsetWidth + 18;
      cardsEl.scrollBy({ left: w * +b.dataset.dir, behavior: "smooth" });
    }));
    loadPhotos(app);
  }

  // ---------- صفحة المدينة ----------
  function viewCity(id) {
    const c = cityById[id];
    if (!c) return viewNotFound();

    const tierRows = [
      ["السكن (لليلة، غرفة لشخصين)", c.costs.hotel],
      ["الأكل (للشخص في اليوم)", c.costs.food],
      ["التنقل داخل المدينة (للشخص في اليوم)", c.costs.transport],
    ].map(([label, v]) => `<tr><td>${label}</td>${TIERS.map((t) => `<td class="num">${v[t] ? money2(v[t]) : "<span class='sub'>مشمول</span>"}</td>`).join("")}</tr>`).join("");

    const places = c.places.map((p, i) => placeCard({ ...p, city: c, key: c.id + ":" + i })).join("");
    const areas = c.stayAreas.map((a) => `<div class="area"><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div>`).join("");
    const mosques = c.halal.mosques.length
      ? `<ul class="clean">${c.halal.mosques.map((m) => `<li><b>${esc(m.name)}:</b> ${esc(m.note)}</li>`).join("")}</ul>`
      : `<p>ما فيه مساجد معروفة قريبة للسياح.</p>`;
    const near = D.cities.filter((o) => o !== c).map((o) => ({ o, t: travel(c, o) })).sort((a, b) => a.t.hours - b.t.hours).slice(0, 6)
      .map(({ o, t }) => `<tr><td><a href="#/city/${o.id}">${esc(o.name)}</a></td><td>${esc(t.mode)}</td><td>${hoursText(t.hours)}</td><td class="num">${money2(t.cost.eco)}</td></tr>`).join("");

    app.innerHTML = `
      <section class="hero city-hero">
        <div class="art">${cityScene(c)}</div>
        <div class="wrap hero-in">
          <div class="crumbs"><a href="#/">الرئيسية</a></div>
          <h1 class="display">${esc(c.name)}</h1>
          <p class="lead">${esc(c.summary)}</p>
          <div class="tags">${Object.entries(c.interests).filter(([, v]) => v >= 2).map(([k]) => `<span class="tag">${ICONS[k]} ${esc(D.interests[k])}</span>`).join("")}</div>
        </div>
      </section>

      <div class="wrap city-grid">
        <div>
          <section class="block">
            <h2>وش تزور؟ <small class="count">${c.places.length} مكان</small></h2>
            <div class="pgrid">${places}</div>
          </section>

          <section class="block">
            <h2>كم بتصرف؟</h2>
            <div class="table-wrap"><table>
              <thead><tr><th></th>${TIERS.map((t) => `<th>${D.tiers[t].name}</th>`).join("")}</tr></thead>
              <tbody>${tierRows}</tbody>
            </table></div>
            ${c.costs.note ? `<p class="hint">${esc(c.costs.note)}</p>` : ""}
            ${src(c.costs.src, c.costs.date, "numbeo")}
          </section>

          <section class="block">
            <h2>وين تسكن؟</h2>
            <div class="areas">${areas}</div>
          </section>

          <section class="block">
            <h2>الأكل الحلال والمساجد</h2>
            <div class="note">${mosques}<p style="margin:10px 0 0">${esc(c.halal.food)}</p>${src(c.halal.src, c.halal.date)}</div>
          </section>

          <section class="block">
            <h2>التنقل</h2>
            <ul class="clean">${c.transport.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            <h3 style="margin-top:22px">أقرب الوجهات من ${esc(c.name)}</h3>
            <div class="table-wrap"><table>
              <thead><tr><th>إلى</th><th>الطريقة</th><th>المدة</th><th>من (للشخص)</th></tr></thead>
              <tbody>${near}</tbody>
            </table></div>
            <p class="hint">المدد والأسعار تقديرية محسوبة من المسافة.</p>
          </section>
        </div>

        <aside class="facts">
          <dl>
            <div><dt>أفضل وقت</dt><dd>${esc(c.bestTime)}</dd></div>
            <div><dt>المدة المقترحة</dt><dd>${dayWord(c.days.ideal)}</dd></div>
            <div><dt>السكن لليلة</dt><dd>من ${money(c.costs.hotel.eco)} إلى ${money(c.costs.hotel.lux)}</dd></div>
            <div><dt>أقرب مطار</dt><dd>${c.code ? `<span dir="ltr">${esc(c.code)}</span>` : `${esc(cityById[c.hub].name)} (${hoursText(c.hubKm / 45)} بالطريق)`}</dd></div>
          </dl>
          <a class="btn no-print" href="#/plan">كم تكفيني ميزانيتي؟</a>
        </aside>
      </div>`;
    loadPhotos(app);
  }

  // ---------- كل الأماكن ----------
  function viewPlaces() {
    const f = store.get("placeFilter", { city: "", types: [], free: false, q: "" });
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">كل الأماكن</h1>
          <p class="lead">${allPlaces.length} مكان في ${D.cities.length} وجهة. اضغط على أي مكان وشوف صورته وتفاصيله.</p>
        </div>
        <div class="filters">
          <input type="search" id="fq" placeholder="ابحث عن مكان…" value="${esc(f.q)}" aria-label="بحث">
          <select id="fc" aria-label="الوجهة"><option value="">كل الوجهات</option>${D.cities.map((c) => `<option value="${c.id}" ${f.city === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
          <div class="chips">
            ${Object.entries(D.interests).map(([k, v]) => `<label class="chip"><input type="checkbox" name="ft" value="${k}" ${f.types.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("")}
            <label class="chip"><input type="checkbox" id="ff" ${f.free ? "checked" : ""}><span>💸 مجانية فقط</span></label>
          </div>
        </div>
        <p class="count-line" id="fcount"></p>
        <div class="pgrid" id="plist"></div>
      </div>`;
    const list = document.getElementById("plist");
    const apply = () => {
      const st = {
        q: document.getElementById("fq").value.trim(),
        city: document.getElementById("fc").value,
        types: [...app.querySelectorAll("input[name=ft]:checked")].map((i) => i.value),
        free: document.getElementById("ff").checked,
      };
      store.set("placeFilter", st);
      const res = allPlaces.filter((p) =>
        (!st.city || p.city.id === st.city) &&
        (!st.types.length || st.types.includes(p.type)) &&
        (!st.free || !p.fee) &&
        (!st.q || (p.name + p.desc + p.city.name).includes(st.q)));
      document.getElementById("fcount").textContent = res.length ? `${res.length} مكان` : "ما لقينا أماكن بهالفلتر. جرّب تشيل بعض الخيارات.";
      list.innerHTML = res.map((p) => placeCard(p, { showCity: !st.city })).join("");
      loadPhotos(list);
    };
    app.querySelector(".filters").addEventListener("input", apply);
    app.querySelector(".filters").addEventListener("change", apply);
    apply();
  }

  // ---------- قبل لا تسافر ----------
  function viewBefore() {
    const done = store.get("checklist", {});
    const total = D.before.reduce((s, b) => s + b.points.length, 0);
    const blocks = D.before.map((b, bi) => `
      <div class="check-card" data-card="${bi}">
        <h2><span>${b.icon} ${esc(b.title)}</span><small data-count="${bi}"></small></h2>
        ${b.points.map((p, pi) => `<label class="check"><input type="checkbox" data-k="${bi}-${pi}" ${done[bi + "-" + pi] ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}
        ${src(b.src, b.date, b.src2)}
      </div>`).join("");
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">جهّز شنطتك</h1>
          <p class="lead">كل اللي تحتاج تعرفه قبل السفر. أشّر على اللي خلصته، والقائمة تنحفظ على جهازك.</p>
        </div>
        <div class="progress"><div class="bar"><i id="bar"></i></div><span id="pct"></span></div>
        <div class="checklist">${blocks}</div>
      </div>`;
    const paint = () => {
      const n = Object.values(done).filter(Boolean).length;
      document.getElementById("bar").style.width = (n / total) * 100 + "%";
      document.getElementById("pct").textContent = `${n} من ${total}`;
      D.before.forEach((b, bi) => {
        const c = b.points.filter((_, pi) => done[bi + "-" + pi]).length;
        app.querySelector(`[data-count="${bi}"]`).textContent = c === b.points.length ? "تم ✓" : `${c} / ${b.points.length}`;
        app.querySelector(`[data-card="${bi}"]`).classList.toggle("done", c === b.points.length);
      });
    };
    app.querySelector(".checklist").addEventListener("change", (e) => {
      const k = e.target.dataset && e.target.dataset.k;
      if (!k) return;
      done[k] = e.target.checked;
      store.set("checklist", done);
      paint();
    });
    paint();
  }

  // ---------- محرك الخيارات ----------
  function score(c, interests) {
    if (!interests.length) return 1 + Object.values(c.interests).reduce((a, b) => a + b, 0) / 4;
    return 1 + interests.reduce((s, i) => s + (c.interests[i] || 0), 0);
  }

  // برنامج وتكلفة لمسار محدد بفئة محددة
  function planRoute(route, { days, tier, interests, travelers }) {
    if (route.reduce((s, c) => s + c.days.min, 0) > days) return null;
    const alloc = new Map(route.map((c) => [c, c.days.min]));
    let left = days - route.reduce((s, c) => s + c.days.min, 0);
    const byScore = [...route].sort((a, b) => score(b, interests) - score(a, interests));
    for (const extra of [0, 3, 30]) {
      let moved = true;
      while (left > 0 && moved) {
        moved = false;
        for (const c of byScore) if (left > 0 && alloc.get(c) < c.days.ideal + extra && (extra < 30 || alloc.get(c) < c.places.length)) { alloc.set(c, alloc.get(c) + 1); left--; moved = true; }
      }
    }
    if (left > 0) alloc.set(byScore[0], alloc.get(byScore[0]) + left);

    const rooms = Math.ceil(travelers / 2);
    const plan = [];
    let dayNo = 0, fees = 0, food = 0, local = 0, inter = 0, hotel = 0;
    route.forEach((c, ci) => {
      const n = alloc.get(c);
      const pool = c.places.map((p, i) => ({ ...p, key: c.id + ":" + i }))
        .sort((a, b) => (interests.includes(b.type) ? 1 : 0) - (interests.includes(a.type) ? 1 : 0));
      const slotsOf = (p) => (p.time.includes("يوم كامل") ? 2 : 1);
      const tr = ci > 0 ? travel(route[ci - 1], c) : null;
      if (tr) inter += tr.cost[tier];
      for (let d = 0; d < n; d++) {
        dayNo++;
        const last = dayNo === days;
        let slots = 2;
        const items = [];
        if (d === 0 && tr) slots = tr.hours > 5 ? 0 : tr.hours > 2.5 ? 1 : 1;
        if (d === 0 && ci === 0) { items.push({ t: "الوصول والاستقرار في الفندق" }); slots = 1; }
        if (last) slots = Math.min(slots, 1);
        while (slots > 0 && pool.length) {
          const k = pool.findIndex((p) => slotsOf(p) <= slots);
          if (k < 0) break;
          const p = pool.splice(k, 1)[0];
          slots -= slotsOf(p);
          fees += p.fee;
          items.push({ p });
        }
        if (slots > 0 && !items.length) items.push({ t: "يوم حر: تسوق وراحة وتجربة أكل محلي" });
        if (last) items.push({ t: "المغادرة" });
        plan.push({ day: dayNo, city: c, items, travel: d === 0 && tr ? { from: route[ci - 1], ...tr } : null, newCity: d === 0 });
        food += c.costs.food[tier];
        local += c.costs.transport[tier];
        if (!last) hotel += c.costs.hotel[tier] * rooms;
      }
    });
    const parts = {
      hotel, food: food * travelers, local: local * travelers, fees: fees * travelers, inter: inter * travelers,
      visa: 25 * D.rates.VND_PER_USD * travelers,
      flights: 0,
    };
    return { route, alloc, plan, parts, tier };
  }
  const totalOf = (r, flights, travelers) => Object.values(r.parts).reduce((a, b) => a + b, 0) + (flights ? D.intlFlight.vnd * travelers : 0);

  function candidates(days, interests) {
    const k = Math.max(1, Math.min(6, Math.round(days / 3)));
    const seen = new Set(), out = [];
    const add = (set) => {
      const r = [...set].sort((a, b) => b.lat - a.lat);
      const key = r.map((c) => c.id).join(",");
      if (!seen.has(key)) { seen.add(key); out.push(r); }
    };
    for (const seed of D.cities) {
      const set = [seed];
      while (set.length < k) {
        let best = null, bestV = -1;
        for (const c of D.cities) {
          if (set.includes(c)) continue;
          const dist = Math.min(...set.map((s) => km(s, c)));
          const v = score(c, interests) / (1 + dist / 350);
          if (v > bestV) { bestV = v; best = c; }
        }
        set.push(best);
        if (set.length >= 2) add(set);
      }
      add(set);
    }
    return out;
  }

  function buildOptions(s) {
    const budget = s.budget;
    const fits = [], over = [];
    for (const route of candidates(s.days, s.interests)) {
      let chosen = null, cheapest = null;
      for (const tier of ["lux", "mid", "eco"]) {
        const r = planRoute(route, { ...s, tier });
        if (!r) break;
        r.total = totalOf(r, s.flights, s.travelers);
        if (tier === "eco") cheapest = r;
        if (!chosen && r.total <= budget) chosen = r;
      }
      if (chosen) fits.push(chosen);
      else if (cheapest) over.push(cheapest);
    }
    const tierRank = { lux: 3, mid: 2, eco: 1 };
    const value = (r) => r.route.reduce((a, c) => a + score(c, s.interests) * r.alloc.get(c), 0) / s.days + tierRank[r.tier] * 1.2 + r.route.length * 0.15;
    fits.sort((a, b) => value(b) - value(a));
    over.sort((a, b) => a.total - b.total);
    return { fits, over };
  }

  // كم يوم تكفي الميزانية في كل وجهة
  function daysAffordable(c, s) {
    const rooms = Math.ceil(s.travelers / 2);
    const avgFee = c.places.slice(0, 6).reduce((a, p) => a + p.fee, 0) / 6;
    const entry = c.code ? 0 : groundLeg(c.hubKm).cost.mid * s.travelers;
    const fixed = 25 * D.rates.VND_PER_USD * s.travelers + (s.flights ? D.intlFlight.vnd * s.travelers : 0) + entry;
    return Object.fromEntries(TIERS.map((t) => {
      const daily = c.costs.hotel[t] * rooms + s.travelers * (c.costs.food[t] + c.costs.transport[t] + avgFee);
      return [t, Math.max(0, Math.floor((s.budget - fixed) / daily))];
    }));
  }

  // ---------- صفحة الميزانية ----------
  function viewPlan(preset) {
    const s = getPlan();
    if (preset >= 3 && preset <= 21) s.days = preset;
    const amount = Math.round(s.budget / rate());
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">ميزانيتي</h1>
          <p class="lead">اكتب كم معك، ونطلع لك كل الخيارات اللي تناسبك. غيّر أي شي والنتائج تتحدّث مباشرة.</p>
        </div>
        <div class="planner">
          <form class="form" id="planForm" onsubmit="return false">
            <div class="field">
              <label for="budget">الميزانية الكاملة <output>${curName()}</output></label>
              <input class="money-in" id="budget" inputmode="numeric" value="${fmt(amount)}">
              <div class="chips" style="margin-top:10px">${presetsFor(currency).map((v) => `<button type="button" class="chip-btn" data-b="${v}">${fmt(v)}</button>`).join("")}</div>
            </div>
            <div class="field">
              <label for="days">مدة الرحلة <output id="daysOut"></output></label>
              <input type="range" id="days" min="3" max="21" value="${s.days}">
            </div>
            <div class="field">
              <label for="travelers">عدد المسافرين <output id="trOut"></output></label>
              <input type="range" id="travelers" min="1" max="8" value="${s.travelers}">
            </div>
            <div class="field">
              <span class="label">وش تحب؟ <small class="hint" style="margin:0">اختياري</small></span>
              <div class="chips">${Object.entries(D.interests).map(([k, v]) => `<label class="chip"><input type="checkbox" name="interest" value="${k}" ${s.interests.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("")}</div>
            </div>
            <div class="field">
              <label class="toggle"><input type="checkbox" id="flights" ${s.flights ? "checked" : ""}><span>الميزانية تشمل تذاكر الطيران من السعودية <small>(تقدير ${money(D.intlFlight.vnd)} للشخص ذهاب وعودة)</small></span></label>
            </div>
          </form>
          <div class="result" id="result"></div>
        </div>
      </div>`;

    const form = document.getElementById("planForm");
    const resEl = document.getElementById("result");
    const budgetIn = document.getElementById("budget");
    let timer;
    const read = () => ({
      budget: (parseFloat(budgetIn.value.replace(/[^\d.]/g, "")) || 0) * rate(),
      days: +form.days.value,
      travelers: +form.travelers.value,
      interests: [...form.querySelectorAll("input[name=interest]:checked")].map((i) => i.value),
      flights: form.flights.checked,
    });
    const update = (now) => {
      const st = read();
      document.getElementById("daysOut").textContent = dayWord(st.days);
      document.getElementById("trOut").textContent = paxWord(st.travelers);
      store.set("budgetPlan", st);
      clearTimeout(timer);
      resEl.classList.add("updating");
      timer = setTimeout(() => { renderOptions(st); resEl.classList.remove("updating"); }, now ? 0 : 160);
    };
    form.addEventListener("input", () => update());
    form.addEventListener("change", () => update());
    budgetIn.addEventListener("blur", () => { const v = parseFloat(budgetIn.value.replace(/[^\d.]/g, "")); if (v) budgetIn.value = fmt(v); });
    form.querySelectorAll("[data-b]").forEach((b) => b.addEventListener("click", () => { budgetIn.value = fmt(+b.dataset.b); update(true); }));
    update(true);
  }

  let lastOptions = [];
  function renderOptions(s) {
    const { fits, over } = buildOptions(s);
    lastOptions = fits.length ? fits : over.slice(0, 5);
    const resEl = document.getElementById("result");
    if (s.budget <= 0) { resEl.innerHTML = `<div class="empty-state">اكتب ميزانيتك عشان نطلع لك الخيارات.</div>`; return; }

    const optCard = (r, i, isOver) => {
      const left = s.budget - r.total;
      const chips = r.route.map((c) => `<span class="stop-chip">${c.emoji} ${esc(c.name)} · ${dayWord(r.alloc.get(c))}</span>`).join("");
      return `
        <article class="opt ${isOver ? "over" : ""}">
          <div class="opt-art">${cityScene(r.route[0], true)}<span class="tier-badge t-${r.tier}">${D.tiers[r.tier].name}</span></div>
          <div class="opt-body">
            <h3>${r.route.map((c) => esc(c.short)).join(" ← ")}</h3>
            <div class="stops">${chips}</div>
            <div class="opt-foot">
              <div><span class="k">التكلفة</span><b>${money(r.total)}</b></div>
              <div><span class="k">${isOver ? "ينقصك" : "يبقى معك"}</span><b class="${isOver ? "neg" : "pos"}">${money(Math.abs(left))}</b></div>
              <button type="button" class="btn small" data-opt="${i}">شوف البرنامج</button>
            </div>
          </div>
        </article>`;
    };

    const affordable = D.cities.map((c) => ({ c, d: daysAffordable(c, s) })).sort((a, b) => b.d.mid - a.d.mid);
    const cap = (n) => (n > 60 ? "+60" : n);
    const destCards = affordable.map(({ c, d }) => `
      <a class="dest" href="#/city/${c.id}">
        <div class="dest-art">${cityScene(c, true)}</div>
        <div class="dest-body">
          <h4>${esc(c.name)}</h4>
          <div class="dest-days">
            <span class="${d.lux >= s.days ? "ok" : ""}">فاخر <b>${cap(d.lux)}</b></span>
            <span class="${d.mid >= s.days ? "ok" : ""}">متوسط <b>${cap(d.mid)}</b></span>
            <span class="${d.eco >= s.days ? "ok" : ""}">اقتصادي <b>${cap(d.eco)}</b></span>
          </div>
        </div>
      </a>`).join("");

    resEl.innerHTML = `
      <div class="summary-line">
        ${fits.length
          ? `لقينا لك <b>${fits.length}</b> خيار يناسب ميزانيتك ${money(s.budget)} لـ ${paxWord(s.travelers)} و${dayWord(s.days)}.`
          : `ميزانيتك ${money(s.budget)} ما تكفي ${dayWord(s.days)} لـ ${paxWord(s.travelers)} في أي مسار. هذي أقرب الخيارات، أو قلّل الأيام.`}
        <span class="hint">${s.flights ? "شامل تذاكر الطيران الدولي (تقدير)." : "بدون تذاكر الطيران الدولي."} شامل التأشيرة والسكن والأكل والتنقل والرسوم.</span>
      </div>
      <div class="opts">${lastOptions.map((r, i) => optCard(r, i, !fits.length)).join("")}</div>

      <section class="block" style="margin-top:44px">
        <h2>كم يوم تكفيك ميزانيتك في كل وجهة؟</h2>
        <p class="hint" style="margin-top:-6px">لو قعدت كل رحلتك في وجهة وحدة. الأخضر يغطي ${dayWord(s.days)} أو أكثر.</p>
        <div class="dests">${destCards}</div>
      </section>`;
    resEl.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => openOption(lastOptions[+b.dataset.opt], s)));
  }

  function openOption(r, s) {
    const first = r.route[0], last = r.route[r.route.length - 1];
    const p = r.parts;
    const sections = [];
    r.plan.forEach((d) => { if (d.newCity) sections.push({ city: d.city, travel: d.travel, days: [] }); sections[sections.length - 1].days.push(d); });
    const noteIco = (t) => (t.startsWith("الوصول") ? "🛬" : t === "المغادرة" ? "🛫" : "☕");
    const days = sections.map((sec) => `
      <section class="leg">
        ${sec.travel ? `<div class="leg-travel"><span class="lt-ico">${sec.travel.mode.includes("طيران") ? "✈️" : "🚐"}</span><span>من ${esc(sec.travel.from.short)} إلى ${esc(sec.city.short)}: ${esc(sec.travel.mode)}، ${hoursText(sec.travel.hours)}</span><b>${money(sec.travel.cost[r.tier])} للشخص</b></div>` : ""}
        <header class="leg-head">
          <div class="leg-art">${cityScene(sec.city, true)}</div>
          <div class="leg-title"><b>${esc(sec.city.name)}</b><span>${dayWord(sec.days.length)}، من اليوم ${sec.days[0].day}${sec.days.length > 1 ? " إلى " + sec.days[sec.days.length - 1].day : ""}</span></div>
          <a class="leg-link" href="#/city/${sec.city.id}" data-close>عن الوجهة</a>
        </header>
        ${sec.days.map((d) => `
          <div class="pday">
            <div class="pday-n"><small>اليوم</small>${d.day}</div>
            <div class="pday-items">${d.items.map((it) => it.p
              ? `<button type="button" class="prow" data-place="${it.p.key}">${photoBox(it.p)}<span class="prow-t"><b>${esc(it.p.name)}</b><small>${it.p.fee ? money(it.p.fee) : "مجانًا"} · ${esc(it.p.time)}</small></span><span class="prow-go" aria-hidden="true">‹</span></button>`
              : `<div class="prow note-row"><span class="note-ico">${noteIco(it.t)}</span><span>${esc(it.t)}</span></div>`).join("")}</div>
          </div>`).join("")}
      </section>`).join("");

    dlg.innerHTML = `
      <div class="dlg-in wide">
        <button type="button" class="dlg-x" data-close aria-label="إغلاق">✕</button>
        <div class="pass">
          <div class="pass-art">${cityScene(last, true)}<span class="ttl">بطاقة رحلتك</span></div>
          <div class="pass-main">
            <div class="pass-route">
              <div class="code">${esc(first.code || first.en)}<small>${esc(first.name)}</small></div>
              <div class="line"></div>
              <div class="code">${esc(last.code || last.en)}<small>${esc(last.name)}</small></div>
            </div>
            <div class="pass-fields">
              <div>المدة<b>${dayWord(s.days)}</b></div>
              <div>المسافرون<b>${paxWord(s.travelers)}</b></div>
              <div>المستوى<b>${D.tiers[r.tier].name}</b></div>
              <div>المحطات<b>${r.route.length === 1 ? "وجهة وحدة" : r.route.length === 2 ? "وجهتين" : r.route.length + " وجهات"}</b></div>
            </div>
          </div>
          <div class="pass-stub">
            <div><div class="k">التكلفة التقريبية</div><div class="amount">${money(r.total)}</div><div class="k">${money(r.total / s.travelers)} للشخص</div></div>
            <div class="barcode" aria-hidden="true"></div>
          </div>
        </div>
        <div class="costs">
          <div>السكن<b>${money(p.hotel)}</b></div>
          <div>الأكل<b>${money(p.food)}</b></div>
          <div>التنقل الداخلي<b>${money(p.local)}</b></div>
          <div>بين الوجهات<b>${money(p.inter)}</b></div>
          <div>رسوم الأماكن<b>${money(p.fees)}</b></div>
          <div>التأشيرة${s.flights ? " والطيران" : ""}<b>${money(p.visa + (s.flights ? D.intlFlight.vnd * s.travelers : 0))}</b></div>
        </div>
        <p class="hint">${D.tiers[r.tier].desc}. السكن محسوب غرفة لكل شخصين، والأسعار تقريبية ومصادرها في صفحة كل وجهة.</p>
        <div class="trip">
          <div class="legs">${days}</div>
          <div class="map">${mapSVG(r.route, { animate: true })}</div>
        </div>
        <div class="actions no-print"><button class="btn" type="button" onclick="window.print()">اطبع الخطة أو احفظها PDF</button></div>
      </div>`;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    loadPhotos(dlg);
  }

  function viewNotFound() {
    app.innerHTML = `<div class="wrap"><h1 class="display">الصفحة مو موجودة</h1><p><a href="#/">ارجع للرئيسية</a></p></div>`;
  }

  // ---------- عمق الطبقات مع التمرير ----------
  let ticking = false;
  function parallax() {
    ticking = false;
    const y = window.scrollY;
    document.querySelectorAll(".hero [data-depth]").forEach((el) => { el.style.transform = `translateY(${(y * parseFloat(el.dataset.depth)).toFixed(1)}px)`; });
  }
  if (!reduced) window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });

  // ---------- التوجيه ----------
  function render() {
    const h = location.hash.replace(/^#\/?/, "");
    const [page, arg] = h.split("/");
    document.body.className = "page-" + (page || "home");
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (page || "home")));
    if (pdlg.open) pdlg.close();
    if (dlg.open) dlg.close();
    if (!page) viewHome();
    else if (page === "city") viewCity(arg);
    else if (page === "places") viewPlaces();
    else if (page === "before") viewBefore();
    else if (page === "plan") viewPlan(+arg);
    else viewNotFound();
    if (reduced) document.querySelectorAll("svg.scene").forEach((s) => s.pauseAnimations && s.pauseAnimations());
  }
  function route() {
    if (location.hash === "#cities") return;
    const go = () => { render(); window.scrollTo({ top: 0, behavior: "instant" }); };
    if (document.startViewTransition && !reduced) document.startViewTransition(go); else go();
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-scroll]");
    if (!a) return;
    e.preventDefault();
    document.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  // ---------- العملة ----------
  const curBox = document.getElementById("currency");
  const paintCurrency = () => curBox.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.cur === currency));
  curBox.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    currency = b.dataset.cur;
    store.set("currency", currency);
    paintCurrency();
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y, behavior: "instant" });
  });

  paintCurrency();
  window.addEventListener("hashchange", route);
  render();
})();
