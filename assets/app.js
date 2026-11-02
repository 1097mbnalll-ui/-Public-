(function () {
  "use strict";

  const W = window.WORLD;
  const app = document.getElementById("app");
  // الدولة الحالية: كل الدوال تقرا منها
  let D = null, cityById = {}, allPlaces = [], placeByKey = {};
  function setCountry(c) {
    if (D && D.id === c.id) return;
    D = { ...c, tiers: W.tiers, interests: W.interests, sources: { ...W.sources, ...(c.sources || {}) } };
    cityById = Object.fromEntries(c.cities.map((x) => [x.id, x]));
    allPlaces = c.cities.flatMap((x) => x.places.map((p, i) => ({ ...p, city: x, key: c.id + ":" + x.id + ":" + i })));
    placeByKey = Object.fromEntries(allPlaces.map((p) => [p.key, p]));
    travelCache.clear();
    store.set("lastCountry", c.id);
  }
  var travelCache = new Map();
  const B = () => "#/c/" + D.id;
  const TIERS = ["eco", "mid", "lux"];
  const ICONS = { history: "🏯", nature: "⛰️", beach: "🏖️", food: "🍜", fun: "🎡" };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- أدوات مساعدة ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } },
  };
  // اللغة: عربي أو إنجليزي
  const qsLang = (location.search.match(/[?&]lang=(ar|en)/) || [])[1];
  if (qsLang) store.set("lang", qsLang);
  const EN_ON = store.get("lang", "ar") === "en";
  const T = (ar, en) => (EN_ON ? en : ar);
  const FWD = EN_ON ? "→" : "←";
  // تقييم رحّال: تقييم تحريري من 5 (مو تقييم زوار). يُحسب من النص العربي قبل الترجمة عشان يطلع نفسه باللغتين
  (function rateAll() {
    const big = /من أجمل|أجمل|أشهر|أكبر|أفضل|أعظم|أعلى|أقدم|رمز|خرافي|تحفة|روائع/;
    Object.values(W.countries).forEach((c) => c.cities.forEach((x) => {
      const n = x.places.filter((p) => !p.gem).length;
      let i = 0;
      x.places.forEach((p) => {
        if (p.rating) return;
        // الأماكن مرتبة من الأهم في كل مدينة
        let r = p.gem ? 4.55 : 4.75 - (i++ / Math.max(1, n - 1)) * 0.55;
        if (/التراث العالمي/.test(p.desc)) r += 0.12;
        if (big.test(p.desc)) r += 0.08;
        let h = 0; for (const ch of p.wiki || p.name) h = (h * 31 + ch.charCodeAt(0)) % 9973;
        r += ((h % 11) - 5) / 100;
        p.rating = Math.max(4.0, Math.min(4.9, Math.round(r * 10) / 10));
      });
    }));
  })();
  if (EN_ON && window.applyEnglish) window.applyEnglish();
  document.documentElement.lang = EN_ON ? "en" : "ar";
  document.documentElement.dir = EN_ON ? "ltr" : "rtl";
  document.body.classList.toggle("lang-en", EN_ON);
  let currency = store.get("currency", "SAR");
  if (currency === "VND") currency = "LOCAL";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
  const dayWord = (n) => (EN_ON ? (n === 1 ? "1 day" : n + " days") : n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم");
  const optWord = (n) => (EN_ON ? (n === 1 ? "<b>1</b> option" : `<b>${n}</b> options`) : n === 1 ? "خيار واحد" : n === 2 ? "خيارين" : n <= 10 ? `<b>${n}</b> خيارات` : `<b>${n}</b> خيار`);
  const paxWord = (n) => (EN_ON ? (n === 1 ? "1 traveller" : n + " travellers") : n === 1 ? "شخص" : n === 2 ? "شخصين" : n + " أشخاص");
  const rate = (cur = currency) => (cur === "SAR" ? D.currency.perSAR : cur === "USD" ? D.currency.perUSD : 1);
  const curName = (cur = currency) => (cur === "SAR" ? T("ريال", "SAR") : cur === "USD" ? T("دولار", "USD") : D.currency.name);

  function money(vnd, cur = currency) {
    if (vnd === 0) return T("مجانًا", "Free");
    if (cur === "LOCAL") { const r = D.currency.round || 1; return fmt(Math.max(r, Math.round(vnd / r) * r)) + " " + D.currency.name; }
    if (cur === "USD") {
      const v = vnd / D.currency.perUSD;
      return "$" + fmt(v < 20 ? Math.round(v * 2) / 2 : Math.round(v), 1);
    }
    const v = vnd / D.currency.perSAR;
    const r = v < 20 ? Math.round(v) : v < 500 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10;
    return EN_ON ? "SAR " + fmt(Math.max(r, 1)) : fmt(Math.max(r, 1)) + " ريال";
  }
  function money2(vnd) {
    if (vnd === 0 || currency === "LOCAL") return money(vnd);
    return `${money(vnd)}<span class="sub">${money(vnd, "LOCAL")}</span>`;
  }
  function src(id, date, id2) {
    const links = [id, id2].filter(Boolean).map((i) => {
      const s = D.sources[i];
      return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : "";
    }).join(T("، ", ", "));
    return `<div class="src">${T("المصدر", "Source")}: ${links}${date ? `${T("، آخر تحقق", ", last checked")} ${esc(date)}` : ""}</div>`;
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
  const U = (usd) => usd * D.currency.perUSD;
  const groundLeg = (d, ferry) => ({ hours: d / 45 + (ferry ? 1 : 0), mode: ferry ? T("عبّارة أو سيارة", "Ferry or car") : T("باص أو سيارة", "Bus or car"), cost: { eco: U(Math.max(5, d * 0.05)), mid: U(Math.max(10, d * 0.085)), lux: U(Math.max(35, d * 0.42)) } });
  const flightLeg = (d) => ({ hours: 1 + d / 750, mode: T("طيران", "Flight"), flight: true, cost: { eco: U(35 + d * 0.027), mid: U(55 + d * 0.038), lux: U(115 + d * 0.076) } });
  const hubOf = (c) => (c.code ? c : cityById[c.hub]);

  function travel(a, b) {
    const key = D.id + a.id + ">" + b.id;
    if (travelCache.has(key)) return travelCache.get(key);
    const d = km(a, b);
    let res;
    if (d <= 380) {
      const g = groundLeg(d, (a.island || b.island) && a.hub !== b.id && b.hub !== a.id);
      res = { mode: g.mode, hours: g.hours, cost: g.cost };
    } else {
      const ha = hubOf(a), hb = hubOf(b);
      const legs = [];
      if (ha !== a) legs.push(groundLeg(a.hubKm));
      legs.push(flightLeg(km(ha, hb)));
      if (hb !== b) legs.push(groundLeg(b.hubKm));
      const mode = legs.map((l) => (l.flight ? `${l.mode} ${EN_ON ? `${ha.code}→${hb.code}` : `${ha.code}←${hb.code}`}` : l.mode)).join(T(" ثم ", " then "));
      res = {
        flight: true, mode, hours: legs.reduce((s, l) => s + l.hours, 0) + (legs.length - 1) * 1,
        cost: Object.fromEntries(TIERS.map((t) => [t, legs.reduce((s, l) => s + l.cost[t], 0)])),
      };
    }
    travelCache.set(key, res);
    return res;
  }
  const hoursText = (h) => { const r = Math.round(h); if (EN_ON) return h < 1 ? "under an hour" : h < 1.75 ? "about 1 hour" : `about ${r} hours`; return h < 1 ? "أقل من ساعة" : h < 1.75 ? "حوالي ساعة" : r === 2 ? "حوالي ساعتين" : r <= 10 ? `حوالي ${r} ساعات` : `حوالي ${r} ساعة`; };

  // ---------- الخريطة ----------
  const OUTLINE = "M82.5,5 L117.5,15 L135,37.5 L150,50 L117.5,67.5 L100,90 L95,120 L112.5,140 L115,150 L140,175 L155,185 L172.5,210 L180,242.5 L182.5,260 L180,282.5 L180,290 L175,300 L152.5,315 L127.5,328.75 L117.5,345 L70,372.5 L70,350 L62.5,327.5 L77.5,315 L105,312.5 L110,295 L137.5,280 L140,250 L137.5,220 L140,202.5 L130,182.5 L112.5,172.5 L100,152.5 L90,132.5 L62.5,117.5 L50,105 L67.5,90 L30,72.5 L25,50 L5,30 L12.5,20 L37.5,22.5 L57.5,17.5 Z";
  const ISLAND = "M45,326 Q52,322 53,330 Q52,340 46,338 Q42,332 45,326 Z";
  function XY(c) {
    if (D.id === "vietnam") return { x: (c.lon - 102) * 25, y: (23.5 - c.lat) * 25 };
    const lons = D.cities.map((x) => x.lon), lats = D.cities.map((x) => x.lat);
    const lo = Math.min(...lons), la = Math.max(...lats);
    const sc = Math.min(220 / Math.max(0.5, Math.max(...lons) - lo), 340 / Math.max(0.5, la - Math.min(...lats)));
    return { x: 10 + (c.lon - lo) * sc, y: 20 + (la - c.lat) * sc };
  }
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
      <svg viewBox="-60 0 300 380" role="img" aria-label="${T("خريطة", "Map of")} ${esc(D.name)}">
        ${D.id === "vietnam" ? `<path class="land" d="${OUTLINE}"/><path class="land" d="${ISLAND}"/>` : `<rect class="land" x="-10" y="0" width="260" height="380" rx="24" opacity="0.6"/>`}
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


  // نجوم التقييم مع الكسور
  function starsHTML(r, big) {
    const pct = (r / 5) * 100;
    return `<span class="stars ${big ? "big" : ""}" title="${T("تقييم رحّال", "Wayfarer rating")}: ${r.toFixed(1)} / 5"><span class="st-bg">★★★★★</span><span class="st-fg" style="width:${pct}%">★★★★★</span></span><b class="st-num">${r.toFixed(1)}</b>`;
  }
  function placeCard(p, { showCity = false } = {}) {
    return `
      <button type="button" class="pcard" data-place="${p.key}">
        ${photoBox(p)}
        ${p.gem ? `<span class="gem-badge">💎 ${T("جوهرة مخفية", "Hidden gem")}</span>` : ""}
        <span class="pcard-body">
          ${showCity ? `<span class="pcard-city">${esc(p.city.name)}</span>` : ""}
          <span class="pcard-name">${esc(p.name)}</span>
          <span class="pcard-desc">${esc(p.desc)}</span>
          <span class="pcard-rate">${starsHTML(p.rating)}</span>
          <span class="pcard-meta"><b>${p.fee ? money(p.fee) : T("مجانًا", "Free")}</b><span>⏱ ${esc(p.time)}</span></span>
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
    const title = EN_ON ? info && info.title : info && info.ar;
    if (!title || !el) return;
    let txt = sumCache[title];
    if (txt === undefined) {
      try {
        const u = `https://${EN_ON ? "en" : "ar"}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&exsentences=4&redirects=1&titles=` + encodeURIComponent(title);
        const j = await (await fetch(u)).json();
        const pg = Object.values((j.query || {}).pages || {})[0] || {};
        txt = (pg.extract || "").trim();
      } catch (e) { txt = ""; }
      sumCache[title] = txt;
    }
    if (txt) { el.textContent = txt; el.closest(".about").classList.add("has-wiki"); }
  }

  function openPlace(key) {
    const p = placeByKey[key];
    if (!p) return;
    const info = photoCache[p.wiki] || {};
    const big = info.src ? info.src.replace(/\/\d+px-/, "/1280px-") : "";
    const wikiLink = info.ar && !EN_ON ? `https://ar.wikipedia.org/wiki/${encodeURIComponent(info.ar)}` : p.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(info.title || p.wiki)}` : "";
    pdlg.innerHTML = `
      <div class="dlg-in">
        <button type="button" class="dlg-x" data-close aria-label="${T("إغلاق", "Close")}">✕</button>
        <div class="dlg-ph ${big ? "" : "empty"}">${big ? `<img src="${esc(big)}" alt="${esc(p.name)}">` : `<span class="ph-ico">${ICONS[p.type] || "📍"}</span>`}</div>
        <div class="dlg-body">
          <a class="pcard-city" href="${B()}/city/${p.city.id}" data-close>${esc(p.city.name)}</a>
          <h2>${esc(p.name)}</h2>
          <div class="dlg-rate">${starsHTML(p.rating, true)}<small>${T("تقييم رحّال: رأي تحريري من فريق الموقع، مو من تقييمات الزوار.", "Wayfarer rating: our editorial score, not visitor reviews.")}</small></div>
          ${p.gem ? `<p class="gem-line">💎 ${T("جوهرة مخفية: مكان رائع، وقليل من السياح يعرفونه.", "Hidden gem: a wonderful place that few tourists know about.")}</p>` : ""}
          <div class="about">
            <p class="about-desc">${esc(p.desc)}</p>
            <div class="about-wiki"><span class="about-label">${T("نبذة من ويكيبيديا", "From Wikipedia")}</span><p id="wikiSum"></p></div>
          </div>
          <div class="dlg-facts">
            <div>${T("الدخول", "Entry")}<b>${p.fee ? money(p.fee) : T("مجانًا", "Free")}</b></div>
            <div>${T("الوقت المقترح", "Time needed")}<b>${esc(p.time)}</b></div>
            <div>${T("النوع", "Type")}<b>${ICONS[p.type]} ${esc(D.interests[p.type])}</b></div>
          </div>
          ${wikiLink ? `<p class="dlg-more"><a href="${wikiLink}" target="_blank" rel="noopener">${T(`اقرأ أكثر عنه في ويكيبيديا${info.ar ? "" : " (بالإنجليزي)"}`, "Read more on Wikipedia")}</a></p>` : ""}
          ${info.file ? `<div class="src">${T("الصورة", "Photo")}: <a href="https://en.wikipedia.org/wiki/File:${encodeURIComponent(info.file)}" target="_blank" rel="noopener">Wikimedia Commons</a>${T("، برخصة حرة", ", free licence")}</div>` : ""}
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
  const DEFAULT = { budgetSAR: 6000, days: 7, travelers: 2, interests: [], flights: false };
  // budgetSAR هو المبلغ اللي كتبه المستخدم، وbudgetMode يحدد هل هو للمجموعة (total) أو للشخص (pp)
  const totalSAR = (p) => p.budgetSAR * (p.budgetMode === "pp" ? p.travelers : 1);
  const getPlan = () => { const p = { budgetMode: "total", ...DEFAULT, ...store.get("budgetPlanSAR", {}) }; p.budget = totalSAR(p) * (D ? D.currency.perSAR : 1); return p; };
  const savePlan = (p) => { const { budget, ...rest } = p; const mode = rest.budgetMode || store.get("budgetPlanSAR", {}).budgetMode || "total"; store.set("budgetPlanSAR", { ...rest, budgetMode: mode, budgetSAR: budget / D.currency.perSAR / (mode === "pp" ? rest.travelers : 1) }); };
  const modeSelect = (mode) => `<select name="m" class="mode-sel" aria-label="${T("المبلغ لمين", "Budget is for")}"><option value="total" ${mode !== "pp" ? "selected" : ""}>${T("للمجموعة", "for the group")}</option><option value="pp" ${mode === "pp" ? "selected" : ""}>${T("للشخص", "per person")}</option></select>`;
  const presetsFor = (cur) => (cur === "SAR" ? [3000, 5000, 8000, 12000, 20000] : cur === "USD" ? [800, 1500, 2000, 3000, 5000] : [3000, 5000, 8000, 12000, 20000].map((v) => { const x = v * D.currency.perSAR; const m = 10 ** Math.floor(Math.log10(x)); return Math.round(x / m) * m; }));


  // ---------- عناصر الملصقات ----------
  const TILT = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 0.8];
  const tilt = (i) => TILT[i % TILT.length];
  const cityWiki = (c) => c.wiki || c.en.split(" & ")[0];
  // صورة حقيقية فوق الرسمة: تظهر لما تتحمّل من ويكيبيديا
  const photoOver = (wiki) => (wiki ? `<div class="ph ph-cover" data-wiki="${esc(wiki)}"></div>` : "");
  function posterCard({ href, art, wiki, flag, title, left, right, i = 0, soon }) {
    return `
      <a class="poster ${soon ? "soon" : ""}" ${href ? `href="${href}"` : 'aria-disabled="true"'} style="--r:${tilt(i)}deg">
        ${flag ? `<span class="fl">${flag}</span>` : ""}
        <div class="art">${art}${photoOver(wiki)}</div>
        <h4>${esc(title)}</h4>
        <div class="meta"><span>${left || ""}</span><b>${right || ""}</b></div>
      </a>`;
  }
  function posterHero({ kick, title, sub, lead, body, poster }) {
    return `
      <section class="phero">
        <div class="rays-wrap" aria-hidden="true"><div class="rays"></div></div>
        <div class="wrap phero-in">
          <div class="phero-text hero-in">
            ${kick ? `<div class="kick">${kick}</div>` : ""}
            <h1 class="display">${title}${sub ? `<span>${sub}</span>` : ""}</h1>
            ${lead ? `<p class="lead">${lead}</p>` : ""}
            ${body || ""}
          </div>
          ${poster ? `
          <div class="big-poster">
            <div class="art">${poster.art}${photoOver(poster.wiki)}</div>
            <h2>${esc(poster.title)}</h2>
            <p>${poster.caption}</p>
            ${poster.stamp ? `<span class="stampc">${poster.stamp}</span>` : ""}
          </div>` : ""}
        </div>
      </section>`;
  }
  const selectOpts = (arr, cur, word) => arr.map((d) => `<option ${d === cur ? "selected" : ""} value="${d}">${word(d)}</option>`).join("");
  function ticketForm(id, { amount, unit, days, travelers, go, mode }) {
    return `
      <form class="ticket" id="${id}">
        <label class="f"><small>${T("الميزانية", "Budget")} (${unit}) ${modeSelect(mode)}</small><input name="b" inputmode="numeric" value="${fmt(amount)}" aria-label="${T("الميزانية", "Budget")}"></label>
        <label class="f"><small>${T("المدة", "Trip length")}</small><select name="d">${selectOpts([3, 4, 5, 7, 10, 14, 21], days, dayWord)}</select></label>
        <label class="f"><small>${T("المسافرين", "Travellers")}</small><select name="t">${selectOpts([1, 2, 3, 4, 5, 6, 8], travelers, paxWord)}</select></label>
        <button class="go" type="submit">${go} ${FWD}</button>
      </form>`;
  }
  const readTicket = (f) => ({ b: parseFloat(f.b.value.replace(/[^\d.]/g, "")) || 0, d: +f.d.value, t: +f.t.value, m: f.m.value });

  // ---------- الصفحة الرئيسية: القارات ----------
  const readyIn = (cont) => Object.values(W.countries).filter((c) => c.continent === cont);
  function viewWorld() {
    const st = getPlan();
    const cards = W.continents.map((k, i) => posterCard({
      href: k.open ? `#/${k.id}` : "", soon: !k.open, art: scene(k.scene, true), i,
      title: k.name, left: esc(k.blurb), right: k.open ? T(`${readyIn(k.id).length} دول جاهزة`, `${readyIn(k.id).length} countries ready`) : T("قريبًا", "Coming soon"),
    })).join("");
    app.innerHTML = posterHero({
      kick: T("🌏 دليلك العربي للسفر", "🌏 Travel planning that starts with your budget"),
      title: T("ميزانيتك", "Your budget,"), sub: T("توديك وين؟", "where can it take you?"),
      lead: T("اكتب كم معك، ونطلع لك ملصق لكل دولة تكفيها ميزانيتك: كم يوم، وأي مستوى، وكم يبقى معك.", "Tell us what you can spend, and we'll pin up a poster for every country it covers — how many days, what comfort level, and what you'll have left."),
      body: ticketForm("worldBudget", { amount: Math.round(st.budgetSAR), unit: T("ريال", "SAR"), days: st.days, travelers: st.travelers, mode: st.budgetMode, go: T("وين تكفيني؟", "Where can I go?") }) +
        `<button type="button" class="dice-btn hero-dice" data-surprise>🎲 ${T("فاجئني بدولة وخطة", "Surprise me with a country")}</button>` +
        `<a class="app-chip" href="https://github.com/1097mbnalll-ui/-Public-/releases/latest/download/rahhal.apk" download>🤖 ${T("حمّل تطبيق الأندرويد", "Get the Android app")}</a>`,
      poster: { art: scene("balloons", true), wiki: "Cappadocia", title: T("كبادوكيا", "Cappadocia"), caption: T("🇹🇷 تركيا · بالونات الشروق", "🇹🇷 Türkiye · sunrise balloons"), stamp: T("آسيا<br>7 دول<br>جاهزة", "Asia<br>7 countries<br>ready") },
    }) + `
      <div class="wrap">
        <section class="band">
          <div class="band-head"><div><h2 class="display">${T("اختر قارتك", "Pick a continent")}</h2><p>${T("بدأنا بآسيا، والقارات الباقية جاية.", "We've started with Asia — the rest of the world is on its way.")}</p></div></div>
          <div class="posters">${cards}</div>
        </section>
      </div>`;
    document.getElementById("worldBudget").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = readTicket(e.target);
      store.set("budgetPlanSAR", { ...store.get("budgetPlanSAR", {}), ...(t.b > 0 ? { budgetSAR: t.b } : {}), days: t.d, travelers: t.t, budgetMode: t.m });
      location.hash = "#/asia";
    });
    loadPhotos(app);
  }

  // ---------- فاجئني: دولة عشوائية تناسب الميزانية مع خطة جاهزة ----------
  function surpriseMe(sameCountry) {
    const st = { budgetMode: "total", ...DEFAULT, ...store.get("budgetPlanSAR", {}) };
    let pool = Object.values(W.countries);
    if (sameCountry && D) pool = [W.countries[D.id]];
    else {
      const prev = D;
      const fitting = pool.filter((C) => { setCountry(C); return buildOptions({ ...st, interests: st.interests || [], budget: totalSAR(st) * C.currency.perSAR }).fits.length; });
      if (prev) setCountry(prev);
      if (fitting.length) pool = fitting;
    }
    const C = pool[Math.floor(Math.random() * pool.length)];
    store.set("surprise", 1);
    const target = `#/c/${C.id}/plan`;
    if (location.hash === target) render(); else location.hash = target;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-surprise]");
    if (!b) return;
    e.preventDefault();
    surpriseMe(b.dataset.surprise === "here");
  });

  // ---------- صفحة القارة: الدول ووين تكفي الميزانية ----------
  function viewContinent(cid) {
    const k = W.continents.find((x) => x.id === cid);
    if (!k || !k.open) return viewNotFound();
    const list = W[cid] || [];
    const st = { ...DEFAULT, ...store.get("budgetPlanSAR", {}) };
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <div class="kick"><a href="#/">${T("القارات", "Continents")}</a> ${T("‹", "›")} ${esc(k.name)}</div>
          <h1 class="display">${EN_ON ? `${esc(k.name)} <span class="gold">awaits</span>` : `${esc(k.name)} <span class="gold">بانتظارك</span>`}</h1>
          <p class="lead">${T(`${list.length} دولة غير عربية. ${readyIn(cid).length} منها جاهزة بالكامل، والباقي نضيفها تباعًا.`, `${list.length} non-Arab countries. ${readyIn(cid).length} are fully covered, with more added all the time.`)}</p>
        </div>
        ${passportPicker()}
        <form class="fit-form" id="fitForm" onsubmit="return false">
          <label>${T("ميزانيتي", "My budget")} <input id="fb" inputmode="numeric" value="${fmt(Math.round(st.budgetSAR))}"> ${T("ريال", "SAR")} <select id="fm" class="mode-sel">${modeSelect(st.budgetMode).replace(/^<select[^>]*>|<\/select>$/g, "")}</select></label>
          <label>${T("لمدة", "for")} <select id="fd">${[4, 5, 7, 10, 14].map((d) => `<option ${d === st.days ? "selected" : ""} value="${d}">${dayWord(d)}</option>`).join("")}</select></label>
          <label>${T("لـ", "with")} <select id="ft">${[1, 2, 3, 4, 5, 6].map((d) => `<option ${d === st.travelers ? "selected" : ""} value="${d}">${paxWord(d)}</option>`).join("")}</select></label>
          <label class="toggle-inline"><input type="checkbox" id="ff" ${st.flights ? "checked" : ""}> ${T("شامل الطيران", "incl. flights")}</label>
          <button type="button" class="dice-btn" data-surprise>🎲 ${T("فاجئني بدولة", "Surprise me")}</button>
        </form>
        <div id="fit"></div>
        <section class="band">
          <div class="band-head"><div><h2 class="display">${T("كل الدول", "All countries")}</h2></div></div>
          <div class="countries">${list.map((c) => {
            const ready = !!W.countries[c.id];
            const C = W.countries[c.id];
            return `<a class="country ${ready ? "" : "soon"}" ${ready ? `href="#/c/${c.id}"` : 'aria-disabled="true"'}>
              <span class="flag">${c.flag}</span><span class="cn">${esc(c.name)}</span>
              <span class="cs">${ready ? T(`${C.cities.length} وجهة · ${C.cities.reduce((a, x) => a + x.places.length, 0)} مكان`, `${C.cities.length} destinations · ${C.cities.reduce((a, x) => a + x.places.length, 0)} places`) : T("قريبًا", "Coming soon")}</span></a>`;
          }).join("")}</div>
        </section>
      </div>`;
    const form = document.getElementById("fitForm");
    const fit = document.getElementById("fit");
    const update = () => {
      const s2 = {
        budgetSAR: parseFloat(document.getElementById("fb").value.replace(/[^\d.]/g, "")) || 0,
        days: +document.getElementById("fd").value, travelers: +document.getElementById("ft").value,
        flights: document.getElementById("ff").checked,
        budgetMode: document.getElementById("fm").value,
      };
      store.set("budgetPlanSAR", { ...store.get("budgetPlanSAR", {}), ...s2 });
      const groupSAR = totalSAR(s2);
      const prev = D;
      const rows = readyIn(cid).map((C) => {
        setCountry(C);
        const s = { ...DEFAULT, ...s2, prefs: store.get("budgetPlanSAR", {}).prefs, interests: [], budget: groupSAR * C.currency.perSAR };
        const { fits, over } = buildOptions(s);
        const best = fits[0] || over[0];
        return { C, fits: fits.length, best, total: best ? best.total / C.currency.perSAR : 0, ok: !!fits.length, route: best ? best.route.map((x) => x.short).join(` ${FWD} `) : "", tier: best ? best.tier : "" };
      });
      if (prev) setCountry(prev);
      rows.sort((a, b) => (b.ok - a.ok) || (b.fits - a.fits) || (a.total - b.total));
      const sar = (v) => (EN_ON ? "SAR " + fmt(Math.round(v / 10) * 10) : fmt(Math.round(v / 10) * 10) + " ريال");
      fit.innerHTML = `
        <div class="sec-h"><h2 class="display">${rows.some((r) => r.ok) ? T("تكفيك ميزانيتك في…", "Your budget covers…") : T("أقرب الدول لميزانيتك", "Closest to your budget")}</h2><p>${T("مرتبة من الأنسب لك", "Best match first")}</p></div>
        <div class="posters">${rows.map((r, i) => `
          <a class="poster ${r.ok ? "" : "over"}" href="#/c/${r.C.id}/plan" style="--r:${tilt(i)}deg">
            <span class="fl">${r.C.flag}</span>
            <div class="art">${scene(r.C.scene, true)}</div>
            <h4>${esc(r.C.name)}</h4>
            <p class="pline">${r.ok ? `${optWord(r.fits)} · ${T("أفضلها", "best:")} ${esc(W.tiers[r.tier].name)}` : T(`ما تكفي ${dayWord(s2.days)}`, `Not enough for ${dayWord(s2.days)}`)}<br><small>${esc(r.route)}</small></p>
            <div class="meta"><span>${r.ok ? T("يبقى معك", "Left over") : T("ينقصك", "Short by")}</span><b class="${r.ok ? "" : "neg"}">${sar(Math.abs(groupSAR - r.total))}</b></div>
            <div class="meta pp"><span>${T("على الشخص", "Per person")}</span><b>${sar(r.total / s2.travelers)}</b></div>
            <p class="visa-mini">🛂 ${esc(visaText(r.C)).slice(0, 90)}${visaText(r.C).length > 90 ? "…" : ""}</p>
          </a>`).join("")}</div>`;
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
  }

  // ---------- الرئيسية ----------
  function viewCountry() {
    const plan = getPlan();
    const cards = D.cities.map((c, i) => posterCard({
      href: `${B()}/city/${c.id}`, art: cityScene(c, true), wiki: cityWiki(c), flag: c.emoji, i,
      title: c.name, left: `${c.places.length} ${T("مكان", "places")} · ${dayWord(c.days.ideal)}`, right: `${T("من", "from")} ${money(c.costs.hotel.eco)}`,
    })).join("");

    const picks = D.cities.flatMap((c) => allPlaces.filter((p) => p.city === c && !p.gem).slice(0, D.cities.length > 6 ? 1 : 2)).slice(0, 8);

    const top = D.cities[0];
    app.innerHTML = posterHero({
      kick: `<a href="#/${D.continent}">${T("آسيا", "Asia")}</a> ${T("‹", "›")} ${D.flag}`,
      title: esc(D.name),
      lead: esc(D.tagline),
      body: `
        <div class="paper prep">
          <div class="prep-h"><b class="display">${T("قبل لا تحجز", "Before you book")}</b>${passport() === "sa" ? `<span>🛂 ${esc(D.visaNote)}</span>` : ""}</div>
          ${passportPicker()}
          ${passport() !== "sa" ? `<p class="visa-ye">🛂 ${esc(visaText(D))}</p>` : ""}
          <div class="facts3">
            <div>${T("العملة", "Currency")}<b>${T(`${esc(D.currency.name)} (${fmt(D.currency.perSAR, 2)} = ريال)`, `SAR 1 = ${fmt(D.currency.perSAR, 2)} ${esc(D.currency.name)}`)}</b></div>
            <div>${T("الطيران من السعودية", "Flights from Saudi")}<b>${T(`~${fmt(D.flightSAR)} ريال`, `~SAR ${fmt(D.flightSAR)}`)}</b></div>
            <div>${T("الوجهات", "Destinations")}<b>${T(`${D.cities.length} وجهة · ${allPlaces.length} مكان`, `${D.cities.length} destinations · ${allPlaces.length} places`)}</b></div>
          </div>
        </div>
        <div class="cta-row"><a class="map-cta" href="${B()}/build">🧭 ${T("صمّم رحلتك على ذوقك", "Design your own trip")}</a>${window.MAPS && window.MAPS[D.id] ? `<a class="map-cta" href="${B()}/map">🗺️ ${T("خريطة الأسعار", "Price map")}</a>` : ""}</div>
        ${ticketForm("heroBudget", { amount: Math.round(plan.budget / rate() / (plan.budgetMode === "pp" ? plan.travelers : 1)), unit: curName(), days: plan.days, travelers: plan.travelers, mode: plan.budgetMode, go: T("وريني الخيارات", "Show my options") })}`,
      poster: { art: cityScene(top, true), wiki: cityWiki(top), title: top.name, caption: T(`${top.places.length} مكان · ${dayWord(top.days.ideal)} مقترحة`, `${top.places.length} places · ${dayWord(top.days.ideal)} suggested`), stamp: T(`${D.cities.length}<br>وجهات`, `${D.cities.length}<br>stops`) },
    }) + `
      <div class="wrap">
        <section class="band" id="cities">
          <div class="band-head"><div><h2 class="display">${T("الوجهات", "Destinations")}</h2><p>${T("اضغط على أي ملصق وشوف أماكنه وأسعاره.", "Tap a poster to see its places and prices.")}</p></div></div>
          <div class="posters rail">${cards}</div>
        </section>

        ${allPlaces.some((p) => p.gem) ? `
        <section class="band gems-band">
          <div class="band-head">
            <div><h2 class="display">💎 ${T("جواهر ما يعرفها السياح", "Hidden gems")}</h2><p>${T("أماكن رائعة وموثّقة، لكن أغلب الزوار يفوّتونها.", "Wonderful, well-loved places that most visitors miss.")}</p></div>
          </div>
          <div class="pgrid rail">${allPlaces.filter((p) => p.gem).map((p) => placeCard(p, { showCity: true })).join("")}</div>
        </section>` : ""}

        <section class="band">
          <div class="band-head">
            <div><h2 class="display">${T("أماكن لازم تشوفها", "Don't miss")}</h2><p>${T("اضغط على أي مكان وشوف صورته وتفاصيله.", "Tap any place for photos and details.")}</p></div>
            <a class="btn ghost" href="${B()}/places">${T("كل الأماكن", "All places")} (${allPlaces.length})</a>
          </div>
          <div class="pgrid rail">${picks.map((p) => placeCard(p, { showCity: true })).join("")}</div>
        </section>

        <section class="band">
          <div class="tiles">
            <a class="tile" href="${B()}/before"><div class="ico">🧳</div><h3>${T("قائمة التجهيز", "Trip checklist")}</h3><p>${T("التأشيرة والصرف والشريحة، وأشّر على اللي خلصته.", "Visa, money, SIM — tick things off as you go.")}</p></a>
            <a class="tile" href="${B()}/places"><div class="ico">🕌</div><h3>${T("أكل حلال ومساجد", "Halal food & mosques")}</h3><p>${T("في كل وجهة قسم للمطاعم الحلال والمساجد القريبة.", "Every destination lists halal food and nearby mosques.")}</p></a>
            <div class="tile"><div class="ico">🔎</div><h3>${T("كل رقم له مصدر", "Every number is sourced")}</h3><p>${T("جنب كل سعر مصدره وتاريخ آخر تحقق منه.", "Each price shows where it came from and when it was checked.")}</p></div>
          </div>
        </section>
      </div>`;

    document.getElementById("heroBudget").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = readTicket(e.target);
      savePlan({ ...getPlan(), ...(t.b > 0 ? { budget: t.b * rate() * (t.m === "pp" ? t.t : 1) } : {}), days: t.d, travelers: t.t, budgetMode: t.m });
      location.hash = B() + "/plan";
    });
    loadPhotos(app);
  }

  // ---------- صفحة المدينة ----------
  function viewCity(id) {
    const c = cityById[id];
    if (!c) return viewNotFound();
    const gp = getPlan();
    const ps = allPlaces.filter((p) => p.city === c);
    const avg = ps.reduce((a, p) => a + p.rating, 0) / (ps.length || 1);
    const tops = [...ps].sort((a, b) => b.rating - a.rating).slice(0, 3);
    const rest = ps.filter((p) => !tops.includes(p));
    const types = [...new Set(ps.map((p) => p.type))];
    const TR = { nature: "🏞️", history: "🏛️", beach: "🏖️", food: "🍜", fun: "🎡" };
    const who = [c.interests.fun >= 2 || c.interests.beach >= 2 ? T("👨‍👩‍👧 العوائل", "👨‍👩‍👧 Families") : "", c.interests.beach >= 2 || c.interests.nature >= 3 ? T("💑 الأزواج", "💑 Couples") : "", c.interests.nature >= 3 ? T("🥾 محبي المغامرة", "🥾 Adventurers") : "", c.interests.history >= 3 ? T("🏛️ محبي التاريخ", "🏛️ History lovers") : "", c.interests.food >= 2 ? T("🍜 محبي الأكل", "🍜 Foodies") : "", T("🎒 المسافر بميزانية", "🎒 Budget travellers")].filter(Boolean).slice(0, 4);
    const card = (p, big) => `
      <button type="button" class="cx-pc ${big ? "big" : ""}" data-place="${p.key}" data-type="${p.type}">
        <span class="cx-ph">${photoBox(p)}${p.gem ? `<span class="cx-gem">💎 ${T("جوهرة مخفية", "Hidden gem")}</span>` : ""}<span class="cx-rate">★ ${p.rating.toFixed(1)}</span></span>
        <span class="cx-pb"><small>${ICONS[p.type] || "📍"} ${esc(D.interests[p.type] || "")}</small><b>${esc(p.name)}</b><span class="cx-pd">${esc(p.desc)}</span>
        <span class="cx-pm"><em>${p.fee ? money(p.fee) : T("مجانًا", "Free")}</em><span>⏱ ${esc(p.time)}</span></span></span>
      </button>`;
    const costRow = (ico, label, sub, v) => `<div class="cx-cost">${TIERS.map((t) => `<div data-t="${t}"><span class="cx-ci">${ico}</span><span class="cx-cl"><b>${label}</b><small>${sub}</small></span><span class="cx-cv">${v[t] ? money2(v[t]) : `<span class="sub">${T("مشمول", "Included")}</span>`}</span></div>`).join("")}</div>`;
    const apt = Object.fromEntries(TIERS.map((t) => [t, Math.round(c.costs.hotel[t] * STAY.apt[t])]));
    const room = Object.fromEntries(TIERS.map((t) => [t, Math.round(c.costs.hotel[t] * STAY.room)]));
    const dayTot = Object.fromEntries(TIERS.map((t) => [t, c.costs.hotel[t] / 2 + c.costs.food[t] + c.costs.transport[t]]));
    const near = D.cities.filter((o) => o !== c).map((o) => ({ o, t: travel(c, o) })).sort((a, b) => a.t.hours - b.t.hours).slice(0, 6);
    const nights = gp.startDate && gp.endDate ? tripDays(gp.startDate, gp.endDate) - 1 : 0;

    app.innerHTML = `
      <section class="cx-hero">
        <div class="cx-bg">${cityScene(c, true)}${photoOver(cityWiki(c))}</div><div class="cx-shade"></div>
        <div class="wrap cx-hero-in">
          <nav class="cx-crumb" aria-label="${T("المسار", "Breadcrumb")}"><a href="#/${D.continent}">${T("آسيا", "Asia")}</a><i>›</i><a href="${B()}">${D.flag} ${esc(D.name)}</a><i>›</i><span>${esc(c.short || c.name)}</span></nav>
          <h1>${esc(c.name)}</h1>
          <p class="cx-lead">${esc(c.summary)}</p>
          <div class="cx-stats">
            <div><b>★ ${avg.toFixed(1)}</b><small>${T("تقييم الأماكن", "Avg. rating")}</small></div>
            <div><b>${ps.length}</b><small>${T("مكان للزيارة", "places to see")}</small></div>
            <div><b>${dayWord(c.days.ideal)}</b><small>${T("المدة المقترحة", "suggested stay")}</small></div>
            <div><b>${money(c.costs.hotel.eco)}</b><small>${T("الليلة من", "per night from")}</small></div>
          </div>
          <div class="cx-actions"><a class="cx-btn p" href="${B()}/build">🧭 ${T("خطط رحلة هنا", "Plan a trip here")}</a>${window.MAPS && window.MAPS[D.id] ? `<a class="cx-btn g" href="${B()}/map">🗺️ ${T("على الخريطة", "On the map")}</a>` : ""}</div>
        </div>
      </section>
      <div class="cx-sheet">
        <nav class="cx-tabs" id="cxTabs"><div class="wrap">
          ${[["over", T("نظرة سريعة", "Overview")], ["places", T("الأماكن", "Places")], ["costs", T("التكاليف", "Costs")], ["stay", T("وين تسكن", "Where to stay")], ["halal", T("الحلال", "Halal")], ["move", T("التنقل", "Getting around")]].map(([k, l], i) => `<a href="#cx-${k}" data-tab="${k}" class="${i ? "" : "on"}">${l}</a>`).join("")}
        </div></nav>
        <div class="wrap cx-grid">
          <div class="cx-main">
            <section class="cx-sec" id="cx-over">
              <h2>${T("نظرة سريعة", "At a glance")}</h2>
              <div class="cx-traits">${Object.keys(D.interests).map((k) => `<div class="cx-tr"><span>${TR[k] || ICONS[k]} ${esc(D.interests[k])}</span><span class="cx-bar">${[1, 2, 3].map((n) => `<i class="${(c.interests[k] || 0) >= n ? "on" : ""}"></i>`).join("")}</span></div>`).join("")}</div>
              <div class="cx-duo">
                <div class="cx-box"><small>🌤️ ${T("أفضل وقت للزيارة", "Best time to visit")}</small><p>${esc(c.bestTime)}</p></div>
                <div class="cx-box"><small>👥 ${T("مناسبة لـ", "Great for")}</small><div class="cx-chips">${who.map((w) => `<span>${w}</span>`).join("")}</div></div>
              </div>
            </section>

            <section class="cx-sec" id="cx-places">
              <div class="cx-h"><h2>${T("وش تزور؟", "What to see")} <small>${ps.length} ${T("مكان", "places")}</small></h2><a class="cx-more" href="${B()}/places">${T("كل أماكن", "All places in")} ${esc(D.name)} ›</a></div>
              <h3 class="cx-sub">⭐ ${T("لا تفوّتها", "Don't miss")}</h3>
              <div class="cx-top">${tops.map((p) => card(p, true)).join("")}</div>
              ${rest.length ? `
              <div class="cx-filter" role="tablist">${["all", ...types].map((t, i) => `<button type="button" class="${i ? "" : "on"}" data-f="${t}">${t === "all" ? T("الكل", "All") : `${ICONS[t]} ${esc(D.interests[t])}`}</button>`).join("")}</div>
              <div class="cx-pgrid" id="cxGrid">${rest.map((p) => card(p)).join("")}</div>` : ""}
            </section>

            <section class="cx-sec" id="cx-costs">
              <div class="cx-h"><h2>${T("كم تكلف؟", "What it costs")}</h2>
                <div class="cx-seg" role="radiogroup">${TIERS.map((t) => `<button type="button" data-tier="${t}" class="${t === "mid" ? "on" : ""}">${D.tiers[t].name}</button>`).join("")}</div></div>
              <div class="cx-costs" data-tier="mid">
                ${costRow("🏨", T("فندق", "Hotel"), T("لليلة، غرفة لشخصين", "per night, room for two"), c.costs.hotel)}
                ${costRow("🏠", T("شقة Airbnb كاملة", "Whole Airbnb flat"), T("لليلة، تكفي 4 · تقدير", "per night, sleeps 4 · est."), apt)}
                ${costRow("🛏️", T("غرفة خاصة في Airbnb", "Private Airbnb room"), T("لليلة · تقدير", "per night · est."), room)}
                ${costRow("🍽️", T("الأكل", "Food"), T("للشخص في اليوم", "per person per day"), c.costs.food)}
                ${costRow("🚕", T("التنقل داخل المدينة", "Getting around"), T("للشخص في اليوم", "per person per day"), c.costs.transport)}
                <div class="cx-day">${TIERS.map((t) => `<div data-t="${t}"><span>${T("يوم نموذجي للشخص (سكن مشترك + أكل + تنقل)", "A typical day per person (shared room + food + transport)")}</span><b>${money(dayTot[t])}</b></div>`).join("")}</div>
              </div>
              <p class="cx-note">${c.costs.note ? esc(c.costs.note) + " " : ""}${D.tiers.mid.desc ? "" : ""}</p>
              ${src(c.costs.src, c.costs.date, "numbeo")}
            </section>

            <section class="cx-sec" id="cx-stay">
              <h2>${T("وين تسكن؟", "Where to stay")}</h2>
              <div class="cx-areas">${c.stayAreas.map((a, i) => `<div class="cx-area"><span class="cx-n">${i + 1}</span><div><b>${esc(a.name)}</b><p>${esc(a.desc)}</p></div></div>`).join("")}</div>
            </section>

            <section class="cx-sec" id="cx-halal">
              <h2>${T("الأكل الحلال والمساجد", "Halal food & mosques")}</h2>
              <div class="cx-box cx-halal"><p>🍽️ ${esc(c.halal.food)}</p>
                ${c.halal.mosques.length ? `<ul>${c.halal.mosques.map((m) => `<li><span>🕌</span><div><b>${esc(m.name)}</b><small>${esc(m.note)}</small></div></li>`).join("")}</ul>` : `<p class="cx-muted">${T("ما فيه مساجد معروفة قريبة من مناطق السياح.", "No well-known mosques near the tourist areas.")}</p>`}
                ${src(c.halal.src, c.halal.date)}</div>
            </section>

            <section class="cx-sec" id="cx-move">
              <h2>${T("التنقل", "Getting around")}</h2>
              <ul class="cx-move">${c.transport.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
              <h3 class="cx-sub">${T(`أقرب الوجهات من ${esc(c.short || c.name)}`, `Nearest stops from ${esc(c.short || c.name)}`)}</h3>
              <div class="cx-near">${near.map(({ o, t }) => `<a href="${B()}/city/${o.id}" class="cx-nc"><span class="cx-nph">${cityScene(o, true)}</span><span><b>${esc(o.short || o.name)}</b><small>${t.flight ? "✈️" : "🚐"} ${hoursText(t.hours)} · ${T("من", "from")} ${money(t.cost.eco)}</small></span></a>`).join("")}</div>
              <p class="cx-note">${T("المدد والأسعار تقديرية محسوبة من المسافة.", "Times and prices are estimates based on distance.")}</p>
            </section>
          </div>

          <aside class="cx-side">
            <div class="cx-book">
              <small>${T("السكن في", "Stays in")} ${esc(c.short || c.name)}</small>
              <div class="cx-from"><b>${money(c.costs.hotel.eco)}</b> <span>– ${money(c.costs.hotel.lux)} ${T("لليلة", "a night")}</span></div>
              ${gp.startDate && gp.endDate ? `<div class="cx-dates">📅 ${niceDate(gp.startDate)} – ${niceDate(gp.endDate)}${nights > 0 ? ` · ${nights} ${T("ليالي", "nights")}` : ""}</div>` : `<div class="cx-dates">📅 <a href="${B()}/plan">${T("حدد تواريخ رحلتك", "Set your travel dates")}</a></div>`}
              <div class="cx-bl">${bookingLinks(c, gp.travelers, gp.startDate, gp.endDate)}</div>
              <a class="cx-btn p wide" href="${B()}/plan">${T("كم تكفيني ميزانيتي؟", "What will my budget cover?")}</a>
              <dl>
                <div><dt>✈️ ${T("أقرب مطار", "Nearest airport")}</dt><dd>${c.code ? `<span dir="ltr">${esc(c.code)}</span>` : `${esc(cityById[c.hub].short || cityById[c.hub].name)} (${hoursText(c.hubKm / 45)})`}</dd></div>
                <div><dt>🗺️ ${T("المنطقة", "Region")}</dt><dd>${esc(c.region)}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>`;

    // التبويبات: تمرير ناعم وتحديد القسم الحالي
    const tabs = document.getElementById("cxTabs");
    tabs.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-tab]"); if (!a) return;
      e.preventDefault();
      const sec = document.getElementById("cx-" + a.dataset.tab);
      window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - (tabs.offsetHeight + (window.innerWidth > 560 ? 90 : 70)), behavior: reduced ? "auto" : "smooth" });
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { const k = en.target.id.slice(3); tabs.querySelectorAll("a").forEach((x) => x.classList.toggle("on", x.dataset.tab === k)); const on = tabs.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest", inline: "center" }); } }), { rootMargin: "-40% 0px -55% 0px" });
      app.querySelectorAll(".cx-sec").forEach((x) => io.observe(x));
    }
    // فلتر الأماكن
    const grid = document.getElementById("cxGrid");
    app.querySelector(".cx-filter")?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-f]"); if (!b) return;
      app.querySelectorAll(".cx-filter button").forEach((x) => x.classList.toggle("on", x === b));
      grid.querySelectorAll(".cx-pc").forEach((x) => { x.hidden = b.dataset.f !== "all" && x.dataset.type !== b.dataset.f; });
    });
    // مستوى التكاليف
    app.querySelector(".cx-seg").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-tier]"); if (!b) return;
      app.querySelectorAll(".cx-seg button").forEach((x) => x.classList.toggle("on", x === b));
      app.querySelector(".cx-costs").dataset.tier = b.dataset.tier;
    });
    loadPhotos(app);
  }

  // ---------- كل الأماكن ----------
  function viewPlaces() {
    const f = store.get("placeFilter", { city: "", types: [], free: false, q: "" });
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">${T("كل الأماكن", "All places")}</h1>
          <p class="lead">${T(`${allPlaces.length} مكان في ${D.cities.length} وجهة. اضغط على أي مكان وشوف صورته وتفاصيله.`, `${allPlaces.length} places across ${D.cities.length} destinations. Tap any of them for photos and details.`)}</p>
        </div>
        <div class="filters">
          <input type="search" id="fq" placeholder="${T("ابحث عن مكان…", "Search places…")}" value="${esc(f.q)}" aria-label="${T("بحث", "Search")}">
          <select id="fc" aria-label="${T("الوجهة", "Destination")}"><option value="">${T("كل الوجهات", "All destinations")}</option>${D.cities.map((c) => `<option value="${c.id}" ${f.city === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
          <div class="chips">
            ${Object.entries(D.interests).map(([k, v]) => `<label class="chip"><input type="checkbox" name="ft" value="${k}" ${f.types.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("")}
            <label class="chip"><input type="checkbox" id="ff" ${f.free ? "checked" : ""}><span>💸 ${T("مجانية فقط", "Free only")}</span></label>
            <label class="chip"><input type="checkbox" id="fsort" ${f.sort ? "checked" : ""}><span>⭐ ${T("الأعلى تقييمًا", "Top rated")}</span></label>
            <label class="chip"><input type="checkbox" id="fgem" ${f.gem ? "checked" : ""}><span>💎 ${T("جواهر مخفية", "Hidden gems")}</span></label>
          </div>
        </div>
        <p class="count-line" id="fcount"></p>
        <div class="pgrid" id="plist"></div>
        <button type="button" class="dp-more" id="pmore" hidden></button>
      </div>`;
    const list = document.getElementById("plist"), moreBtn = document.getElementById("pmore");
    const apply = () => {
      const st = {
        q: document.getElementById("fq").value.trim(),
        city: document.getElementById("fc").value,
        types: [...app.querySelectorAll("input[name=ft]:checked")].map((i) => i.value),
        free: document.getElementById("ff").checked,
        gem: document.getElementById("fgem").checked,
        sort: document.getElementById("fsort").checked,
      };
      store.set("placeFilter", st);
      const res = allPlaces.filter((p) =>
        (!st.city || p.city.id === st.city) &&
        (!st.types.length || st.types.includes(p.type)) &&
        (!st.free || !p.fee) &&
        (!st.gem || p.gem) &&
        (!st.q || (p.name + p.desc + p.city.name).includes(st.q)));
      document.getElementById("fcount").textContent = res.length ? `${res.length} ${T("مكان", "places")}` : T("ما لقينا أماكن بهالفلتر. جرّب تشيل بعض الخيارات.", "Nothing matches these filters. Try removing a few.");
      if (st.sort) res.sort((a, b) => b.rating - a.rating);
      let shown = 0;
      const more = () => {
        const next = res.slice(shown, shown + 24);
        list.insertAdjacentHTML("beforeend", next.map((p) => placeCard(p, { showCity: !st.city })).join(""));
        shown += next.length;
        moreBtn.hidden = shown >= res.length;
        moreBtn.textContent = T(`عرض المزيد (${res.length - shown})`, `Show more (${res.length - shown})`);
        loadPhotos(list);
      };
      list.innerHTML = "";
      moreBtn.onclick = more;
      more();
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
      ${bi === 0 && passport() !== "sa" ? `<div class="check-card visa-card"><h2><span>🛂 ${T("تأشيرتك", "Your visa")} — ${PASS.find((x) => x[0] === passport())[1]}</span></h2><p>${esc(visaText(D))}</p><div class="src">${T("المصدر", "Source")}: <a href="https://en.wikipedia.org/wiki/Visa_requirements_for_Yemeni_citizens" target="_blank" rel="noopener">${T("ويكيبيديا: متطلبات التأشيرة لليمنيين", "Wikipedia: visa requirements for Yemeni citizens")}</a>، <a href="https://www.passportindex.org/passport/yemen/" target="_blank" rel="noopener">Passport Index</a>. ${T("تتغير كثير، فتأكد من السفارة.", "Rules change often — confirm with the embassy.")}</div></div>` : ""}
      <div class="check-card" data-card="${bi}">
        <h2><span>${b.icon} ${esc(b.title)}</span><small data-count="${bi}"></small></h2>
        ${b.points.map((p, pi) => `<label class="check"><input type="checkbox" data-k="${bi}-${pi}" ${done[bi + "-" + pi] ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}
        ${src(b.src, b.date, b.src2)}
      </div>`).join("");
    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">${T("جهّز شنطتك", "Pack your bags")}</h1>
          <p class="lead">${T("كل اللي تحتاج تعرفه قبل السفر. أشّر على اللي خلصته، والقائمة تنحفظ على جهازك.", "Everything to sort out before you fly. Tick items off — your list is saved on this device.")}</p>
          ${passportPicker()}
        </div>
        <div class="progress"><div class="bar"><i id="bar"></i></div><span id="pct"></span></div>
        <div class="checklist">${blocks}</div>
      </div>`;
    const paint = () => {
      const n = Object.values(done).filter(Boolean).length;
      document.getElementById("bar").style.width = (n / total) * 100 + "%";
      document.getElementById("pct").textContent = `${n} ${T("من", "of")} ${total}`;
      D.before.forEach((b, bi) => {
        const c = b.points.filter((_, pi) => done[bi + "-" + pi]).length;
        app.querySelector(`[data-count="${bi}"]`).textContent = c === b.points.length ? T("تم ✓", "Done ✓") : `${c} / ${b.points.length}`;
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
  // السكن: فندق (غرفة لكل شخصين)، شقة Airbnb كاملة (تكفي 4)، أو غرفة خاصة في Airbnb. أسعار Airbnb تقديرية مشتقة من أسعار الفنادق
  const STAY = { hotel: 1, apt: { eco: 1.15, mid: 1.05, lux: 0.9 }, room: 0.7 };
  function lodging(c, tier, stay, travelers) {
    if (stay === "apt") return c.costs.hotel[tier] * STAY.apt[tier] * Math.ceil(travelers / 4);
    if (stay === "room") return c.costs.hotel[tier] * STAY.room * Math.ceil(travelers / 2);
    return c.costs.hotel[tier] * Math.ceil(travelers / 2);
  }
  const PREF_KEYS = ["hotel", "food", "transport"];
  const sameTiers = (t) => t.hotel === t.food && t.food === t.transport;
  function tiersLabel(t, short) {
    if (sameTiers(t)) return D.tiers[t.hotel].name;
    const ic = { hotel: "🏨", food: "🍽️", transport: "🚕" };
    return PREF_KEYS.map((k) => `${ic[k]} ${D.tiers[t[k]].name}`).join(short ? " " : " · ");
  }
  // الجواز: سعودي، يمني، أو يمني مقيم في السعودية
  const PASS = [["sa", T("🇸🇦 سعودي", "🇸🇦 Saudi")], ["ye", T("🇾🇪 يمني", "🇾🇪 Yemeni")], ["res", T("🇾🇪 يمني مقيم بالسعودية", "🇾🇪 Yemeni, Saudi resident")]];
  const passport = () => store.get("passport", "sa");
  function visaText(c) {
    const pp = passport();
    if (pp === "sa") return c.visaNote;
    const v = window.VISA_YE && window.VISA_YE[c.id];
    return v ? v[pp][EN_ON ? 1 : 0] : T("تأكد من السفارة.", "Check with the embassy.");
  }
  function passportPicker() {
    return `<div class="pass-pick" role="radiogroup" aria-label="${T("جوازك", "Your passport")}"><span>${T("جوازك:", "Passport:")}</span>${PASS.map(([v, l]) => `<label><input type="radio" name="passport" value="${v}" ${passport() === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
  }
  document.addEventListener("change", (e) => {
    if (e.target.name !== "passport") return;
    store.set("passport", e.target.value);
    const y = window.scrollY; render(); window.scrollTo({ top: y, behavior: "instant" });
  });
  // التواريخ بصيغة YYYY-MM-DD
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseDate = (v) => { if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (v, n) => { const d = parseDate(v); d.setDate(d.getDate() + n); return isoDate(d); };
  const niceDate = (v) => parseDate(v).toLocaleDateString(EN_ON ? "en-GB" : "ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short" });
  const tripDays = (a, b) => { const x = parseDate(a), y = parseDate(b); return x && y && y >= x ? Math.round((y - x) / 864e5) + 1 : 0; };

  function bookingLinks(c, travelers, checkin, checkout) {
    const ce = (window.EN_DATA && window.EN_DATA.asia && window.EN_DATA.asia[D.id]) || "";
    const q = cityWiki(c) + (ce ? ", " + ce : "");
    const dates = checkin && checkout && checkout > checkin;
    const b = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}&group_adults=${travelers}&no_rooms=${Math.ceil(travelers / 2)}${dates ? `&checkin=${checkin}&checkout=${checkout}` : ""}`;
    const a = `https://www.airbnb.com/s/${encodeURIComponent(q)}/homes?adults=${travelers}${dates ? `&checkin=${checkin}&checkout=${checkout}` : ""}`;
    return `<span class="book-links"><a href="${b}" target="_blank" rel="noopener">Booking ↗</a><a href="${a}" target="_blank" rel="noopener">Airbnb ↗</a></span>`;
  }

  function planRoute(route, { days, tier, tiers, stay = "hotel", interests, travelers, hotelNight = 0, fixed = null, pace = 2, must = null }) {
    tiers = { ...(tiers || { hotel: tier, food: tier, transport: tier }) };
    // المستخدم حدد أيام كل مدينة بنفسه
    if (fixed) days = route.reduce((a, c) => a + fixed[c.id], 0);
    if (!fixed && route.reduce((s, c) => s + c.days.min, 0) > days) return null;
    const alloc = new Map(route.map((c) => [c, fixed ? fixed[c.id] : c.days.min]));
    let left = fixed ? 0 : days - route.reduce((s, c) => s + c.days.min, 0);
    const byScore = [...route].sort((a, b) => score(b, interests) - score(a, interests));
    for (const extra of [0, 3, 30]) {
      let moved = true;
      while (left > 0 && moved) {
        moved = false;
        for (const c of byScore) if (left > 0 && alloc.get(c) < c.days.ideal + extra && (extra < 30 || alloc.get(c) < c.places.length)) { alloc.set(c, alloc.get(c) + 1); left--; moved = true; }
      }
    }
    if (left > 0) alloc.set(byScore[0], alloc.get(byScore[0]) + left);

    // ميزانية فنادق يحددها المستخدم: سعر ثابت لليلة لكل المجموعة، ونعرض أقرب مستوى يقابله
    if (hotelNight > 0) {
      const nightsAt = (t) => route.reduce((a, c) => a + lodging(c, t, stay, travelers) * alloc.get(c), 0) / days;
      tiers.hotel = ["lux", "mid", "eco"].find((t) => nightsAt(t) <= hotelNight * 1.05) || "eco";
    }
    const plan = [];
    let dayNo = 0, fees = 0, food = 0, local = 0, inter = 0, hotel = 0;
    route.forEach((c, ci) => {
      const n = alloc.get(c);
      const isMust = (p) => (must && must.has(p.key) ? 2 : 0);
      const pool = c.places.map((p, i) => ({ ...p, key: D.id + ":" + c.id + ":" + i })).filter((p) => p.planner !== false || isMust(p))
        .sort((a, b) => (isMust(b) + (interests.includes(b.type) ? 1 : 0)) - (isMust(a) + (interests.includes(a.type) ? 1 : 0)));
      const slotsOf = (p) => (p.time.includes("يوم كامل") || p.time === "Full day" ? 2 : 1);
      const tr = ci > 0 ? travel(route[ci - 1], c) : null;
      if (tr) inter += tr.cost[tiers.transport];
      for (let d = 0; d < n; d++) {
        dayNo++;
        const last = dayNo === days;
        let slots = pace, dayFees = 0;
        const items = [];
        if (d === 0 && tr) slots = tr.hours > 5 ? 0 : Math.max(1, pace - 1);
        if (d === 0 && ci === 0) { items.push({ t: T("الوصول والاستقرار في الفندق", "Arrive and check in"), k: "in" }); slots = 1; }
        if (last) slots = Math.min(slots, 1);
        while (slots > 0 && pool.length) {
          const k = pool.findIndex((p) => slotsOf(p) <= slots);
          if (k < 0) break;
          const p = pool.splice(k, 1)[0];
          slots -= slotsOf(p);
          fees += p.fee; dayFees += p.fee;
          items.push({ p });
          if (must && must.has(p.key)) p.must = true;
        }
        if (slots > 0 && !items.length) items.push({ t: T("يوم حر: تسوق وراحة وتجربة أكل محلي", "Free day: shopping, rest and local food"), k: "free" });
        if (last) items.push({ t: T("المغادرة", "Departure"), k: "out" });
        const night = last ? 0 : hotelNight > 0 ? hotelNight : lodging(c, tiers.hotel, stay, travelers);
        const cost = { hotel: night, food: c.costs.food[tiers.food] * travelers, local: c.costs.transport[tiers.transport] * travelers, fees: dayFees * travelers, inter: d === 0 && tr ? tr.cost[tiers.transport] * travelers : 0 };
        plan.push({ day: dayNo, city: c, items, travel: d === 0 && tr ? { from: route[ci - 1], ...tr } : null, newCity: d === 0, cost });
        food += c.costs.food[tiers.food];
        local += c.costs.transport[tiers.transport];
        hotel += night;
      }
    });
    const parts = {
      hotel, food: food * travelers, local: local * travelers, fees: fees * travelers, inter: inter * travelers,
      visa: D.visaSAR * D.currency.perSAR * travelers,
      flights: 0,
    };
    const mustLeft = must ? [...must].filter((k) => route.some((c) => k.startsWith(D.id + ":" + c.id + ":")) && !plan.some((d) => d.items.some((it) => it.p && it.p.key === k))).length : 0;
    return { route, alloc, plan, parts, tier: tier || tiers.hotel, tiers, stay, hotelNight, days, mustLeft };
  }
  const totalOf = (r, flights, travelers) => Object.values(r.parts).reduce((a, b) => a + b, 0) + (flights ? D.flightSAR * D.currency.perSAR * travelers : 0);

  function candidates(days, interests) {
    const k = Math.max(1, Math.min(6, D.cities.length, Math.round(days / 3)));
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

  // سعر الليلة المحدد من المستخدم بالعملة المحلية (لكل المجموعة)، أو 0 = تلقائي
  function hotelNightOf(s) {
    const p = s.prefs || {};
    if (!p.hotelMode || p.hotelMode === "auto" || !(p.hotelSAR > 0)) return 0;
    const v = p.hotelSAR * D.currency.perSAR;
    return p.hotelMode === "total" ? v / Math.max(1, s.days - 1) : v;
  }
  function buildOptions(s) {
    const budget = s.budget;
    const fits = [], over = [];
    for (const route of candidates(s.days, s.interests)) {
      // كل مستوى يناسب الميزانية خيار مستقل
      // كل بند (سكن، أكل، تنقل) إما محدد من المستخدم أو تلقائي يتغير مع المستوى
      const pref = s.prefs || {};
      const hotelNight = hotelNightOf(s);
      let cheapest = null, any = false;
      const tried = new Set();
      for (const tier of ["lux", "mid", "eco"]) {
        const tiers = Object.fromEntries(PREF_KEYS.map((k) => [k, pref[k] && pref[k] !== "auto" ? pref[k] : tier]));
        const key = PREF_KEYS.map((k) => (k === "hotel" && hotelNight ? "custom" : tiers[k])).join("-");
        if (tried.has(key)) continue;
        tried.add(key);
        const r = planRoute(route, { ...s, tier, tiers, stay: pref.stay || "hotel", hotelNight });
        if (!r) break;
        r.total = totalOf(r, s.flights, s.travelers);
        cheapest = r;
        if (r.total <= budget) { fits.push(r); any = true; }
      }
      if (!any && cheapest) over.push(cheapest);
    }
    const tierRank = { lux: 3, mid: 2, eco: 1 };
    const value = (r) => r.route.reduce((a, c) => a + score(c, s.interests) * r.alloc.get(c), 0) / s.days + PREF_KEYS.reduce((a, k) => a + tierRank[r.tiers[k]], 0) * 0.4 + r.route.length * 0.15;
    fits.sort((a, b) => value(b) - value(a));
    over.sort((a, b) => a.total - b.total);
    return { fits, over };
  }

  // كم يوم تكفي الميزانية في كل وجهة
  function daysAffordable(c, s) {
    const rooms = Math.ceil(s.travelers / 2);
    const avgFee = c.places.slice(0, 6).reduce((a, p) => a + p.fee, 0) / 6;
    const entry = c.code ? 0 : groundLeg(c.hubKm).cost.mid * s.travelers;
    const fixed = D.visaSAR * D.currency.perSAR * s.travelers + (s.flights ? D.flightSAR * D.currency.perSAR * s.travelers : 0) + entry;
    return Object.fromEntries(TIERS.map((t) => {
      const daily = c.costs.hotel[t] * rooms + s.travelers * (c.costs.food[t] + c.costs.transport[t] + avgFee);
      return [t, Math.max(0, Math.floor((s.budget - fixed) / daily))];
    }));
  }

  // ---------- صفحة الميزانية ----------
  function viewPlan(preset) {
    const s = getPlan();
    if (preset >= 3 && preset <= 21) s.days = preset;
    const amount = Math.round(s.budget / rate() / (s.budgetMode === "pp" ? s.travelers : 1));
    app.innerHTML = `
      <section class="tm">
        <div class="tm-win" aria-hidden="true">${"<div></div>".repeat(6)}</div>
        <div class="tm-sun" aria-hidden="true"></div>
        <svg class="tm-plane" viewBox="0 0 200 80" aria-hidden="true"><path d="M8 44 C40 40 120 36 168 34 C186 33 196 38 196 42 C196 46 186 50 168 50 L60 52 Z" fill="#fff"/><path d="M100 40 L70 6 L84 6 L132 39Z M100 48 L74 76 L88 76 L130 49Z" fill="#e8eef0"/><path d="M14 44 L4 22 L16 22 L34 42Z" fill="#e4572e"/><circle cx="182" cy="40" r="3" fill="#0f3d3e"/><rect x="120" y="38" width="44" height="3" rx="1.5" fill="#9fb7ba"/></svg>
        <div class="tm-trail" aria-hidden="true"></div>
        <div class="tm-runway" aria-hidden="true"></div><div class="tm-floor" aria-hidden="true"></div>
        <div class="tm-in">
          <span class="tm-gate">${T("صالة المغادرة", "Departures hall")} · ${D.flag} <b>${esc(D.name)}</b></span>
          <h1>${T("رحلتك جاهزة للإقلاع", "Your trip is ready for take-off")}</h1>
          <p class="tm-lead" id="tmLead"></p>
          <a class="tm-build" href="${B()}/build">🧭 ${T("أو صمّم رحلتك على ذوقك", "Or design your own trip")}</a>
          <div class="lug" id="lugTag"></div>
        </div>
      </section>
      <div class="wrap dp-wrap"><div class="result" id="result"></div></div>
      <div class="drawer-bg" id="drawerBg"></div>
      <aside class="drawer" id="tripDrawer" aria-label="${T("عدّل الحجز", "Edit booking")}">
        <div class="drawer-hd"><b>✏️ ${T("عدّل الحجز", "Edit booking")}</b><button type="button" class="drawer-x" id="drawerX" aria-label="${T("إغلاق", "Close")}">✕</button></div>
          <form class="form" id="planForm" onsubmit="return false">
            <div class="dice-row">
              <button type="button" class="dice-btn" data-surprise="here">🎲 ${T("خطة عشوائية هنا", "Random plan here")}</button>
              <button type="button" class="dice-btn" data-surprise>🌏 ${T("دولة عشوائية", "Random country")}</button>
            </div>
            <div class="field">
              <label for="budget">${T("الميزانية", "Budget")} <output>${curName()}</output></label>
              <div class="seg" role="radiogroup" aria-label="${T("المبلغ لمين", "Budget is for")}">
                <label><input type="radio" name="bmode" value="total" ${s.budgetMode !== "pp" ? "checked" : ""}><span>${T("للمجموعة كاملة", "For the whole group")}</span></label>
                <label><input type="radio" name="bmode" value="pp" ${s.budgetMode === "pp" ? "checked" : ""}><span>${T("للشخص الواحد", "Per person")}</span></label>
              </div>
              <input class="money-in" id="budget" inputmode="numeric" value="${fmt(amount)}">
              <div class="chips" style="margin-top:10px">${presetsFor(currency).map((v) => `<button type="button" class="chip-btn" data-b="${v}">${fmt(v)}</button>`).join("")}</div>
            </div>
            <div class="field">
              <span class="label">${T("موعد السفر", "Travel dates")} <small class="hint" style="margin:0">${T("اختياري", "optional")}</small></span>
              <div class="date-row">
                <label><small>${T("من", "From")}</small><input type="date" id="dStart" value="${s.startDate || ""}" min="${isoDate(new Date())}"></label>
                <label><small>${T("إلى", "To")}</small><input type="date" id="dEnd" value="${s.endDate || ""}" min="${s.startDate || isoDate(new Date())}"></label>
                <button type="button" class="date-clear" id="dClear" aria-label="${T("مسح التاريخ", "Clear dates")}">✕</button>
              </div>
              <small class="hint" id="dHint"></small>
            </div>
            <div class="field">
              <label for="days">${T("مدة الرحلة", "Trip length")} <output id="daysOut"></output></label>
              <input type="range" id="days" min="3" max="21" value="${s.days}">
            </div>
            <div class="field">
              <label for="travelers">${T("عدد المسافرين", "Travellers")} <output id="trOut"></output></label>
              <input type="range" id="travelers" min="1" max="8" value="${s.travelers}">
            </div>
            <div class="field">
              <span class="label">${T("وش تحب؟", "What do you enjoy?")} <small class="hint" style="margin:0">${T("اختياري", "optional")}</small></span>
              <div class="chips">${Object.entries(D.interests).map(([k, v]) => `<label class="chip"><input type="checkbox" name="interest" value="${k}" ${s.interests.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("")}</div>
            </div>
            <div class="field prefs">
              <span class="label">${T("وزّع ميزانيتك على كيفك", "Spend where it matters to you")}</span>
              <div class="pref-presets">
                <button type="button" class="chip-btn" data-preset="foodie">🍽️ ${T("أكل رهيب وفندق رخيص", "Great food, cheap hotel")}</button>
                <button type="button" class="chip-btn" data-preset="comfort">🏨 ${T("سكن وتنقل فخم، أكل بسيط", "Plush stay & rides, simple food")}</button>
                <button type="button" class="chip-btn" data-preset="ride">🚕 ${T("تنقل مريح والباقي اقتصادي", "Comfy transport, rest budget")}</button>
                <button type="button" class="chip-btn" data-preset="auto">↺ ${T("تلقائي", "Auto")}</button>
              </div>
              ${[["hotel", T("🏨 السكن", "🏨 Stay")], ["food", T("🍽️ الأكل", "🍽️ Food")], ["transport", T("🚕 التنقل", "🚕 Getting around")]].map(([k, lbl]) => `
              <div class="pref-row"><span>${lbl}</span><div class="seg mini">${["auto", "eco", "mid", "lux"].map((t) => `<label><input type="radio" name="p_${k}" value="${t}" ${(s.prefs && s.prefs[k] || "auto") === t ? "checked" : ""}><span>${t === "auto" ? T("تلقائي", "Auto") : D.tiers[t].name}</span></label>`).join("")}</div></div>`).join("")}
              <div class="pref-row"><span>${T("نوع السكن", "Stay type")}</span><div class="seg mini">${[["hotel", T("فندق", "Hotel")], ["apt", T("شقة Airbnb", "Airbnb flat")], ["room", T("غرفة Airbnb", "Airbnb room")]].map(([v, l]) => `<label><input type="radio" name="p_stay" value="${v}" ${(s.prefs && s.prefs.stay || "hotel") === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
              <div class="hb">
                <span class="hb-t">💰 ${T("ميزانية الفنادق", "Hotel budget")}</span>
                <div class="seg mini">${[["auto", T("تلقائي", "Auto")], ["night", T("سعر الليلة", "Per night")], ["total", T("للرحلة كاملة", "Whole trip")]].map(([v, l]) => `<label><input type="radio" name="p_hmode" value="${v}" ${((s.prefs && s.prefs.hotelMode) || "auto") === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
                <div class="hb-in" id="hbIn"><input inputmode="numeric" id="hotelAmt" value="${s.prefs && s.prefs.hotelSAR ? fmt(Math.round((s.prefs.hotelSAR * D.currency.perSAR) / rate())) : ""}" placeholder="${T("مثلًا", "e.g.")} ${fmt(Math.round((D.cities[0].costs.hotel.mid * Math.ceil(s.travelers / 2)) / rate()))}"><span>${curName()}</span></div>
                <small class="hint" id="hbHint"></small>
              </div>
              <small class="hint">${T("التلقائي يختار لك أفضل مستوى تكفيه ميزانيتك. أسعار Airbnb تقديرية.", "Auto picks the best level your budget allows. Airbnb prices are estimates.")}</small>
            </div>
            <div class="field">
              <label class="toggle"><input type="checkbox" id="flights" ${s.flights ? "checked" : ""}><span>${T("الميزانية تشمل تذاكر الطيران من السعودية", "Budget includes flights from Saudi Arabia")} <small>(${T(`تقدير ${money(D.flightSAR * D.currency.perSAR)} للشخص ذهاب وعودة`, `est. ${money(D.flightSAR * D.currency.perSAR)} return per person`)})</small></span></label>
            </div>
          </form>
        <button type="button" class="drawer-done" id="drawerDone">${T("تم، وريني الرحلات ✈", "Done — show my trips ✈")}</button>
      </aside>`;
    const drawer = document.getElementById("tripDrawer"), dbg = document.getElementById("drawerBg");
    document.body.append(dbg, drawer);
    const setDrawer = (o) => { drawer.classList.toggle("open", o); dbg.classList.toggle("open", o); document.body.classList.toggle("drawer-on", o); };
    if (app._editH) app.removeEventListener("click", app._editH);
    app._editH = (e) => { if (e.target.closest("[data-edit]")) setDrawer(true); };
    app.addEventListener("click", app._editH);
    [dbg, document.getElementById("drawerX"), document.getElementById("drawerDone")].forEach((el) => el.addEventListener("click", () => setDrawer(false)));
    document.addEventListener("keydown", function onEsc(e) { if (!document.body.contains(drawer)) return document.removeEventListener("keydown", onEsc); if (e.key === "Escape") setDrawer(false); });

    const form = document.getElementById("planForm");
    const resEl = document.getElementById("result");
    const budgetIn = document.getElementById("budget");
    let timer;
    const dStart = document.getElementById("dStart"), dEnd = document.getElementById("dEnd"), dHint = document.getElementById("dHint");
    const syncDates = () => {
      dEnd.min = dStart.value || isoDate(new Date());
      if (dStart.value && !dEnd.value) dEnd.value = addDays(dStart.value, +form.days.value - 1);
      const n = tripDays(dStart.value, dEnd.value);
      if (n) {
        form.days.value = Math.max(3, Math.min(21, n));
        form.days.disabled = true;
        dHint.textContent = n < 3 || n > 21 ? T("المخطط يدعم من 3 إلى 21 يوم، فعدّلنا المدة.", "Plans cover 3–21 days, so we adjusted the length.") : T(`${dayWord(n)} و${n - 1} ليالي`, `${dayWord(n)}, ${n - 1} nights`);
      } else {
        form.days.disabled = false;
        dHint.textContent = dStart.value && dEnd.value ? T("تاريخ الرجوع لازم يكون بعد تاريخ السفر.", "Return date must be after the start date.") : "";
      }
    };
    [dStart, dEnd].forEach((el) => el.addEventListener("change", () => { syncDates(); update(true); }));
    document.getElementById("dClear").addEventListener("click", () => { dStart.value = ""; dEnd.value = ""; syncDates(); update(true); });
    syncDates();
    const read = () => {
      const travelers = +form.travelers.value;
      const budgetMode = form.querySelector("input[name=bmode]:checked").value;
      return {
      budgetMode,
      startDate: tripDays(dStart.value, dEnd.value) ? dStart.value : "",
      endDate: tripDays(dStart.value, dEnd.value) ? dEnd.value : "",
      budget: (parseFloat(budgetIn.value.replace(/[^\d.]/g, "")) || 0) * rate() * (budgetMode === "pp" ? travelers : 1),
      days: +form.days.value,
      travelers,
      interests: [...form.querySelectorAll("input[name=interest]:checked")].map((i) => i.value),
      flights: form.flights.checked,
      prefs: {
        hotel: form.querySelector("input[name=p_hotel]:checked").value,
        food: form.querySelector("input[name=p_food]:checked").value,
        transport: form.querySelector("input[name=p_transport]:checked").value,
        stay: form.querySelector("input[name=p_stay]:checked").value,
        hotelMode: form.querySelector("input[name=p_hmode]:checked").value,
        hotelSAR: (parseFloat(document.getElementById("hotelAmt").value.replace(/[^\d.]/g, "")) || 0) * rate() / D.currency.perSAR,
      },
    }; };
    const hbHint = () => {
      const st = read(), m = st.prefs.hotelMode;
      document.getElementById("hbIn").hidden = m === "auto";
      const typical = (t) => D.cities.reduce((a, c) => a + lodging(c, t, st.prefs.stay, st.travelers), 0) / D.cities.length;
      const hn = hotelNightOf(st);
      let txt = "";
      if (m === "auto") txt = T(`نختار لك الفندق حسب ميزانيتك. المتوسط هنا لليلة: ${D.tiers.eco.name} ${money(typical("eco"))} · ${D.tiers.mid.name} ${money(typical("mid"))} · ${D.tiers.lux.name} ${money(typical("lux"))}`, `We pick hotels to fit your budget. Typical night here: ${D.tiers.eco.name} ${money(typical("eco"))} · ${D.tiers.mid.name} ${money(typical("mid"))} · ${D.tiers.lux.name} ${money(typical("lux"))}`);
      else if (!hn) txt = T("اكتب المبلغ لكل الغرف.", "Enter the amount for all rooms.");
      else {
        const lvl = ["lux", "mid", "eco"].find((t) => typical(t) <= hn * 1.05);
        txt = (m === "total" ? T(`يعني ${money(hn)} لليلة (${st.days - 1} ليالي). `, `That's ${money(hn)} a night (${st.days - 1} nights). `) : T(`يعني ${money(hn * (st.days - 1))} للرحلة كاملة. `, `That's ${money(hn * (st.days - 1))} for the whole trip. `))
          + (lvl ? T(`يكفي غالبًا فندق ${D.tiers[lvl].name}.`, `Usually enough for a ${D.tiers[lvl].name} hotel.`) : T(`أقل من أرخص فندق هنا (${money(typical("eco"))} لليلة)، جرّب غرفة Airbnb.`, `Below the cheapest hotels here (${money(typical("eco"))} a night) — try an Airbnb room.`));
      }
      document.getElementById("hbHint").textContent = txt;
    };
    const update = (now) => {
      const st = read();
      hbHint();
      document.getElementById("daysOut").textContent = dayWord(st.days);
      document.getElementById("trOut").textContent = paxWord(st.travelers);
      savePlan(st);
      clearTimeout(timer);
      resEl.classList.add("updating");
      timer = setTimeout(() => { renderOptions(st); resEl.classList.remove("updating"); }, now ? 0 : 160);
    };
    form.addEventListener("input", () => update());
    form.addEventListener("change", () => update());
    budgetIn.addEventListener("blur", () => { const v = parseFloat(budgetIn.value.replace(/[^\d.]/g, "")); if (v) budgetIn.value = fmt(v); });
    const PRESETS = {
      foodie: { hotel: "eco", food: "lux", transport: "auto" },
      comfort: { hotel: "lux", food: "eco", transport: "lux" },
      ride: { hotel: "eco", food: "eco", transport: "lux" },
      auto: { hotel: "auto", food: "auto", transport: "auto" },
    };
    form.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const pr = PRESETS[b.dataset.preset];
      PREF_KEYS.forEach((k) => { form.querySelector(`input[name=p_${k}][value=${pr[k]}]`).checked = true; });
      update(true);
    }));
    form.querySelectorAll("[data-b]").forEach((b) => b.addEventListener("click", () => { budgetIn.value = fmt(+b.dataset.b); update(true); }));
    update(true);
  }

  // تفصيل المصروف اليومي: متوسط اليوم بشريط ملون، بدون زحمة
  const DCOL = { hotel: ["🏨", "#0f3d3e", () => T("السكن", "Stay")], food: ["🍽️", "#e4572e", () => T("الأكل", "Food")], local: ["🚕", "#ffcf56", () => T("التنقل", "Getting around")], fees: ["🎟️", "#3aa57a", () => T("الدخول", "Entry fees")], inter: ["🚐", "#7a5a9e", () => T("بين المدن", "Between cities")] };
  function dayBox(r, s) {
    const n = r.plan.length, nights = Math.max(1, n - 1);
    const avg = { hotel: r.parts.hotel / nights, food: r.parts.food / n, local: r.parts.local / n, fees: r.parts.fees / n, inter: r.parts.inter / n };
    const keys = Object.keys(avg).filter((k) => avg[k] > 0.5);
    const sum = keys.reduce((a, k) => a + avg[k], 0);
    return `<div class="db-bar">${keys.map((k) => `<i style="flex:${avg[k]};background:${DCOL[k][1]}"></i>`).join("")}</div>
      <div class="db-k">${keys.map((k) => `<span><i style="background:${DCOL[k][1]}"></i>${DCOL[k][0]} ${DCOL[k][2]()} <b>${money(avg[k])}</b>${k === "hotel" ? `<small>/${T("ليلة", "night")}</small>` : ""}</span>`).join("")}</div>
      <div class="db-t">${T("اليوم تقريبًا", "A typical day")} <b>${money(sum)}</b> ${T("للمجموعة", "for the group")} · <b>${money(sum / s.travelers)}</b> ${T("للشخص", "pp")}${r.hotelNight ? ` · <span class="db-own">💰 ${T("بميزانية فنادقك", "your hotel budget")}</span>` : ""}</div>`;
  }
  function dayChart(r, s) {
    const tot = (d) => Object.values(d.cost).reduce((a, b) => a + b, 0);
    const mx = Math.max(...r.plan.map(tot)) || 1;
    return `<section class="dchart">
      <h3>🧾 ${T("مصروف كل يوم", "Day-by-day spending")} <small>${T("اضغط على أي يوم", "Tap any day")}</small></h3>
      <div class="dc-cols">${r.plan.map((d, i) => `<button type="button" class="dc-col ${i ? "" : "on"}" data-dc="${i}" aria-label="${T("اليوم", "Day")} ${d.day}: ${money(tot(d))}"><span class="dc-stack" style="height:${Math.max(8, (tot(d) / mx) * 100)}%">${Object.keys(DCOL).filter((k) => d.cost[k] > 0).map((k) => `<i style="flex:${d.cost[k]};background:${DCOL[k][1]}"></i>`).join("")}</span><small>${d.day}</small></button>`).join("")}</div>
      <div class="dc-info" id="dcInfo"></div>
    </section>`;
  }
  function dayInfo(r, s, i) {
    const d = r.plan[i], t = Object.values(d.cost).reduce((a, b) => a + b, 0);
    return `<b>${T("اليوم", "Day")} ${d.day}${s.startDate ? ` · ${niceDate(addDays(s.startDate, d.day - 1))}` : ""} · ${esc(d.city.short)}</b>
      <div class="dc-rows">${Object.keys(DCOL).filter((k) => d.cost[k] > 0).map((k) => `<span><i style="background:${DCOL[k][1]}"></i>${DCOL[k][0]} ${DCOL[k][2]()}<b>${money(d.cost[k])}</b></span>`).join("")}</div>
      <div class="dc-sum">${T("المجموع", "Total")} <b>${money(t)}</b> · ${money(t / s.travelers)} ${T("للشخص", "pp")}${d.cost.hotel ? "" : ` · ${T("بدون فندق (يوم المغادرة)", "no hotel (departure day)")}`}</div>`;
  }

  let lastOptions = [];
  const optUI = { stops: "all", tier: "all", sort: "best", shown: 10 };
  const fltNo = (r) => "RH" + (100 + (r.route.reduce((a, c) => (a * 31 + [...c.id].reduce((x, ch) => x + ch.charCodeAt(0), 0)) % 9973, 7) % 900));
  const apCode = (c) => c.code || (c.en || c.id).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  const hopText = (t) => (t.flight ? "✈ " : "🚐 ") + (t.hours < 1 ? T(`${Math.max(15, Math.round(t.hours * 60 / 5) * 5)} د`, `${Math.max(15, Math.round(t.hours * 60 / 5) * 5)} min`) : T(`${Math.round(t.hours)} س`, `${Math.round(t.hours)} h`));
  const tierRank = { eco: 0, mid: 1, lux: 2 };
  function renderOptions(s) {
    const { fits, over } = buildOptions(s);
    const list = fits.length ? fits : over.slice(0, 5);
    const resEl = document.getElementById("result");
    const leadEl = document.getElementById("tmLead"), lug = document.getElementById("lugTag");
    const left = (r) => s.budget - r.total;
    const pct = (r) => Math.round((r.total / s.budget) * 100);
    lug.innerHTML = `<span class="lug-str"></span><h5>${T("بطاقة الأمتعة", "Baggage tag")} · RAHHAL</h5>
      <dl><div><dt>${T("الميزانية", "Budget")}</dt><dd>${money(s.budget)}</dd></div><div><dt>${T("المسافرون", "Travellers")}</dt><dd>${s.travelers} ✕ 🧳</dd></div>
      <div><dt>${T("المدة", "Length")}</dt><dd>${dayWord(s.days)}</dd></div><div><dt>${T("الإقلاع", "Departs")}</dt><dd>${s.startDate ? niceDate(s.startDate) : T("مرن", "Flexible")}</dd></div></dl>
      <div class="lug-bc"></div><button type="button" class="lug-ed" data-edit>✏️ ${T("عدّل الحجز", "Edit booking")}</button>`;
    if (s.budget <= 0) {
      leadEl.textContent = T("اكتب ميزانيتك عشان نطلع لك الرحلات.", "Enter a budget to see your trips.");
      resEl.innerHTML = `<div class="empty-state">${T("اكتب ميزانيتك عشان نطلع لك الخيارات.", "Enter a budget to see your options.")} <button type="button" class="dp-go" data-edit>✏️ ${T("عدّل الحجز", "Edit booking")}</button></div>`;
      lastOptions = []; return;
    }
    leadEl.innerHTML = fits.length
      ? T(`<b>${fits.length === 1 ? "رحلة وحدة" : fits.length === 2 ? "رحلتين" : fits.length <= 10 ? fits.length + " رحلات" : fits.length + " رحلة"}</b> تقدر تحجزها بميزانيتك. اختر تذكرتك واصعد.`, `<b>${fits.length} ${fits.length === 1 ? "trip" : "trips"}</b> you can book with your budget. Pick a ticket and board.`)
      : T(`ميزانيتك ما تكفي ${dayWord(s.days)} لـ ${paxWord(s.travelers)}. هذي أقرب الرحلات، أو قلّل الأيام.`, `Your budget doesn't stretch to ${dayWord(s.days)} for ${paxWord(s.travelers)}. Here are the closest trips — or try fewer days.`);
    lastOptions = list.slice();

    // أفضل ثلاث تذاكر
    const picks = [];
    if (fits.length) {
      const used = new Set();
      const take = (r, kind) => { if (r && !used.has(r)) { used.add(r); picks.push([r, kind]); } };
      take(fits[0], "best");
      take([...fits].filter((r) => !used.has(r)).sort((a, b) => a.total - b.total)[0], "cheap");
      take([...fits].filter((r) => !used.has(r)).sort((a, b) => tierRank[b.tier] - tierRank[a.tier] || b.total - a.total)[0], "lux");
    }
    const KIND = { best: ["", T("الأنسب لك", "Best for you")], cheap: ["c", T("الأوفر", "Best value")], lux: ["l", T("الأفخم", "Most luxurious")] };
    const stopsTxt = (n) => (EN_ON ? (n === 1 ? "1 city" : n + " cities") : n === 1 ? "مدينة وحدة" : n === 2 ? "مدينتين" : n + " مدن");
    const viaTxt = (r) => (r.route.length === 1 ? T("مدينة وحدة", "Single stay") : r.route.length === 2 ? T("مباشرة", "Direct") : T(`عبر ${esc(r.route.slice(1, -1).map((c) => c.short).join(" و"))}`, `via ${esc(r.route.slice(1, -1).map((c) => c.short).join(", "))}`));
    const pass = ([r, kind]) => {
      const a = r.route[0], z = r.route[r.route.length - 1], i = lastOptions.indexOf(r);
      return `<article class="bpass ${KIND[kind][0]}">
        <div class="bp-hd"><span>${T("بطاقة صعود · BOARDING PASS", "Boarding pass")}</span><b>${fltNo(r)}</b></div>
        <div class="bp-ft">
          <div class="bp-leg"><div class="bp-ap"><b>${apCode(a)}</b><small>${esc(a.short)}</small></div><div class="bp-via"><span>✈</span><em>${viaTxt(r)}</em></div><div class="bp-ap"><b>${apCode(z)}</b><small>${esc(z.short)}</small></div></div>
          <div class="bp-fields"><div>${T("المدة", "Length")}<b>${dayWord(s.days)}</b></div><div>${T("الدرجة", "Class")}<b>${tiersLabel(r.tiers, true)}</b></div><div>${T("المحطات", "Stops")}<b>${stopsTxt(r.route.length)}</b></div><div>${T("الركاب", "Pax")}<b>${s.travelers}</b></div></div>
        </div>
        <div class="bp-perf"><i></i></div>
        <div class="bp-stub"><div class="bp-pr"><small>${T("إجمالي التذكرة", "Ticket total")}</small><b>${money(r.total)}</b><em>${money(r.total / s.travelers)} ${T("للشخص", "pp")} · <span class="ok">${T("يبقى", "Left")} ${money(left(r))}</span></em></div>
          <span class="bp-stamp">${KIND[kind][1]}</span>
          <button type="button" class="bp-board" data-opt="${i}">${T("اصعد ✈", "Board ✈")}</button></div>
      </article>`;
    };

    // الفلاتر والترتيب
    const nStops = (r) => Math.min(3, r.route.length);
    const cnt = (k) => list.filter((r) => k === "all" || nStops(r) === +k).length;
    let view = list.filter((r) => (optUI.stops === "all" || nStops(r) === +optUI.stops) && (optUI.tier === "all" || r.tier === optUI.tier));
    if (optUI.sort === "cheap") view = [...view].sort((a, b) => a.total - b.total);
    else if (optUI.sort === "lux") view = [...view].sort((a, b) => b.total - a.total);
    const arc = `<svg viewBox="0 0 100 58" preserveAspectRatio="none" aria-hidden="true"><path d="M0,29 Q50,-2 100,29" fill="none" stroke="#0f3d3e" stroke-width="1.6" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" opacity=".55"/></svg>`;
    const strip = (r) => {
      const i = lastOptions.indexOf(r), isOver = left(r) < 0;
      const hops = r.plan.filter((d) => d.newCity && d.travel).map((d) => d.travel);
      return `<article class="tstrip ${isOver ? "over" : ""}">
        <div class="ts-m">
          <div class="ts-top"><button type="button" class="ts-dbtn" data-day="${i}" aria-expanded="false">🧾 ${T("كم في اليوم؟", "Per day?")}</button><b>${fltNo(r)}</b><span class="ts-cls t-${sameTiers(r.tiers) ? r.tier : "mix"}">${tiersLabel(r.tiers, true)}</span><span>· ${stopsTxt(r.route.length)} · ${dayWord(s.days)}</span></div>
          <div class="ts-day" hidden>${dayBox(r, s)}</div>
          <div class="ts-path">${r.route.map((c, k) => `${k ? `<div class="ts-hop">${arc}<span>${hops[k - 1] ? hopText(hops[k - 1]) : ""}</span></div>` : ""}<a class="ts-city" href="${B()}/city/${c.id}"><span class="ts-ph">${cityScene(c, true)}</span><b>${esc(c.short)}</b><small>${dayWord(r.alloc.get(c))}</small></a>`).join("")}${r.route.length === 1 ? `<div class="ts-solo">${T(`${dayWord(s.days)} على راحتك في مكان واحد، بدون تنقلات.`, `${dayWord(s.days)} in one place — no packing and moving.`)}</div>` : ""}</div>
        </div>
        <div class="ts-s">
          <div><small>${T("للمجموعة", "For the group")}</small><b>${money(r.total)}</b></div>
          <em class="${isOver ? "neg" : ""}">${money(r.total / s.travelers)} ${T("للشخص", "pp")} · ${isOver ? T("ينقصك", "Short") : T("يبقى", "Left")} ${money(Math.abs(left(r)))}</em>
          <button type="button" class="ts-go" data-opt="${i}">${T("اصعد ✈", "Board ✈")}</button>
        </div>
      </article>`;
    };
    const chip = (grp, val, label) => `<button type="button" class="dp-f ${optUI[grp] === val ? "on" : ""}" data-f="${grp}" data-v="${val}">${label}</button>`;
    const SORTS = { best: T("الأنسب أولًا", "Best first"), cheap: T("الأرخص أولًا", "Cheapest first"), lux: T("الأغلى أولًا", "Priciest first") };

    const affordable = D.cities.map((c) => ({ c, d: daysAffordable(c, s) })).sort((a, b) => b.d.mid - a.d.mid);
    const cap = (n) => (n > 60 ? "+60" : n);
    const destCards = affordable.map(({ c, d }) => `
      <a class="dest" href="${B()}/city/${c.id}">
        <div class="dest-art">${cityScene(c, true)}</div>
        <div class="dest-body">
          <h4>${esc(c.name)}</h4>
          <div class="dest-days">
            <span class="${d.lux >= s.days ? "ok" : ""}">${D.tiers.lux.name} <b>${cap(d.lux)}</b></span>
            <span class="${d.mid >= s.days ? "ok" : ""}">${D.tiers.mid.name} <b>${cap(d.mid)}</b></span>
            <span class="${d.eco >= s.days ? "ok" : ""}">${D.tiers.eco.name} <b>${cap(d.eco)}</b></span>
          </div>
        </div>
      </a>`).join("");

    resEl.innerHTML = `
      ${picks.length ? `<div class="bpasses">${picks.map(pass).join("")}</div>` : ""}
      <section class="dp-list">
        <div class="dp-hd"><h2>${T("كل الرحلات", "All trips")}</h2>
          ${chip("stops", "all", `${T("الكل", "All")} <small>${list.length}</small>`)}${[["1", T("مدينة وحدة", "1 city")], ["2", T("مدينتين", "2 cities")], ["3", T("3 مدن+", "3+ cities")]].filter(([k]) => cnt(k) || optUI.stops === k).map(([k, l]) => chip("stops", k, `${l} <small>${cnt(k)}</small>`)).join("")}
          <span class="dp-sep"></span>
          ${chip("tier", "all", T("كل الدرجات", "Any class"))}${TIERS.map((t) => chip("tier", t, `${t === "eco" ? "🟢" : t === "mid" ? "🟡" : "🟣"} ${D.tiers[t].name}`)).join("")}
          <button type="button" class="dp-f dp-sort" data-sort>${SORTS[optUI.sort]} ⇅</button>
        </div>
        <p class="dp-note">${T("ميزانيتك", "Your budget")} <b>${money(s.budget)}</b> ${T("للمجموعة", "for the group")} · <b>${money(s.budget / s.travelers)}</b> ${T("للشخص", "per person")}. ${s.flights ? T("شامل الطيران الدولي (تقدير).", "Includes international flights (estimate).") : T("بدون الطيران الدولي.", "Excludes international flights.")} ${T("شامل التأشيرة والسكن والأكل والتنقل والرسوم.", "Covers visa, hotels, food, transport and fees.")}</p>
        <div class="tstrips">${view.length ? view.slice(0, optUI.shown).map(strip).join("") : `<div class="empty-state">${T("ما فيه رحلات بهالفلتر. جرّب فلتر ثاني.", "No trips match this filter. Try another.")}</div>`}</div>
        ${view.length > optUI.shown ? `<button type="button" class="dp-more" data-more>${T(`عرض ${Math.min(10, view.length - optUI.shown)} رحلات إضافية (من ${view.length - optUI.shown})`, `Show ${Math.min(10, view.length - optUI.shown)} more (${view.length - optUI.shown} left)`)}</button>` : ""}
      </section>
      <section class="block" style="margin-top:44px">
        <h2>${T("كم يوم تكفيك ميزانيتك في كل وجهة؟", "How many days your budget buys in each place")}</h2>
        <p class="hint" style="margin-top:-6px">${T(`لو قعدت كل رحلتك في وجهة وحدة. الأخضر يغطي ${dayWord(s.days)} أو أكثر.`, `If you spent the whole trip in one place. Green means ${dayWord(s.days)} or more.`)}</p>
        <div class="dests">${destCards}</div>
      </section>`;
    loadPhotos(resEl);
    if (store.get("surprise", 0) && lastOptions.length) {
      store.set("surprise", 0);
      const pick = lastOptions[Math.floor(Math.random() * Math.min(lastOptions.length, 12))];
      setTimeout(() => openOption(pick, s), 250);
    }
    resEl.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => openOption(lastOptions[+b.dataset.opt], s)));
    resEl.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { optUI[b.dataset.f] = b.dataset.v; optUI.shown = 10; renderOptions(s); }));
    const sb = resEl.querySelector("[data-sort]");
    sb && sb.addEventListener("click", () => { const k = Object.keys(SORTS); optUI.sort = k[(k.indexOf(optUI.sort) + 1) % k.length]; renderOptions(s); });
    resEl.querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => {
      const box = b.closest(".tstrip").querySelector(".ts-day"), open = box.hidden;
      box.hidden = !open; b.setAttribute("aria-expanded", open); b.classList.toggle("on", open);
    }));
    const mb = resEl.querySelector("[data-more]");
    mb && mb.addEventListener("click", () => { optUI.shown += 10; renderOptions(s); });
  }

  function openOption(r, s) {
    const first = r.route[0], last = r.route[r.route.length - 1];
    const p = r.parts;
    const sections = [];
    r.plan.forEach((d) => { if (d.newCity) sections.push({ city: d.city, travel: d.travel, days: [] }); sections[sections.length - 1].days.push(d); });
    const noteIco = (it) => (it.k === "in" ? "🛬" : it.k === "out" ? "🛫" : "☕");
    const days = sections.map((sec) => `
      <section class="leg">
        ${sec.travel ? `<div class="leg-travel"><span class="lt-ico">${sec.travel.flight ? "✈️" : "🚐"}</span><span>${T(`من ${esc(sec.travel.from.short)} إلى ${esc(sec.city.short)}: ${esc(sec.travel.mode)}، ${hoursText(sec.travel.hours)}`, `${esc(sec.travel.from.short)} to ${esc(sec.city.short)}: ${esc(sec.travel.mode)}, ${hoursText(sec.travel.hours)}`)}</span><b>${money(sec.travel.cost[r.tier])} ${T("للشخص", "pp")}</b></div>` : ""}
        <header class="leg-head">
          <div class="leg-art">${cityScene(sec.city, true)}</div>
          <div class="leg-title"><b>${esc(sec.city.name)}</b><span>${T(`${dayWord(sec.days.length)}، من اليوم ${sec.days[0].day}${sec.days.length > 1 ? " إلى " + sec.days[sec.days.length - 1].day : ""}`, `${dayWord(sec.days.length)} · day ${sec.days[0].day}${sec.days.length > 1 ? "–" + sec.days[sec.days.length - 1].day : ""}`)}</span></div>
          <a class="leg-link" href="${B()}/city/${sec.city.id}" data-close>${T("عن الوجهة", "About")}</a>
        </header>
        ${(() => {
          const a = sec.days[0].day, z = sec.days[sec.days.length - 1].day;
          const ci = s.startDate ? addDays(s.startDate, a - 1) : "", co = s.startDate ? addDays(s.startDate, Math.min(z, s.days - 1)) : "";
          return `<div class="leg-book">🛏️ ${s.startDate ? `${T("سكنك هنا", "Your stay")}: <b>${niceDate(ci)} – ${niceDate(co)}</b> ·` : T("شوف أسعار السكن الحقيقية:", "Check live prices:")} ${bookingLinks(sec.city, s.travelers, ci, co)}</div>`;
        })()}
        <header style="display:none">
        </header>
        ${sec.days.map((d) => `
          <div class="pday">
            <div class="pday-n"><small>${s.startDate ? niceDate(addDays(s.startDate, d.day - 1)) : T("اليوم", "Day")}</small>${d.day}</div>
            <div class="pday-items">${d.items.map((it) => it.p
              ? `<button type="button" class="prow" data-place="${it.p.key}">${photoBox(it.p)}<span class="prow-t"><b>${it.p.must ? `<span class="must-b">❤️ ${T("اخترته", "Your pick")}</span> ` : ""}${esc(it.p.name)}</b><small>★ ${it.p.rating.toFixed(1)} · ${it.p.fee ? money(it.p.fee) : T("مجانًا", "Free")} · ${esc(it.p.time)}</small></span><span class="prow-go" aria-hidden="true">${T("‹", "›")}</span></button>`
              : `<div class="prow note-row"><span class="note-ico">${noteIco(it)}</span><span>${esc(it.t)}</span></div>`).join("")}</div>
          </div>`).join("")}
      </section>`).join("");

    dlg.innerHTML = `
      <div class="dlg-in wide">
        <button type="button" class="dlg-x" data-close aria-label="${T("إغلاق", "Close")}">✕</button>
        <div class="pass">
          <div class="pass-art">${cityScene(last, true)}<span class="ttl">${T("بطاقة رحلتك", "Your boarding pass")}</span></div>
          <div class="pass-main">
            <div class="pass-route">
              <div class="code">${esc(first.code || first.en)}<small>${esc(first.name)}</small></div>
              <div class="line"></div>
              <div class="code">${esc(last.code || last.en)}<small>${esc(last.name)}</small></div>
            </div>
            <div class="pass-fields">
              <div>${T("المدة", "Length")}<b>${dayWord(s.days)}</b>${s.startDate ? `<small class="pass-dates">${niceDate(s.startDate)} – ${niceDate(s.endDate)}</small>` : ""}</div>
              <div>${T("المسافرون", "Travellers")}<b>${paxWord(s.travelers)}</b></div>
              <div>${T("المستوى", "Comfort")}<b>${tiersLabel(r.tiers, true)}</b></div>
              <div>${T("المحطات", "Stops")}<b>${EN_ON ? r.route.length + (r.route.length === 1 ? " stop" : " stops") : r.route.length === 1 ? "وجهة وحدة" : r.route.length === 2 ? "وجهتين" : r.route.length + " وجهات"}</b></div>
            </div>
          </div>
          <div class="pass-stub">
            <div><div class="k">${T("التكلفة التقريبية", "Estimated total")}</div><div class="amount">${money(r.total)}</div><div class="k">${money(r.total / s.travelers)} ${T("للشخص", "per person")}</div></div>
            <div class="barcode" aria-hidden="true"></div>
          </div>
        </div>
        <div class="costs">
          <div>${T("السكن", "Hotels")}<b>${money(p.hotel)}</b></div>
          <div>${T("الأكل", "Food")}<b>${money(p.food)}</b></div>
          <div>${T("التنقل الداخلي", "Local transport")}<b>${money(p.local)}</b></div>
          <div>${T("بين الوجهات", "Between stops")}<b>${money(p.inter)}</b></div>
          <div>${T("رسوم الأماكن", "Entry fees")}<b>${money(p.fees)}</b></div>
          <div>${T("التأشيرة", "Visa")}${s.flights ? T(" والطيران", " & flights") : ""}<b>${money(p.visa + (s.flights ? D.flightSAR * D.currency.perSAR * s.travelers : 0))}</b></div>
        </div>
        ${dayChart(r, s)}
        <p class="hint">${r.hotelNight ? T(`💰 السكن حسب ميزانيتك: ${money(r.hotelNight)} لليلة. `, `💰 Hotels use your budget: ${money(r.hotelNight)} a night. `) : ""}${sameTiers(r.tiers) ? D.tiers[r.tier].desc + ". " : ""}${r.stay === "apt" ? T("السكن شقة Airbnb كاملة لكل 4 أشخاص (سعر تقديري).", "Lodging is a whole Airbnb apartment per 4 people (estimated price).") : r.stay === "room" ? T("السكن غرفة خاصة في Airbnb لكل شخصين (سعر تقديري).", "Lodging is a private Airbnb room per 2 people (estimated price).") : T("السكن غرفة فندقية لكل شخصين.", "Hotels assume one room per two travellers.")} ${T("الأسعار تقريبية، وتقدر تشوف السعر الحقيقي من روابط Booking وAirbnb في كل وجهة.", "Prices are estimates — check live prices with the Booking and Airbnb links for each stop.")}</p>
        <div class="trip">
          <div class="legs">${days}</div>
          <div class="map">${mapSVG(r.route, { animate: true })}</div>
        </div>
        <div class="actions no-print"><button class="btn" type="button" onclick="window.print()">${T("اطبع الخطة أو احفظها PDF", "Print or save as PDF")}</button></div>
      </div>`;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    const info = dlg.querySelector("#dcInfo");
    const pick = (i) => { info.innerHTML = dayInfo(r, s, i); dlg.querySelectorAll(".dc-col").forEach((b) => b.classList.toggle("on", +b.dataset.dc === i)); };
    dlg.querySelectorAll(".dc-col").forEach((b) => b.addEventListener("click", () => pick(+b.dataset.dc)));
    pick(0);
    loadPhotos(dlg);
  }


  // ---------- صمّم رحلتك على ذوقك ----------
  function viewBuild() {
    const KEY = "build:" + D.id;
    const gp = getPlan();
    const b = { cities: [], must: [], pace: 2, interests: [], hotel: "mid", food: "mid", transport: "mid", stay: "hotel", ...store.get(KEY, {}) };
    b.cities = b.cities.filter((x) => cityById[x.id]);
    const save = () => store.set(KEY, b);
    const PACE = [[1, T("🐢 هادئ", "🐢 Relaxed"), T("مكان واحد باليوم", "1 sight a day")], [2, T("🚶 متوازن", "🚶 Balanced"), T("مكانين باليوم", "2 sights a day")], [3, T("🏃 مكثّف", "🏃 Packed"), T("3 أماكن باليوم", "3 sights a day")]];
    const STAYS = [["hotel", T("🏨 فندق", "🏨 Hotel")], ["apt", T("🏠 شقة Airbnb", "🏠 Airbnb flat")], ["room", T("🛏️ غرفة Airbnb", "🛏️ Airbnb room")]];
    const seg = (name, cur, opts) => `<div class="seg mini">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${String(cur) === String(v) ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;

    app.innerHTML = `
      <section class="bd-hero"><div class="wrap">
        <div class="kick"><a href="${B()}">${D.flag} ${esc(D.name)}</a></div>
        <h1 class="display">🧭 ${T("رحلتك على ذوقك", "Your trip, your way")}</h1>
        <p class="lead">${T("اختر المدن والأيام والأماكن اللي تحبها، وحنا نرتّب لك البرنامج والتكلفة.", "Pick the cities, days and places you love — we'll arrange the plan and the cost.")}</p>
      </div></section>
      <div class="wrap bd">
        <section class="bd-step">
          <h2><span class="n">1</span>${T("وين تبي تروح؟", "Where do you want to go?")}</h2>
          <div class="bd-cities" id="bdCities"></div>
          <div class="bd-route" id="bdRoute"></div>
        </section>
        <section class="bd-step" id="bdMustWrap">
          <h2><span class="n">2</span>${T("أماكن لازم تكون في رحلتك", "Places you can't miss")} <small>${T("اختياري", "optional")}</small></h2>
          <div id="bdMust"></div>
        </section>
        <section class="bd-step">
          <h2><span class="n">3</span>${T("ذوقك", "Your style")}</h2>
          <div class="bd-taste" id="bdTaste">
            <div class="bd-row"><b>${T("وش تحب؟", "What do you enjoy?")}</b><div class="chips">${Object.entries(D.interests).map(([k, v]) => `<label class="chip"><input type="checkbox" name="bi" value="${k}" ${b.interests.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("")}</div></div>
            <div class="bd-row"><b>${T("رتم الرحلة", "Pace")}</b>${seg("bpace", b.pace, PACE.map(([v, l]) => [v, l]))}<small class="hint" id="bdPaceHint"></small></div>
            <div class="bd-row"><b>${T("🏨 السكن", "🏨 Stay")}</b>${seg("bhotel", b.hotel, TIERS.map((t) => [t, D.tiers[t].name]))}</div>
            <div class="bd-row"><b>${T("نوع السكن", "Stay type")}</b>${seg("bstay", b.stay, STAYS)}</div>
            <div class="bd-row"><b>${T("🍽️ الأكل", "🍽️ Food")}</b>${seg("bfood", b.food, TIERS.map((t) => [t, D.tiers[t].name]))}</div>
            <div class="bd-row"><b>${T("🚕 التنقل", "🚕 Getting around")}</b>${seg("btr", b.transport, TIERS.map((t) => [t, D.tiers[t].name]))}</div>
          </div>
        </section>
      </div>
      <div class="bd-bar" id="bdBar"></div>`;

    const citiesEl = document.getElementById("bdCities"), routeEl = document.getElementById("bdRoute"), mustEl = document.getElementById("bdMust"), bar = document.getElementById("bdBar");
    const picked = (id) => b.cities.find((x) => x.id === id);
    const paintCities = () => {
      citiesEl.innerHTML = D.cities.map((c) => `<button type="button" class="bd-city ${picked(c.id) ? "on" : ""}" data-c="${c.id}" aria-pressed="${!!picked(c.id)}">
        <span class="bd-ph">${cityScene(c, true)}<i>${picked(c.id) ? "✓" : "+"}</i></span><b>${esc(c.short || c.name)}</b><small>${T(`${c.places.length} مكان`, `${c.places.length} places`)}</small></button>`).join("");
      routeEl.innerHTML = b.cities.length ? `
        <div class="bd-route-h"><b>${T("مسارك", "Your route")}</b>${b.cities.length > 1 ? `<button type="button" class="bd-sort" data-sort>⇅ ${T("رتّبها بأقصر طريق", "Shortest order")}</button>` : ""}</div>
        ${b.cities.map((x, i) => { const c = cityById[x.id]; return `<div class="bd-leg">
          <span class="bd-i">${i + 1}</span><span class="bd-nm"><b>${esc(c.short || c.name)}</b><small>${T(`المقترح ${dayWord(c.days.ideal)}`, `suggested ${dayWord(c.days.ideal)}`)}</small></span>
          <span class="bd-step-d"><button type="button" data-d="${x.id}" data-v="-1" aria-label="${T("أقل", "Fewer")}">−</button><b>${dayWord(x.days)}</b><button type="button" data-d="${x.id}" data-v="1" aria-label="${T("أكثر", "More")}">+</button></span>
          <span class="bd-mv">${i ? `<button type="button" data-up="${i}" aria-label="${T("قبل", "Earlier")}">▲</button>` : ""}${i < b.cities.length - 1 ? `<button type="button" data-dn="${i}" aria-label="${T("بعد", "Later")}">▼</button>` : ""}</span>
        </div>`; }).join("")}` : `<p class="hint">${T("اضغط على المدن اللي تبيها، وتقدر تغيّر أيام كل مدينة وترتيبها.", "Tap the cities you want, then adjust the days and order.")}</p>`;
    };
    const paintMust = () => {
      document.getElementById("bdMustWrap").hidden = !b.cities.length;
      mustEl.innerHTML = b.cities.map((x) => {
        const c = cityById[x.id];
        const ps = c.places.map((p, i) => ({ p, key: D.id + ":" + c.id + ":" + i }));
        const n = ps.filter((q) => b.must.includes(q.key)).length;
        return `<details class="bd-must" ${n ? "open" : ""}><summary><b>${esc(c.short || c.name)}</b>${n ? `<span class="bd-n">${n} ❤️</span>` : ""}</summary>
          <div class="chips">${ps.map(({ p, key }) => `<label class="chip"><input type="checkbox" name="bm" value="${key}" ${b.must.includes(key) ? "checked" : ""}><span>${ICONS[p.type] || "📍"} ${esc(p.name)}${p.gem ? " 💎" : ""}</span></label>`).join("")}</div></details>`;
      }).join("");
    };
    let last = null;
    const compute = () => {
      const pace = PACE.find((x) => x[0] === +b.pace) || PACE[1];
      document.getElementById("bdPaceHint").textContent = pace[2];
      if (!b.cities.length) { last = null; bar.innerHTML = `<div class="bd-bar-in"><span>${T("اختر مدينة وحدة على الأقل", "Pick at least one city")}</span></div>`; return; }
      const route = b.cities.map((x) => cityById[x.id]);
      const fixed = Object.fromEntries(b.cities.map((x) => [x.id, x.days]));
      const s = { ...gp, interests: b.interests };
      const r = planRoute(route, { ...s, tiers: { hotel: b.hotel, food: b.food, transport: b.transport }, tier: b.hotel, stay: b.stay, hotelNight: hotelNightOf(s), fixed, pace: +b.pace, must: new Set(b.must) });
      r.total = totalOf(r, gp.flights, gp.travelers);
      last = { r, s: { ...s, days: r.days, endDate: gp.startDate ? addDays(gp.startDate, r.days - 1) : "" } };
      const diff = gp.budget - r.total;
      bar.innerHTML = `<div class="bd-bar-in">
        <div class="bd-sum"><small>${dayWord(r.days)} · ${paxWord(gp.travelers)} · ${r.route.length === 1 ? T("مدينة وحدة", "1 city") : EN_ON ? r.route.length + " cities" : r.route.length === 2 ? "مدينتين" : r.route.length + " مدن"}</small>
          <b>${money(r.total)}</b><em class="${diff < 0 ? "neg" : "ok"}">${money(r.total / gp.travelers)} ${T("للشخص", "pp")} · ${diff < 0 ? T(`أكثر من ميزانيتك بـ ${money(-diff)}`, `${money(-diff)} over budget`) : T(`يبقى من ميزانيتك ${money(diff)}`, `${money(diff)} left in budget`)}</em>
          ${r.mustLeft ? `<em class="neg">${T(`${r.mustLeft} من أماكنك ما وسعتها الأيام، زِد يوم أو خلّ الرتم أسرع`, `${r.mustLeft} of your picks didn't fit — add a day or pick a faster pace`)}</em>` : ""}</div>
        <button type="button" class="bd-go" id="bdGo">${T("اعرض خطتي ✈", "Show my plan ✈")}</button></div>`;
      document.getElementById("bdGo").addEventListener("click", () => openOption(last.r, last.s));
    };
    const all = () => { save(); paintCities(); paintMust(); compute(); };

    const root = app.querySelector(".bd");
    root.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.c) {
        const id = t.dataset.c, i = b.cities.findIndex((x) => x.id === id);
        if (i >= 0) { b.cities.splice(i, 1); b.must = b.must.filter((k) => !k.startsWith(D.id + ":" + id + ":")); }
        else b.cities.push({ id, days: cityById[id].days.ideal });
        all();
      } else if (t.dataset.d) {
        const x = picked(t.dataset.d); x.days = Math.max(1, Math.min(14, x.days + +t.dataset.v)); save(); paintCities(); compute();
      } else if (t.dataset.up || t.dataset.dn) {
        const i = +(t.dataset.up || t.dataset.dn), j = t.dataset.up ? i - 1 : i + 1;
        [b.cities[i], b.cities[j]] = [b.cities[j], b.cities[i]]; save(); paintCities(); compute();
      } else if (t.hasAttribute("data-sort")) {
        // أقرب جار: نبدأ من أقصى الشمال ونروح للأقرب كل مرة
        const left = b.cities.map((x) => x), out = [left.sort((a, z) => cityById[z.id].lat - cityById[a.id].lat).shift()];
        while (left.length) { const cur = cityById[out[out.length - 1].id]; left.sort((a, z) => km(cur, cityById[a.id]) - km(cur, cityById[z.id])); out.push(left.shift()); }
        b.cities = out; save(); paintCities(); compute();
      }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "bm") { b.must = t.checked ? [...new Set([...b.must, t.value])] : b.must.filter((k) => k !== t.value); save(); paintMust(); compute(); }
      else if (t.name === "bi") { b.interests = [...root.querySelectorAll("input[name=bi]:checked")].map((i) => i.value); save(); compute(); }
      else if (["bpace", "bhotel", "bfood", "btr", "bstay"].includes(t.name)) { b[{ bpace: "pace", bhotel: "hotel", bfood: "food", btr: "transport", bstay: "stay" }[t.name]] = t.name === "bpace" ? +t.value : t.value; save(); compute(); }
    });
    all();
  }

  // ---------- الخريطة التفاعلية ----------
  const smoothPath = (pts, close = true) => {
    const p = close ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < p.length - 2; i++) {
      const [a, b, c, e] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    }
    return d + (close ? "Z" : "");
  };
  const heatCol = (t) => {
    const st = [[0, [58, 165, 122]], [0.3, [166, 211, 111]], [0.55, [255, 212, 90]], [0.78, [255, 155, 69]], [1, [226, 70, 58]]];
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const a = st[i - 1], b = st[i], k = (t - a[0]) / (b[0] - a[0]); return `rgb(${a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k))})`; }
    return "rgb(226,70,58)";
  };
  // أشهر الذروة حسب المنطقة (تقديري): الشمال أكتوبر–أبريل، الوسط فبراير–أغسطس، الجنوب ديسمبر–أبريل
  const seasonCurve = (c) => {
    const peak = c.lat > 19 ? [0, 1, 2, 3, 9, 10, 11] : c.lat > 12 ? [1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 11];
    return [...Array(12)].map((_, m) => (peak.includes(m) ? 1.12 : 0.88) + (((m * 7) % 5) - 2) / 100);
  };
  const MONTHS = EN_ON ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  function sparkSVG(vals) {
    const mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1;
    const pts = vals.map((v, i) => [i * (300 / (vals.length - 1)), 42 - ((v - mn) / r) * 34]);
    const d = smoothPath(pts, false);
    return `<svg viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4572e" stop-opacity=".35"/><stop offset="1" stop-color="#e4572e" stop-opacity="0"/></linearGradient></defs><path d="${d} L300,46 L0,46Z" fill="url(#spg)"/><path d="${d}" fill="none" stroke="#e4572e" stroke-width="2.5"/></svg>`;
  }

  function viewMap(cityId) {
    const M = window.MAPS && window.MAPS[D.id];
    if (!M) return viewNotFound();
    // حدود الدول ملف كبير، فنحمّله بس لما تنفتح الخريطة
    if (!window.GEO) {
      app.innerHTML = `<div class="mapview"><div class="mv-loading">🗺️ ${T("نجهّز الخريطة…", "Loading the map…")}</div></div>`;
      const want = location.hash;
      const sc = document.createElement("script");
      sc.src = "data/geo.js";
      sc.onload = () => { if (location.hash === want) viewMap(cityId); };
      sc.onerror = () => { app.innerHTML = `<div class="wrap empty-state">${T("ما قدرنا نحمّل الخريطة. تأكد من الاتصال وحاول مرة ثانية.", "Couldn't load the map. Check your connection and try again.")}</div>`; };
      document.head.appendChild(sc);
      return;
    }
    const G = window.GEO[D.id];
    if (!G) return viewNotFound();
    const [lo0, la0, lo1, la1] = G.bbox, kx = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
    const U = 420 / Math.max((lo1 - lo0) * kx, la1 - la0);
    const proj = (lat, lon) => [(lon - lo0) * kx * U, (la1 - lat) * U];
    const ringD = (r) => smoothPath(r.map(([lon, lat]) => proj(lat, lon)));
    const cities = M.cities || {};
    const CM = cityId && cities[cityId];
    if (cityId && !CM) return viewNotFound();
    const st = { layer: "hotel", tier: "mid", stay: "hotel", ...store.get("mapState", {}) };
    const save = () => store.set("mapState", st);
    const city = CM ? cityById[cityId] : null;
    const L = (pair) => pair[EN_ON ? 1 : 0];
    const LAYERS = [["hotel", T("🏨 السكن", "🏨 Stay")], ["food", T("🍽️ الأكل", "🍽️ Food")], ["transport", T("🚕 التنقل", "🚕 Transport")], ["total", T("💰 الإجمالي", "💰 Total")]];
    const value = (c, f = 1) => {
      const k = c.costs, t = st.tier;
      if (st.layer === "hotel") return k.hotel[t] * f * (st.stay === "apt" ? STAY.apt[t] / 2 : 1);
      if (st.layer === "food") return k.food[t] * Math.sqrt(f);
      if (st.layer === "transport") return k.transport[t];
      return (k.hotel[t] * f) / 2 + k.food[t] * Math.sqrt(f) + k.transport[t];
    };
    const legendTitle = () => (st.layer === "hotel" ? T("سعر الليلة", "Price per night") : st.layer === "food" ? T("الأكل للشخص باليوم", "Food per person per day") : st.layer === "transport" ? T("التنقل للشخص باليوم", "Transport per person per day") : T("الإجمالي للشخص باليوم", "Total per person per day"));

    // النقاط
    let items, bounds, fitB = null;
    if (!CM) {
      items = D.cities.map((c) => { const [x, y] = proj(c.lat, c.lon); return { id: c.id, c, x, y, name: c.short || c.name, main: c.id === (M.main || M.capital) }; });
      bounds = [0, 0, (lo1 - lo0) * kx * U, (la1 - la0) * U];
      // الكاميرا تبدأ على المدن نفسها (مو على جزر بعيدة)، مع هامش يبين شكل الدولة حولها
      const xs = items.map((i) => i.x), ys = items.map((i) => i.y);
      let fx0 = Math.min(...xs), fx1 = Math.max(...xs), fy0 = Math.min(...ys), fy1 = Math.max(...ys);
      const mw = Math.max(bounds[2] * 0.45, (fx1 - fx0) * 1.35, 60), mh = Math.max(bounds[3] * 0.45, (fy1 - fy0) * 1.35, 60);
      const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
      fitB = [cx - mw / 2, cy - mh / 2, Math.min(mw, bounds[2] * 1.1), Math.min(mh, bounds[3] * 1.1)];
    } else {
      items = CM.districts.map((d) => ({ id: d.id, d, x: d.x, y: d.y, name: L(d.name), main: !!d.main }));
      bounds = window.innerWidth > 860 ? [-460, -330, 920, 700] : [-380, -230, 760, 430];
    }
    let vs, vmin, vmax, avg;
    const norm = (v) => (vmax === vmin ? 0.5 : (v - vmin) / (vmax - vmin));
    const compute = () => {
      items.forEach((i) => { i.v = CM ? value(city, i.d.f) : value(i.c); });
      vs = items.map((i) => i.v); vmin = Math.min(...vs); vmax = Math.max(...vs); avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    };
    compute();
    let sel = store.get("mapSel:" + (cityId || D.id), null);
    if (!items.find((i) => i.id === sel)) sel = (items.find((i) => i.main) || items[0]).id;

    // الرسمة الثابتة (تنرسم مرة وحدة، والتحريك يكون بتحويل GPU)
    const PAD = CM ? 220 : 80;
    const W0 = { x: bounds[0] - PAD, y: bounds[1] - PAD, w: bounds[2] + PAD * 2, h: bounds[3] + PAD * 2 };
    let art = "";
    if (!CM) {
      const land = G.rings.map(ringD).join(" ");
      // التضاريس: ظل الجبال وقممها، والأنهار والبحيرات
      const peak = (x, y, s, snow) => `<path d="M${x - s},${y} L${x},${y - s * 1.3} L${x + s},${y}Z" fill="#c9b38a"/><path d="M${x},${y - s * 1.3} L${x + s},${y} L${x + s * 0.12},${y}Z" fill="#a8916a"/>${snow ? `<path d="M${x - s * 0.34},${y - s * 0.86} L${x},${y - s * 1.3} L${x + s * 0.34},${y - s * 0.86} L${x + s * 0.1},${y - s * 0.96} L${x - s * 0.08},${y - s * 0.82}Z" fill="#fff"/>` : ""}`;
      const mts = (M.mt || []).map(([lat, lon, sz, snow]) => { const [x, y] = proj(lat, lon), s = 3 + sz * 1.7; return { x, y, s, snow }; });
      const shade = mts.map(({ x, y, s }) => `<ellipse cx="${x}" cy="${y - s * 0.4}" rx="${s * 3.4}" ry="${s * 1.9}" fill="url(#mvHill)"/>`).join("");
      const peaks = mts.map(({ x, y, s, snow }) => peak(x - s * 1.05, y + s * 0.3, s * 0.72, snow) + peak(x + s * 1.0, y + s * 0.35, s * 0.66, snow) + peak(x, y, s, snow)).join("");
      const rivers = (M.rivers || []).map((r) => { const d = smoothPath(r.map(([lat, lon]) => proj(lat, lon)), false); return `<path d="${d}" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".7"/><path d="${d}" stroke="#6fb3c4" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; }).join("");
      const lakes = (M.lakes || []).map(([lat, lon, rx, ry]) => { const [x, y] = proj(lat, lon); return `<ellipse cx="${x}" cy="${y}" rx="${Math.max(2.5, rx * kx * U)}" ry="${Math.max(2, ry * U)}" fill="#9fcfd0" stroke="#fff" stroke-width=".8"/>`; }).join("");
      const labels = (M.labels || []).map(([lat, lon, ar, en]) => { const [x, y] = proj(lat, lon); return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" font-style="italic" fill="#3f7f86" opacity=".85" letter-spacing=".5">${EN_ON ? en : ar}</text>`; }).join("");
      const ctxLand = (G.ctx || []).map((r) => `<path d="${smoothPath(r.map(([lon, lat]) => proj(lat, lon)))}"/>`).join("");
      art = `${[...Array(14)].map((_, i) => `<path d="M${W0.x},${W0.y + i * 48} C${W0.x + W0.w * 0.3},${W0.y + i * 48 - 14} ${W0.x + W0.w * 0.6},${W0.y + i * 48 + 18} ${W0.x + W0.w},${W0.y + i * 48}" stroke="#fff" stroke-opacity=".2" fill="none" stroke-width=".7"/>`).join("")}
        <g fill="#e6dfcd" stroke="#fff" stroke-width=".8" opacity=".75">${ctxLand}</g>
        <path d="${land}" fill="#0f3d3e" opacity=".14" transform="translate(1.5 4)"/>
        <path d="${land}" fill="#f4ecdc"/>
        <g clip-path="url(#mvClip)">${shade}<g id="mvHeat"></g></g>
        ${lakes}${rivers}
        <path d="${land}" fill="none" stroke="#fff" stroke-width="2"/><path d="${land}" fill="none" stroke="#12312f" stroke-opacity=".25" stroke-width=".7"/>
        <g opacity=".95">${peaks}</g>${labels}`;
    } else {
      let streets = "";
      for (let i = -9; i <= 9; i++) {
        const sw = i % 3 ? 1.4 : 3.5;
        streets += `<path d="${smoothPath([[-520, i * 55 - 30], [-200, i * 55 + 10], [60, i * 55 - 15], [520, i * 55 + 20]], false)}" stroke-width="${sw}"/>`;
        streets += `<path d="${smoothPath([[i * 60 - 20, -420], [i * 60 + 15, -120], [i * 60 - 10, 140], [i * 60 + 20, 420]], false)}" stroke-width="${sw}"/>`;
      }
      const w = CM.walk;
      art = `<g id="mvHeat"></g>
        <g stroke="#fff" fill="none" opacity=".85">${streets}</g>
        <path d="${smoothPath(CM.lake)}" fill="#a9d1d0"/><path d="${smoothPath(CM.pond)}" fill="#a9d1d0"/>
        <path d="${smoothPath(CM.river, false)}" stroke="#a9d1d0" stroke-width="70" fill="none" stroke-linecap="round"/>
        <path d="M120,-60 L250,-50" stroke="#c8323a" stroke-width="5"/>
        <circle cx="${w.x}" cy="${w.y}" r="${w.r}" fill="rgba(15,61,62,.05)" stroke="#0f3d3e" stroke-width="1.5" stroke-dasharray="4 6"/>
        <text x="${w.x + w.r * 0.75}" y="${w.y + w.r + 18}" text-anchor="middle" font-size="13" font-weight="600" fill="#0f3d3e">🚶 ${T("15 دقيقة مشي", "15-min walk")}</text>
        <text x="-165" y="-215" text-anchor="middle" font-size="13" fill="#3f7f86" font-style="italic">${L(CM.lakeName)}</text>
        <text x="190" y="260" text-anchor="middle" font-size="13" fill="#3f7f86" font-style="italic" transform="rotate(-62 190 260)">${L(CM.riverName)}</text>
        ${CM.landmarks.map(([e, x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="#0f3d3e" stroke-width="1.5"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17">${e}</text>`).join("")}`;
    }

    app.innerHTML = `
      <div class="mapview ${CM ? "is-city" : ""}" id="mv">
        <div class="mv-stage" id="mvStage">
          <div class="mv-world" id="mvWorld"><svg id="msvg" viewBox="${W0.x} ${W0.y} ${W0.w} ${W0.h}" role="img" aria-label="${T("خريطة الأسعار", "Price map")}">
            <defs>${!CM ? `<clipPath id="mvClip"><path d="${G.rings.map(ringD).join(" ")}"/></clipPath><radialGradient id="mvHill"><stop offset="0" stop-color="#8a7350" stop-opacity=".32"/><stop offset="1" stop-color="#8a7350" stop-opacity="0"/></radialGradient>` : ""}<g id="mvGrads"></g></defs>
            ${art}
          </svg></div>
          <div class="mv-pins" id="mvPins"></div>
        </div>
        <div class="mv-top"><div class="mv-crumb glass">${CM ? `<a href="${B()}/map">${D.flag} ${esc(D.name)}</a> ‹ <b>${esc(city.short || city.name)}</b> · ${T("الأحياء", "Neighbourhoods")}` : `${D.flag} <b>${esc(D.name)}</b> · ${T("خريطة الأسعار", "Price map")}`}</div></div>
        <div class="mv-chips" id="mvChips"></div>
        <div class="mv-ctl glass"><button type="button" data-z="in" aria-label="${T("تكبير", "Zoom in")}">＋</button><button type="button" data-z="out" aria-label="${T("تصغير", "Zoom out")}">－</button><button type="button" data-z="reset" aria-label="${T("رجوع", "Reset")}">◎</button></div>
        <div class="mv-legend glass" id="mvLegend"></div>
        <aside class="mv-sheet" id="mvSheet"></aside>
      </div>`;

    const stage = document.getElementById("mvStage"), world = document.getElementById("mvWorld"), svg = document.getElementById("msvg");
    const pinsL = document.getElementById("mvPins"), sheet = document.getElementById("mvSheet");
    const heat = document.getElementById("mvHeat"), grads = document.getElementById("mvGrads");

    // الطبقات اللي تتغير مع الأزرار
    const paintData = () => {
      document.getElementById("mvChips").innerHTML = `
        ${LAYERS.map(([k, l]) => `<button type="button" class="mv-chip glass ${st.layer === k ? "on" : ""}" data-layer="${k}">${l}</button>`).join("")}
        <span class="mv-sep"></span>
        ${TIERS.map((t) => `<button type="button" class="mv-chip glass ${st.tier === t ? "on" : ""}" data-tier="${t}">${D.tiers[t].name}</button>`).join("")}
        ${CM ? `<button type="button" class="mv-chip glass ${st.stay === "apt" ? "on" : ""}" data-stay>🏠 ${st.stay === "apt" ? "Airbnb" : T("فندق", "Hotel")} ⇄</button>` : ""}`;
      document.getElementById("mvLegend").innerHTML = `<b>${legendTitle()}</b><div class="mv-bar"></div><div class="mv-ends"><span>${T("أرخص", "Cheaper")} · ${money(vmin)}</span><span>${T("أغلى", "Pricier")} · ${money(vmax)}</span></div><small>${T("أسعار تقديرية", "Estimated prices")}${CM ? T(" · مواقع الأحياء تقريبية", " · approximate neighbourhood layout") : ""}</small>`;
      // التدرج الحراري بتدرجات شعاعية بدل فلتر الضباب (أخف بكثير)
      grads.innerHTML = items.map((i) => `<radialGradient id="hg-${i.id}"><stop offset="0" stop-color="${heatCol(norm(i.v))}" stop-opacity=".85"/><stop offset=".55" stop-color="${heatCol(norm(i.v))}" stop-opacity=".45"/><stop offset="1" stop-color="${heatCol(norm(i.v))}" stop-opacity="0"/></radialGradient>`).join("");
      heat.innerHTML = items.map((i) => `<circle cx="${i.x}" cy="${i.y}" r="${CM ? (i.main ? 190 : 165) : i.main ? 46 : 38}" fill="url(#hg-${i.id})"/>`).join("");
      pinsL.innerHTML = items.map((i) => `<button type="button" class="mv-pin ${i.id === sel ? "sel" : ""}" data-id="${i.id}" aria-label="${esc(i.name)} ${money(i.v)}"><span class="pdot" style="background:${heatCol(norm(i.v))}"></span><span class="pin-in"><span class="pb"><i style="background:${heatCol(norm(i.v))}"></i>${money(i.v)}</span><span class="pn">${esc(i.name)}</span></span></button>`).join("");
      pinEls = [...pinsL.children].map((el) => ({ el, it: items.find((x) => x.id === el.dataset.id), w: 0 }));
      pinEls.forEach((p) => { p.w = p.el.querySelector(".pb").offsetWidth || 90; });
      lastDeclK = -1;
    };

    // الكاميرا: شاشة = (نقطة − أصل العالم) × س + إزاحة
    let base = 1, cam = { k: 1, tx: 0, ty: 0 }, pinEls = [], lastDeclK = -1, raf = 0, idleT = 0;
    const usable = () => {
      const r = stage.getBoundingClientRect(), desk = window.innerWidth > 860;
      const sheetW = desk ? 420 : 0, top = desk ? 130 : 135, bot = desk ? 30 : r.height * 0.4 + 95;
      const x0 = desk && !EN_ON ? sheetW : 0;
      return { x: x0 + 20, y: top, w: Math.max(200, r.width - sheetW - 40), h: Math.max(160, r.height - top - bot), W: r.width, H: r.height };
    };
    const S = () => base * cam.k;
    const toScreen = (x, y) => [(x - W0.x) * S() + cam.tx, (y - W0.y) * S() + cam.ty];
    const toWorld = (sx, sy) => [(sx - cam.tx) / S() + W0.x, (sy - cam.ty) / S() + W0.y];
    const FB = () => fitB || bounds;
    const fitCam = () => {
      const u = usable(), bounds = FB();
      const sc = Math.min(u.w / bounds[2], u.h / bounds[3]);
      // نرسم العالم بدقة أعلى من الشاشة عشان يبقى حاد مع التكبير
      base = Math.min(6, Math.max(1, sc * 1.6));
      world.style.width = W0.w * base + "px"; world.style.height = W0.h * base + "px";
      cam.k = sc / base;
      cam.tx = u.x + (u.w - bounds[2] * sc) / 2 - (bounds[0] - W0.x) * sc;
      cam.ty = u.y + (u.h - bounds[3] * sc) / 2 - (bounds[1] - W0.y) * sc;
    };
    const kMin = () => Math.min(usable().w / bounds[2], usable().h / bounds[3]) / base * 0.8, kMax = () => (usable().w / FB()[2]) / base * 6;
    const clampK = (k) => Math.max(kMin(), Math.min(kMax(), k));
    const draw = () => {
      raf = 0;
      world.style.transform = `translate3d(${cam.tx}px,${cam.ty}px,0) scale(${cam.k})`;
      for (const p of pinEls) { const [x, y] = toScreen(p.it.x, p.it.y); p.el.style.transform = `translate3d(${x}px,${y}px,0)`; }
      if (Math.abs(cam.k - lastDeclK) > 1e-6) { lastDeclK = cam.k; declutter(); }
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const moving = () => { world.classList.add("moving"); clearTimeout(idleT); idleT = setTimeout(() => world.classList.remove("moving"), 220); };
    const prio = (i) => (i.id === sel ? 1e6 : 0) + (i.main ? 1e5 : 0) + (i.c ? i.c.places.length : -Math.abs(i.d.walk));
    function declutter() {
      const placed = [];
      [...pinEls].sort((a, b) => prio(b.it) - prio(a.it)).forEach((p) => {
        const [x, y] = toScreen(p.it.x, p.it.y);
        const box = [x - p.w / 2 - 4, y - 40, x + p.w / 2 + 4, y + 18];
        const hit = placed.some((q) => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1]);
        p.el.classList.toggle("mini", hit);
        if (!hit) placed.push(box);
      });
    }
    const zoomAt = (f, sx, sy) => {
      const k2 = clampK(cam.k * f), r = k2 / cam.k;
      cam.tx = sx - (sx - cam.tx) * r; cam.ty = sy - (sy - cam.ty) * r; cam.k = k2;
      moving(); req();
    };
    // حركة ناعمة للكاميرا
    let anim = 0;
    const flyTo = (to, ms = 380) => {
      cancelAnimationFrame(anim);
      const from = { ...cam }, t0 = performance.now(), ease = (t) => 1 - Math.pow(1 - t, 3);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms), e = ease(t);
        cam = { k: from.k + (to.k - from.k) * e, tx: from.tx + (to.tx - from.tx) * e, ty: from.ty + (to.ty - from.ty) * e };
        moving(); draw();
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const zoomBy = (f) => { const u = usable(), sx = u.x + u.w / 2, sy = u.y + u.h / 2, k2 = clampK(cam.k * f), r = k2 / cam.k; flyTo({ k: k2, tx: sx - (sx - cam.tx) * r, ty: sy - (sy - cam.ty) * r }); };

    // السحب والتكبير بالأصابع مع انزلاق بعد الإفلات
    const ptrs = new Map();
    let last = null, moved = false, vel = { x: 0, y: 0, t: 0 }, glide = 0;
    stage.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".mv-pin") && e.pointerType === "mouse") { moved = false; return; }
      cancelAnimationFrame(anim); cancelAnimationFrame(glide);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      last = { x: e.clientX, y: e.clientY }; moved = false; vel = { x: 0, y: 0, t: performance.now() };
    });
    stage.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const r = stage.getBoundingClientRect();
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a2, b2] = [...ptrs.values()];
        const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
        if (d0 > 0) zoomAt(d1 / d0, (a2.x + b2.x) / 2 - r.left, (a2.y + b2.y) / 2 - r.top);
        moved = true; return;
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!moved) { moved = true; stage.setPointerCapture(e.pointerId); stage.classList.add("dragging"); }
      const now = performance.now(), dt = Math.max(1, now - vel.t);
      vel = { x: dx / dt, y: dy / dt, t: now };
      cam.tx += dx; cam.ty += dy; last = { x: e.clientX, y: e.clientY };
      moving(); req();
    });
    const up = (e) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size === 1) { const [p] = ptrs.values(); last = { ...p }; return; }
      stage.classList.remove("dragging");
      if (moved && performance.now() - vel.t < 80 && Math.hypot(vel.x, vel.y) > 0.15) {
        let vx = vel.x * 16, vy = vel.y * 16;
        const step = () => { vx *= 0.92; vy *= 0.92; cam.tx += vx; cam.ty += vy; moving(); draw(); if (Math.hypot(vx, vy) > 0.4) glide = requestAnimationFrame(step); };
        glide = requestAnimationFrame(step);
      }
    };
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", (e) => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    document.querySelector(".mv-ctl").addEventListener("click", (e) => {
      const z = e.target.closest("[data-z]"); if (!z) return;
      if (z.dataset.z === "in") zoomBy(1.6); else if (z.dataset.z === "out") zoomBy(1 / 1.6);
      else { const keep = { ...cam }; fitCam(); const to = { ...cam }; cam = keep; flyTo(to, 450); }
    });

    // البطاقة
    const paint = () => {
      const it = items.find((i) => i.id === sel);
      pinEls.forEach((p) => p.el.classList.toggle("sel", p.it.id === sel));
      declutter();
      const diff = Math.round(((it.v - avg) / avg) * 100);
      const diffTxt = diff < -3 ? T(`<b>أرخص ${-diff}%</b> من المتوسط`, `<b>${-diff}% cheaper</b> than average`) : diff > 3 ? T(`<b>أغلى ${diff}%</b> من المتوسط`, `<b>${diff}% pricier</b> than average`) : T("<b>قريب من المتوسط</b>", "<b>About average</b>");
      if (!CM) {
        const c = it.c;
        const canZoom = !!cities[c.id];
        const curve = seasonCurve(c).map((x) => value(c) * x);
        const cheapM = MONTHS[curve.indexOf(Math.min(...curve))];
        const ix = items.findIndex((i) => i.id === sel);
        const tags = Object.entries(c.interests).filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]).map(([k]) => `<span class="mv-tag">${ICONS[k]} ${esc(D.interests[k])}</span>`).join("");
        const who = [c.interests.fun >= 2 || c.interests.beach >= 2 ? T("👨‍👩‍👧 العوائل", "👨‍👩‍👧 Families") : "", c.interests.beach >= 2 || c.interests.nature >= 3 ? T("💑 الأزواج", "💑 Couples") : "", c.interests.nature >= 3 ? T("🥾 محبي المغامرة", "🥾 Adventurers") : "", c.interests.history >= 3 ? T("🏛️ محبي التاريخ", "🏛️ History lovers") : "", c.interests.food >= 2 ? T("🍜 محبي الأكل", "🍜 Foodies") : ""].filter(Boolean).slice(0, 3);
        const tops = allPlaces.filter((p) => p.city === c).sort((a, b) => b.rating - a.rating).slice(0, 3);
        sheet.innerHTML = `
          <div class="mv-grab" role="button" aria-label="${T("كبّر البطاقة", "Expand")}"></div>
          <div class="mv-strip" role="tablist">${items.map((i) => `<button type="button" role="tab" class="mv-sc ${i.id === sel ? "on" : ""}" data-sel="${i.id}" aria-selected="${i.id === sel}"><i style="background:${heatCol(norm(i.v))}"></i>${esc(i.name)}</button>`).join("")}</div>
          <div class="mv-art">${cityScene(c, true)}${photoOver(cityWiki(c))}${c.id === M.capital ? `<span class="mv-badge">📍 ${T("العاصمة", "Capital")}</span>` : ""}
            <button type="button" class="mv-nav prev" data-sel="${items[(ix - 1 + items.length) % items.length].id}" aria-label="${T("المدينة السابقة", "Previous city")}">${T("›", "‹")}</button><button type="button" class="mv-nav next" data-sel="${items[(ix + 1) % items.length].id}" aria-label="${T("المدينة التالية", "Next city")}">${T("‹", "›")}</button></div>
          <div class="mv-body">
            <div><h2>${esc(c.name)}</h2><div class="mv-sub">${esc(c.region)} · ${c.places.length} ${T("مكان", "places")} · ${T("المدة المقترحة", "suggested")} ${dayWord(c.days.ideal)}</div></div>
            <p class="mv-sum">${esc(c.summary)}</p>
            ${tags ? `<div class="mv-tags">${tags}</div>` : ""}
            ${who.length ? `<div class="mv-who"><small>${T("مناسبة لـ", "Great for")}</small>${who.map((w) => `<span>${w}</span>`).join("")}</div>` : ""}
            <div class="mv-kpis"><div><small>🏨 ${T("الليلة", "Night")}</small><b>${money(c.costs.hotel[st.tier])}</b></div><div><small>🍽️ ${T("اليوم", "Day")}</small><b>${money(c.costs.food[st.tier])}</b></div><div><small>🚕 ${T("اليوم", "Day")}</small><b>${money(c.costs.transport[st.tier])}</b></div></div>
            ${tops.length ? `<div class="mv-tops"><small>⭐ ${T("أبرز الأماكن", "Top sights")}</small>${tops.map((p) => `<button type="button" class="mv-top-p" data-place="${p.key}">${photoBox(p)}<span><b>${esc(p.name)}</b><em>★ ${p.rating.toFixed(1)} · ${p.fee ? money(p.fee) : T("مجانًا", "Free")}</em></span></button>`).join("")}</div>` : ""}
            <div class="mv-best">🌤️ <span><small>${T("أفضل وقت", "Best time")}</small>${esc(c.bestTime)}</span></div>
            <div class="mv-spark"><small>${T(`السعر خلال السنة (تقديري) · الأرخص في ${cheapM}`, `Price through the year (est.) · cheapest in ${cheapM}`)}</small>${sparkSVG(curve)}</div>
            <div class="mv-tip">💡 ${diffTxt} ${T("في", "in")} ${esc(D.name)}.</div>
            <div class="mv-cta">${canZoom ? `<a class="p" href="${B()}/map/${c.id}">🔍 ${T("قرّب على", "Zoom into")} ${esc(c.short || c.name)}</a>` : `<a class="p" href="${B()}/city/${c.id}">${T("صفحة الوجهة", "Destination page")}</a>`}<a class="s" href="${B()}/plan">${T("خطط رحلة", "Plan a trip")}</a></div>
          </div>`;
      } else {
        const d = it.d;
        const nearCheaper = items.filter((x) => x.id !== d.id && x.d.walk <= 15 && x.v < it.v).sort((a, b) => a.v - b.v)[0];
        const tip = nearCheaper ? T(`<b>وفّر ${Math.round((1 - nearCheaper.v / it.v) * 100)}%:</b> اسكن في ${esc(nearCheaper.name)} (${money(nearCheaper.v)}) وتوصل الحي القديم في ${nearCheaper.d.walk} دقيقة.`, `<b>Save ${Math.round((1 - nearCheaper.v / it.v) * 100)}%:</b> stay in ${esc(nearCheaper.name)} (${money(nearCheaper.v)}) and reach the Old Quarter in ${nearCheaper.d.walk} min.`) : diffTxt + T(" في المدينة.", " in the city.");
        const byWalk = [...items].sort((a, b) => a.d.walk - b.d.walk).map((x) => x.v);
        const q = `${d.name[1]}, ${cityWiki(city)}, ${(window.EN_DATA && window.EN_DATA.asia[D.id]) || ""}`;
        const gp = getPlan();
        const dates = gp.startDate && gp.endDate ? `&checkin=${gp.startDate}&checkout=${gp.endDate}` : "";
        sheet.innerHTML = `
          <div class="mv-grab"></div>
          <div class="mv-art">${cityScene(city, true)}${d.main ? `<span class="mv-badge">⭐ ${T("الأكثر طلبًا", "Most popular")}</span>` : ""}</div>
          <div class="mv-body">
            <div><h2>${esc(it.name)}</h2><div class="mv-sub">${esc(L(d.desc))}</div></div>
            <div class="mv-kpis"><div><small>🏨 ${T("فندق", "Hotel")}</small><b>${money(city.costs.hotel[st.tier] * d.f)}</b></div><div><small>🏠 Airbnb</small><b>${money((city.costs.hotel[st.tier] * d.f * STAY.apt[st.tier]) / 2)}</b></div><div><small>🚶 ${T("للمعالم", "To sights")}</small><b>${d.walk ? `${d.walk} ${T("د", "min")}` : T("مشي", "walk")}</b></div></div>
            <div class="mv-tip">💡 ${tip}</div>
            <div class="mv-spark"><small>${T("سعر الليلة كل ما بعدت عن الحي القديم (تقديري)", "Nightly price by distance from the Old Quarter (est.)")}</small>${sparkSVG(byWalk)}</div>
            <div class="mv-cta"><a class="p" target="_blank" rel="noopener" href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}&group_adults=${gp.travelers}${dates}">Booking ↗</a><a class="s" target="_blank" rel="noopener" href="https://www.airbnb.com/s/${encodeURIComponent(q)}/homes?adults=${gp.travelers}${dates}">Airbnb ↗</a></div>
          </div>`;
      }
      loadPhotos(sheet);
      const strip = sheet.querySelector(".mv-strip"), on = strip && strip.querySelector(".on");
      if (on) strip.scrollLeft += on.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - on.offsetWidth) / 2;
    };
    // اختيار مدينة: نقرّب عليها ونخليها في نص الجزء الظاهر من الخريطة
    const selectCity = (id) => {
      sel = id; store.set("mapSel:" + (cityId || D.id), sel); paint();
      const it = items.find((i) => i.id === sel), u = usable();
      const fitK = Math.min(u.w / FB()[2], u.h / FB()[3]) / base;
      const k2 = clampK(Math.max(cam.k, fitK * (CM ? 1.25 : 2)));
      const S2 = base * k2;
      flyTo({ k: k2, tx: u.x + u.w / 2 - (it.x - W0.x) * S2, ty: u.y + u.h / 2 - (it.y - W0.y) * S2 }, 450);
    };
    pinsL.addEventListener("click", (e) => {
      const b = e.target.closest(".mv-pin"); if (!b || moved) return;
      selectCity(b.dataset.id);
    });
    sheet.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sel]");
      if (b) { selectCity(b.dataset.sel); return; }
      if (e.target.closest(".mv-grab")) sheet.classList.toggle("full");
    });
    document.getElementById("mvChips").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.layer) st.layer = b.dataset.layer;
      if (b.dataset.tier) st.tier = b.dataset.tier;
      if (b.hasAttribute("data-stay")) st.stay = st.stay === "apt" ? "hotel" : "apt";
      save(); compute(); paintData(); draw(); paint();
    });

    paintData();
    const kept = window.__mvCam && window.__mvCam.for === (cityId || D.id) ? window.__mvCam : null;
    fitCam();
    if (kept && kept.base === base) cam = { k: kept.k, tx: kept.tx, ty: kept.ty };
    draw(); paint();
    const saveCam = () => { window.__mvCam = { ...cam, base, for: cityId || D.id }; };
    window.addEventListener("pagehide", saveCam);
    window.addEventListener("hashchange", function onH() { saveCam(); window.removeEventListener("hashchange", onH); }, { once: true });
    let rT = 0;
    window.addEventListener("resize", function onR() { if (!document.body.contains(stage)) return window.removeEventListener("resize", onR); clearTimeout(rT); rT = setTimeout(() => { fitCam(); draw(); }, 120); });
  }

  function viewNotFound() {
    app.innerHTML = `<div class="wrap"><h1 class="display">${T("الصفحة مو موجودة", "Page not found")}</h1><p><a href="#/">${T("ارجع للرئيسية", "Back to home")}</a></p></div>`;
  }

  // ---------- عمق الطبقات مع التمرير ----------
  let ticking = false;
  function parallax() {
    ticking = false;
    const y = window.scrollY;
    document.querySelectorAll(".hero [data-depth]").forEach((el) => { el.style.transform = `translateY(${(y * parseFloat(el.dataset.depth)).toFixed(1)}px)`; });
  }
  if (!reduced) window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });

  // الشريط يختفي مع النزول ويرجع مع الطلوع
  const bar = document.querySelector(".topbar");
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) < 6) return;
    bar.classList.toggle("hide", y > lastY && y > 120);
    lastY = y;
  }, { passive: true });

  // ---------- تثبيت الحجم: منع تكبير الصفحة (الخريطة لها تكبيرها الخاص) ----------
  ["gesturestart", "gesturechange"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1 && !e.target.closest(".mv-stage")) e.preventDefault(); }, { passive: false });
  window.addEventListener("wheel", (e) => { if (e.ctrlKey && !e.target.closest(".mv-stage")) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault(); });

  // ---------- التوجيه ----------
  function render() {
    document.querySelectorAll("body > .drawer, body > .drawer-bg").forEach((el) => el.remove());
    document.body.classList.remove("drawer-on");
    const h = location.hash.replace(/^#\/?/, "");
    let parts = h.split("/").filter(Boolean);
    // روابط قديمة بدون دولة تروح لفيتنام
    if (["city", "plan", "places", "before"].includes(parts[0])) parts = ["c", "vietnam", ...parts];
    if (pdlg.open) pdlg.close();
    if (dlg.open) dlg.close();
    let page = "world";
    if (!parts.length) viewWorld();
    else if (parts[0] === "c" && W.countries[parts[1]]) {
      setCountry(W.countries[parts[1]]);
      const [, , sub, arg] = parts;
      page = sub || "country";
      if (!sub) viewCountry();
      else if (sub === "city") viewCity(arg);
      else if (sub === "places") viewPlaces();
      else if (sub === "before") viewBefore();
      else if (sub === "plan") viewPlan(+arg);
      else if (sub === "map") viewMap(arg);
      else if (sub === "build") viewBuild();
      else viewNotFound();
    } else if (W.continents.some((k) => k.id === parts[0])) { page = "continent"; viewContinent(parts[0]); }
    else viewNotFound();
    document.body.className = "page-" + (page === "country" || page === "world" || page === "city" ? (page === "city" ? "city" : "home") : page);
    paintNav(page, parts[0] === "c");
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

  // ---------- الشريط ----------
  function paintNav(page, inCountry) {
    const nav = document.getElementById("nav");
    const last = W.countries[store.get("lastCountry", "")] || null;
    const C = inCountry ? D : last;
    const base = C ? "#/c/" + C.id : "#/asia";
    nav.innerHTML = `
      <a href="#/" data-route="world" aria-label="${T("القارات", "Continents")}"><i>🌍</i>${T("الوجهات", "Explore")}</a>
      ${C ? `<a href="${base}" data-route="country" aria-label="${esc(C.name)}"><i>${C.flag}</i>${esc(C.name)}</a>` : ""}
      ${C && window.MAPS && window.MAPS[C.id] ? `<a href="${base}/map" data-route="map"><i>🗺️</i>${T("الخريطة", "Map")}</a>` : ""}
      ${C ? `<a href="${base}/plan" data-route="plan"><i>🎫</i>${T("ميزانيتي", "Budget")}</a><a href="${base}/places" data-route="places"><i>📍</i>${T("الأماكن", "Places")}</a><a href="${base}/before" data-route="before" class="nav-2nd"><i>🧳</i>${T("قبل السفر", "Prep")}</a>` : ""}`;
    document.body.classList.toggle("nav-solo", !C);
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.route === page || (page === "city" && a.dataset.route === "country") || (page === "continent" && a.dataset.route === "world")));
    const loc = curBox.querySelector('[data-cur="LOCAL"]');
    loc.textContent = C ? C.currency.name : T("محلي", "Local");
    curBox.querySelector('[data-cur="SAR"]').textContent = T("ريال", "SAR");
    curBox.style.display = inCountry ? "" : "none";
  }

  // ---------- العملة ----------
  const curBox = document.getElementById("currency");
  const paintCurrency = () => curBox.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.cur === currency));
  curBox.addEventListener("click", (e) => {
    let b = e.target.closest("button");
    if (!b) return;
    // على الجوال يظهر زر واحد، والضغط عليه ينقل للعملة اللي بعدها
    if (b.classList.contains("on") && window.matchMedia("(max-width: 560px)").matches) {
      const all = [...curBox.querySelectorAll("button")];
      b = all[(all.indexOf(b) + 1) % all.length];
    }
    currency = b.dataset.cur;
    store.set("currency", currency);
    paintCurrency();
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y, behavior: "instant" });
  });

  // زر اللغة
  const langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.textContent = EN_ON ? "ع" : "EN";
    langBtn.setAttribute("aria-label", EN_ON ? "التبديل إلى العربية" : "Switch to English");
    langBtn.addEventListener("click", () => { store.set("lang", EN_ON ? "ar" : "en"); location.reload(); });
  }
  const APK = "https://github.com/1097mbnalll-ui/-Public-/releases/latest/download/rahhal.apk";
  const appDl = document.getElementById("appDl");
  if (appDl) appDl.textContent = T("⬇ حمّل تطبيق الأندرويد (APK)", "⬇ Get the Android app (APK)");
  const foot = document.getElementById("footText");
  if (foot) foot.textContent = T("الأسعار تقريبية ومأخوذة من المصادر المذكورة جنب كل رقم، وتتغير مع الوقت. تأكد منها قبل الحجز.", "Prices are estimates drawn from the sources shown next to each figure, and they change over time. Always check before you book.");
  document.title = T("رحّال: دليل السفر بالميزانية", "Wayfarer — travel planning that starts with your budget");
  document.querySelectorAll(".brand-name").forEach((el) => (el.textContent = T("رحّال", "Wayfarer")));

  paintCurrency();
  window.addEventListener("hashchange", route);
  render();
})();
