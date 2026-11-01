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
        ${window.MAPS && window.MAPS[D.id] ? `<a class="map-cta" href="${B()}/map">🗺️ ${T("افتح خريطة الأسعار التفاعلية", "Open the interactive price map")}</a>` : ""}
        ${ticketForm("heroBudget", { amount: Math.round(plan.budget / rate() / (plan.budgetMode === "pp" ? plan.travelers : 1)), unit: curName(), days: plan.days, travelers: plan.travelers, mode: plan.budgetMode, go: T("وريني الخيارات", "Show my options") })}`,
      poster: { art: cityScene(top, true), wiki: cityWiki(top), title: top.name, caption: T(`${top.places.length} مكان · ${dayWord(top.days.ideal)} مقترحة`, `${top.places.length} places · ${dayWord(top.days.ideal)} suggested`), stamp: T(`${D.cities.length}<br>وجهات`, `${D.cities.length}<br>stops`) },
    }) + `
      <div class="wrap">
        <section class="band" id="cities">
          <div class="band-head"><div><h2 class="display">${T("الوجهات", "Destinations")}</h2><p>${T("اضغط على أي ملصق وشوف أماكنه وأسعاره.", "Tap a poster to see its places and prices.")}</p></div></div>
          <div class="posters">${cards}</div>
        </section>

        ${allPlaces.some((p) => p.gem) ? `
        <section class="band gems-band">
          <div class="band-head">
            <div><h2 class="display">💎 ${T("جواهر ما يعرفها السياح", "Hidden gems")}</h2><p>${T("أماكن رائعة وموثّقة، لكن أغلب الزوار يفوّتونها.", "Wonderful, well-loved places that most visitors miss.")}</p></div>
          </div>
          <div class="pgrid">${allPlaces.filter((p) => p.gem).map((p) => placeCard(p, { showCity: true })).join("")}</div>
        </section>` : ""}

        <section class="band">
          <div class="band-head">
            <div><h2 class="display">${T("أماكن لازم تشوفها", "Don't miss")}</h2><p>${T("اضغط على أي مكان وشوف صورته وتفاصيله.", "Tap any place for photos and details.")}</p></div>
            <a class="btn ghost" href="${B()}/places">${T("كل الأماكن", "All places")} (${allPlaces.length})</a>
          </div>
          <div class="pgrid">${picks.map((p) => placeCard(p, { showCity: true })).join("")}</div>
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

    const tierRows = [
      [T("السكن (لليلة، غرفة لشخصين)", "Stay (per night, room for two)"), c.costs.hotel],
      [T("شقة Airbnb كاملة (لليلة، تكفي 4) — تقدير", "Whole Airbnb flat (per night, sleeps 4) — est."), Object.fromEntries(TIERS.map((t) => [t, Math.round(c.costs.hotel[t] * STAY.apt[t])]))],
      [T("غرفة خاصة في Airbnb (لليلة) — تقدير", "Private Airbnb room (per night) — est."), Object.fromEntries(TIERS.map((t) => [t, Math.round(c.costs.hotel[t] * STAY.room)]))],
      [T("الأكل (للشخص في اليوم)", "Food (per person per day)"), c.costs.food],
      [T("التنقل داخل المدينة (للشخص في اليوم)", "Getting around (per person per day)"), c.costs.transport],
    ].map(([label, v]) => `<tr><td>${label}</td>${TIERS.map((t) => `<td class="num">${v[t] ? money2(v[t]) : `<span class='sub'>${T("مشمول", "Included")}</span>`}</td>`).join("")}</tr>`).join("");

    const places = c.places.map((p, i) => placeCard({ ...p, city: c, key: D.id + ":" + c.id + ":" + i })).join("");
    const areas = c.stayAreas.map((a) => `<div class="area"><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div>`).join("");
    const mosques = c.halal.mosques.length
      ? `<ul class="clean">${c.halal.mosques.map((m) => `<li><b>${esc(m.name)}:</b> ${esc(m.note)}</li>`).join("")}</ul>`
      : `<p>${T("ما فيه مساجد معروفة قريبة للسياح.", "No well-known mosques near the tourist areas.")}</p>`;
    const near = D.cities.filter((o) => o !== c).map((o) => ({ o, t: travel(c, o) })).sort((a, b) => a.t.hours - b.t.hours).slice(0, 6)
      .map(({ o, t }) => `<tr><td><a href="${B()}/city/${o.id}">${esc(o.name)}</a></td><td>${esc(t.mode)}</td><td>${hoursText(t.hours)}</td><td class="num">${money2(t.cost.eco)}</td></tr>`).join("");

    app.innerHTML = `
      ${posterHero({
        kick: `<a href="#/${D.continent}">${T("آسيا", "Asia")}</a> ${T("‹", "›")} <a href="${B()}">${D.flag} ${esc(D.name)}</a>`,
        title: esc(c.name),
        lead: esc(c.summary),
        body: `<div class="tags">${Object.entries(c.interests).filter(([, v]) => v >= 2).map(([k]) => `<span class="tag">${ICONS[k]} ${esc(D.interests[k])}</span>`).join("")}</div>`,
        poster: { art: cityScene(c, true), wiki: cityWiki(c), title: c.short || c.name, caption: `${D.flag} ${esc(D.name)} · ${esc(c.region)}`, stamp: `${c.places.length}<br>${T("مكان", "places")}` },
      })}

      <div class="wrap city-grid">
        <div>
          <section class="block">
            <h2>${T("وش تزور؟", "What to see")} <small class="count">${c.places.length} ${T("مكان", "places")}</small></h2>
            <div class="pgrid">${places}</div>
          </section>

          <section class="block">
            <h2>${T("كم بتصرف؟", "What it costs")}</h2>
            <div class="table-wrap"><table>
              <thead><tr><th></th>${TIERS.map((t) => `<th>${D.tiers[t].name}</th>`).join("")}</tr></thead>
              <tbody>${tierRows}</tbody>
            </table></div>
            ${c.costs.note ? `<p class="hint">${esc(c.costs.note)}</p>` : ""}
            ${src(c.costs.src, c.costs.date, "numbeo")}
          </section>

          <section class="block">
            <h2>${T("وين تسكن؟", "Where to stay")}</h2>
            <div class="areas">${areas}</div>
          </section>

          <section class="block">
            <h2>${T("الأكل الحلال والمساجد", "Halal food & mosques")}</h2>
            <div class="note">${mosques}<p style="margin:10px 0 0">${esc(c.halal.food)}</p>${src(c.halal.src, c.halal.date)}</div>
          </section>

          <section class="block">
            <h2>${T("التنقل", "Getting around")}</h2>
            <ul class="clean">${c.transport.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            <h3 style="margin-top:22px">${T(`أقرب الوجهات من ${esc(c.name)}`, `Nearest stops from ${esc(c.name)}`)}</h3>
            <div class="table-wrap"><table>
              <thead><tr><th>${T("إلى", "To")}</th><th>${T("الطريقة", "How")}</th><th>${T("المدة", "Time")}</th><th>${T("من (للشخص)", "From (per person)")}</th></tr></thead>
              <tbody>${near}</tbody>
            </table></div>
            <p class="hint">${T("المدد والأسعار تقديرية محسوبة من المسافة.", "Times and prices are estimates based on distance.")}</p>
          </section>
        </div>

        <aside class="facts">
          <dl>
            <div><dt>${T("أفضل وقت", "Best time")}</dt><dd>${esc(c.bestTime)}</dd></div>
            <div><dt>${T("المدة المقترحة", "Suggested stay")}</dt><dd>${dayWord(c.days.ideal)}</dd></div>
            <div><dt>${T("السكن لليلة", "Hotels per night")}</dt><dd>${T(`من ${money(c.costs.hotel.eco)} إلى ${money(c.costs.hotel.lux)}`, `${money(c.costs.hotel.eco)} – ${money(c.costs.hotel.lux)}`)}</dd></div>
            <div><dt>${T("أقرب مطار", "Nearest airport")}</dt><dd>${c.code ? `<span dir="ltr">${esc(c.code)}</span>` : `${esc(cityById[c.hub].name)} (${hoursText(c.hubKm / 45)} ${T("بالطريق", "by road")})`}</dd></div>
          </dl>
          <div class="facts-book">🛏️ ${T("أسعار السكن الحقيقية الحين:", "Live lodging prices:")} ${(() => { const gp = getPlan(); return bookingLinks(c, gp.travelers, gp.startDate, gp.endDate) + (gp.startDate && gp.endDate ? `<small>${T("بتواريخ رحلتك", "for your dates")}: ${niceDate(gp.startDate)} – ${niceDate(gp.endDate)}</small>` : ""); })()}</div>
          <a class="btn no-print" href="${B()}/plan">${T("كم تكفيني ميزانيتي؟", "What will my budget cover?")}</a>
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
      </div>`;
    const list = document.getElementById("plist");
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

  function planRoute(route, { days, tier, tiers, stay = "hotel", interests, travelers }) {
    tiers = tiers || { hotel: tier, food: tier, transport: tier };
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
      const pool = c.places.map((p, i) => ({ ...p, key: D.id + ":" + c.id + ":" + i })).filter((p) => p.planner !== false)
        .sort((a, b) => (interests.includes(b.type) ? 1 : 0) - (interests.includes(a.type) ? 1 : 0));
      const slotsOf = (p) => (p.time.includes("يوم كامل") || p.time === "Full day" ? 2 : 1);
      const tr = ci > 0 ? travel(route[ci - 1], c) : null;
      if (tr) inter += tr.cost[tiers.transport];
      for (let d = 0; d < n; d++) {
        dayNo++;
        const last = dayNo === days;
        let slots = 2;
        const items = [];
        if (d === 0 && tr) slots = tr.hours > 5 ? 0 : tr.hours > 2.5 ? 1 : 1;
        if (d === 0 && ci === 0) { items.push({ t: T("الوصول والاستقرار في الفندق", "Arrive and check in"), k: "in" }); slots = 1; }
        if (last) slots = Math.min(slots, 1);
        while (slots > 0 && pool.length) {
          const k = pool.findIndex((p) => slotsOf(p) <= slots);
          if (k < 0) break;
          const p = pool.splice(k, 1)[0];
          slots -= slotsOf(p);
          fees += p.fee;
          items.push({ p });
        }
        if (slots > 0 && !items.length) items.push({ t: T("يوم حر: تسوق وراحة وتجربة أكل محلي", "Free day: shopping, rest and local food"), k: "free" });
        if (last) items.push({ t: T("المغادرة", "Departure"), k: "out" });
        plan.push({ day: dayNo, city: c, items, travel: d === 0 && tr ? { from: route[ci - 1], ...tr } : null, newCity: d === 0 });
        food += c.costs.food[tiers.food];
        local += c.costs.transport[tiers.transport];
        if (!last) hotel += lodging(c, tiers.hotel, stay, travelers);
      }
    });
    const parts = {
      hotel, food: food * travelers, local: local * travelers, fees: fees * travelers, inter: inter * travelers,
      visa: D.visaSAR * D.currency.perSAR * travelers,
      flights: 0,
    };
    return { route, alloc, plan, parts, tier: tier || tiers.hotel, tiers, stay };
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

  function buildOptions(s) {
    const budget = s.budget;
    const fits = [], over = [];
    for (const route of candidates(s.days, s.interests)) {
      // كل مستوى يناسب الميزانية خيار مستقل
      // كل بند (سكن، أكل، تنقل) إما محدد من المستخدم أو تلقائي يتغير مع المستوى
      const pref = s.prefs || {};
      let cheapest = null, any = false;
      const tried = new Set();
      for (const tier of ["lux", "mid", "eco"]) {
        const tiers = Object.fromEntries(PREF_KEYS.map((k) => [k, pref[k] && pref[k] !== "auto" ? pref[k] : tier]));
        const key = PREF_KEYS.map((k) => tiers[k]).join("-");
        if (tried.has(key)) continue;
        tried.add(key);
        const r = planRoute(route, { ...s, tier, tiers, stay: pref.stay || "hotel" });
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
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">${T("ميزانيتي", "My budget")}</h1>
          <p class="lead">${T("اكتب كم معك، ونطلع لك كل الخيارات اللي تناسبك. غيّر أي شي والنتائج تتحدّث مباشرة.", "Enter what you can spend and we'll lay out every trip that fits. Change anything — results update instantly.")}</p>
        </div>
        <div class="planner">
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
              <small class="hint">${T("التلقائي يختار لك أفضل مستوى تكفيه ميزانيتك. أسعار Airbnb تقديرية.", "Auto picks the best level your budget allows. Airbnb prices are estimates.")}</small>
            </div>
            <div class="field">
              <label class="toggle"><input type="checkbox" id="flights" ${s.flights ? "checked" : ""}><span>${T("الميزانية تشمل تذاكر الطيران من السعودية", "Budget includes flights from Saudi Arabia")} <small>(${T(`تقدير ${money(D.flightSAR * D.currency.perSAR)} للشخص ذهاب وعودة`, `est. ${money(D.flightSAR * D.currency.perSAR)} return per person`)})</small></span></label>
            </div>
          </form>
          <div class="result" id="result"></div>
        </div>
      </div>`;

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
      },
    }; };
    const update = (now) => {
      const st = read();
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

  let lastOptions = [];
  function renderOptions(s) {
    const { fits, over } = buildOptions(s);
    lastOptions = fits.length ? fits : over.slice(0, 5);
    const resEl = document.getElementById("result");
    if (s.budget <= 0) { resEl.innerHTML = `<div class="empty-state">${T("اكتب ميزانيتك عشان نطلع لك الخيارات.", "Enter a budget to see your options.")}</div>`; return; }

    const optCard = (r, i, isOver) => {
      const left = s.budget - r.total;
      const chips = r.route.map((c) => `<span class="stop-chip">${c.emoji} ${esc(c.name)} · ${dayWord(r.alloc.get(c))}</span>`).join("");
      return `
        <article class="opt tkt ${isOver ? "over" : ""}">
          <div class="tkt-main">
            <div class="opt-art">${cityScene(r.route[0], true)}${photoOver(cityWiki(r.route[0]))}<span class="tier-badge t-${sameTiers(r.tiers) ? r.tier : "mix"}">${tiersLabel(r.tiers, true)}</span></div>
            <h3>${r.route.map((c) => esc(c.short)).join(` ${FWD} `)}</h3>
            <div class="stops">${chips}</div>
          </div>
          <button type="button" class="tkt-stub" data-opt="${i}">
            <small>${T("التكلفة", "Total")}</small><b>${money(r.total)}</b>
            <small class="pp">${T("على الشخص", "per person")} ${money(r.total / s.travelers)}</small>
            <em class="${isOver ? "neg" : ""}">${isOver ? T("ينقصك", "Short") : T("يبقى", "Left")} ${money(Math.abs(left))}</em>
            <span class="see">${T("شوف البرنامج", "See the plan")}</span>
          </button>
        </article>`;
    };

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
      <div class="summary-line">
        ${fits.length
          ? T(`لقينا لك ${optWord(fits.length)} تناسب ميزانيتك ${money(s.budget)} لـ ${paxWord(s.travelers)} و${dayWord(s.days)}.`, `We found ${optWord(fits.length)} that fit your ${money(s.budget)} budget for ${paxWord(s.travelers)} over ${dayWord(s.days)}.`)
          : T(`ميزانيتك ${money(s.budget)} ما تكفي ${dayWord(s.days)} لـ ${paxWord(s.travelers)} في أي مسار. هذي أقرب الخيارات، أو قلّل الأيام.`, `${money(s.budget)} doesn't stretch to ${dayWord(s.days)} for ${paxWord(s.travelers)} on any route. Here are the closest options — or try fewer days.`)}
        <div class="pp-line">${T("ميزانيتك", "Your budget")}: <b>${money(s.budget)}</b> ${T("للمجموعة", "for the group")} · <b>${money(s.budget / s.travelers)}</b> ${T("على الشخص الواحد", "per person")}</div>
        <span class="hint">${s.flights ? T("شامل تذاكر الطيران الدولي (تقدير).", "Includes international flights (estimate).") : T("بدون تذاكر الطيران الدولي.", "Excludes international flights.")} ${T("شامل التأشيرة والسكن والأكل والتنقل والرسوم.", "Covers visa, hotels, food, transport and entry fees.")}</span>
      </div>
      <div class="opts">${lastOptions.map((r, i) => optCard(r, i, !fits.length)).join("")}</div>

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
              ? `<button type="button" class="prow" data-place="${it.p.key}">${photoBox(it.p)}<span class="prow-t"><b>${esc(it.p.name)}</b><small>★ ${it.p.rating.toFixed(1)} · ${it.p.fee ? money(it.p.fee) : T("مجانًا", "Free")} · ${esc(it.p.time)}</small></span><span class="prow-go" aria-hidden="true">${T("‹", "›")}</span></button>`
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
        <p class="hint">${sameTiers(r.tiers) ? D.tiers[r.tier].desc + ". " : ""}${r.stay === "apt" ? T("السكن شقة Airbnb كاملة لكل 4 أشخاص (سعر تقديري).", "Lodging is a whole Airbnb apartment per 4 people (estimated price).") : r.stay === "room" ? T("السكن غرفة خاصة في Airbnb لكل شخصين (سعر تقديري).", "Lodging is a private Airbnb room per 2 people (estimated price).") : T("السكن غرفة فندقية لكل شخصين.", "Hotels assume one room per two travellers.")} ${T("الأسعار تقريبية، وتقدر تشوف السعر الحقيقي من روابط Booking وAirbnb في كل وجهة.", "Prices are estimates — check live prices with the Booking and Airbnb links for each stop.")}</p>
        <div class="trip">
          <div class="legs">${days}</div>
          <div class="map">${mapSVG(r.route, { animate: true })}</div>
        </div>
        <div class="actions no-print"><button class="btn" type="button" onclick="window.print()">${T("اطبع الخطة أو احفظها PDF", "Print or save as PDF")}</button></div>
      </div>`;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    loadPhotos(dlg);
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
    const CM = cityId && M.cities[cityId];
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
    const unitLabel = () => (st.layer === "hotel" ? T("لليلة", "per night") : T("للشخص باليوم", "pp / day"));

    // النقاط: مدن الدولة أو أحياء العاصمة
    let items, outline = null, bounds;
    if (!CM) {
      outline = M.outline;
      items = D.cities.map((c) => { const [x, y] = M.project(c.lat, c.lon); return { id: c.id, c, x, y, name: c.short || c.name, v: value(c), main: c.id === M.capital }; });
      bounds = [-30, -15, 240, 405];
    } else {
      items = CM.districts.map((d) => ({ id: d.id, d, x: d.x, y: d.y, name: L(d.name), v: value(city, d.f), main: !!d.main }));
      bounds = [-460, -330, 920, 700];
    }
    const vs = items.map((i) => i.v), vmin = Math.min(...vs), vmax = Math.max(...vs);
    const norm = (v) => (vmax === vmin ? 0.5 : (v - vmin) / (vmax - vmin));
    let sel = store.get("mapSel:" + (cityId || D.id), null);
    if (!items.find((i) => i.id === sel)) sel = (items.find((i) => i.main) || items[0]).id;

    const chips = `
      <div class="mv-chips">
        ${LAYERS.map(([k, l]) => `<button type="button" class="mv-chip glass ${st.layer === k ? "on" : ""}" data-layer="${k}">${l}</button>`).join("")}
        <span class="mv-sep"></span>
        ${TIERS.map((t) => `<button type="button" class="mv-chip glass ${st.tier === t ? "on" : ""}" data-tier="${t}">${D.tiers[t].name}</button>`).join("")}
        ${CM ? `<button type="button" class="mv-chip glass ${st.stay === "apt" ? "on" : ""}" data-stay>🏠 ${st.stay === "apt" ? "Airbnb" : T("فندق", "Hotel")} ⇄</button>` : ""}
      </div>`;
    app.innerHTML = `
      <div class="mapview ${CM ? "is-city" : ""}" id="mv">
        <svg id="msvg" class="mv-svg" role="img" aria-label="${T("خريطة الأسعار", "Price map")}">
          <defs>
            <radialGradient id="mvSea" cx="70%" cy="35%" r="90%"><stop offset="0" stop-color="#d5ebe8"/><stop offset="1" stop-color="#a9d1d0"/></radialGradient>
            <filter id="mvBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${CM ? 55 : 14}"/></filter>
            <filter id="mvShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#0f3d3e" flood-opacity=".25"/></filter>
            <pattern id="mvTopo" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0,5 Q2.5,2 5,5 T10,5" fill="none" stroke="#e3d6bb" stroke-width=".6"/></pattern>
            ${outline ? `<clipPath id="mvClip"><path d="${smoothPath(outline)}"/></clipPath>` : ""}
          </defs>
          <rect x="-2000" y="-2000" width="5000" height="5000" fill="${CM ? "#efe7d6" : "url(#mvSea)"}"/>
          <g id="mvBase"></g><g id="mvHeat" filter="url(#mvBlur)" opacity=".78"></g><g id="mvOver"></g><g id="mvPins"></g>
        </svg>
        <div class="mv-top">
          <div class="mv-crumb glass">${CM ? `<a href="${B()}/map">${D.flag} ${esc(D.name)}</a> ‹ <b>${esc(city.short || city.name)}</b> · ${T("الأحياء", "Neighbourhoods")}` : `${D.flag} <b>${esc(D.name)}</b> · ${T("خريطة الأسعار", "Price map")}`}</div>
        </div>
        ${chips}
        <div class="mv-ctl glass"><button type="button" data-z="in" aria-label="${T("تكبير", "Zoom in")}">＋</button><button type="button" data-z="out" aria-label="${T("تصغير", "Zoom out")}">－</button><button type="button" data-z="reset" aria-label="${T("رجوع", "Reset")}">◎</button></div>
        <div class="mv-legend glass"><b>${st.layer === "hotel" ? T("سعر الليلة", "Price per night") : st.layer === "food" ? T("الأكل للشخص باليوم", "Food per person per day") : st.layer === "transport" ? T("التنقل للشخص باليوم", "Transport per person per day") : T("الإجمالي للشخص باليوم", "Total per person per day")}</b><div class="mv-bar"></div><div class="mv-ends"><span>${T("أرخص", "Cheaper")} · ${money(vmin)}</span><span>${T("أغلى", "Pricier")} · ${money(vmax)}</span></div><small>${T("أسعار تقديرية", "Estimated prices")}${CM ? T(" · مواقع الأحياء تقريبية", " · approximate neighbourhood layout") : ""}</small></div>
        <aside class="mv-sheet" id="mvSheet"></aside>
      </div>`;

    const svg = document.getElementById("msvg");
    const base = document.getElementById("mvBase"), heat = document.getElementById("mvHeat"), over = document.getElementById("mvOver"), pinsG = document.getElementById("mvPins");
    // الخلفية
    if (!CM) {
      const land = smoothPath(outline);
      base.innerHTML = `${[...Array(8)].map((_, i) => `<path d="M-80,${i * 55 - 10} C40,${i * 55 - 25} 160,${i * 55 + 15} 320,${i * 55 - 5}" stroke="#fff" stroke-opacity=".2" fill="none" stroke-width=".8"/>`).join("")}
        <path d="${land}" fill="#f4ecdc" filter="url(#mvShadow)"/><path d="${land}" fill="url(#mvTopo)" opacity=".7"/>`;
      heat.setAttribute("clip-path", "url(#mvClip)");
      heat.innerHTML = items.map((i) => `<circle cx="${i.x}" cy="${i.y}" r="${i.main ? 34 : 26}" fill="${heatCol(norm(i.v))}"/>`).join("");
      over.innerHTML = `<path d="${land}" fill="none" stroke="#fff" stroke-width="2"/><path d="${land}" fill="none" stroke="#12312f" stroke-opacity=".25" stroke-width=".7"/>`;
    } else {
      let streets = "";
      for (let i = -9; i <= 9; i++) {
        streets += `<path d="${smoothPath([[-520, i * 55 - 30], [-200, i * 55 + 10], [60, i * 55 - 15], [520, i * 55 + 20]], false)}" stroke="#fff" stroke-width="${i % 3 ? 1.4 : 3.5}" fill="none" opacity=".85"/>`;
        streets += `<path d="${smoothPath([[i * 60 - 20, -420], [i * 60 + 15, -120], [i * 60 - 10, 140], [i * 60 + 20, 420]], false)}" stroke="#fff" stroke-width="${i % 3 ? 1.4 : 3.5}" fill="none" opacity=".85"/>`;
      }
      heat.innerHTML = items.map((i) => `<circle cx="${i.x}" cy="${i.y}" r="${i.main ? 125 : 110}" fill="${heatCol(norm(i.v))}"/>`).join("");
      const w = CM.walk;
      over.innerHTML = `${streets}
        <path d="${smoothPath(CM.lake)}" fill="#a9d1d0"/><path d="${smoothPath(CM.pond)}" fill="#a9d1d0"/>
        <path d="${smoothPath(CM.river, false)}" stroke="#a9d1d0" stroke-width="70" fill="none" stroke-linecap="round"/>
        <path d="M120,-60 L250,-50" stroke="#c8323a" stroke-width="5"/>
        <circle cx="${w.x}" cy="${w.y}" r="${w.r}" fill="rgba(15,61,62,.05)" stroke="#0f3d3e" stroke-width="1.5" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>
        <text x="${w.x + w.r * 0.75}" y="${w.y + w.r + 18}" text-anchor="middle" font-size="13" font-weight="600" fill="#0f3d3e">🚶 ${T("15 دقيقة مشي", "15-min walk")}</text>
        <text x="-165" y="-215" text-anchor="middle" font-size="13" fill="#3f7f86" font-style="italic">${L(CM.lakeName)}</text>
        <text x="190" y="260" text-anchor="middle" font-size="13" fill="#3f7f86" font-style="italic" transform="rotate(-62 190 260)">${L(CM.riverName)}</text>
        ${CM.landmarks.map(([e, x, y]) => `<g><circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="#0f3d3e" stroke-width="1.5"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17">${e}</text></g>`).join("")}`;
    }
    pinsG.innerHTML = items.map((i) => `
      <g class="mv-pin ${i.id === sel ? "sel" : ""}" data-id="${i.id}" data-x="${i.x}" data-y="${i.y}" tabindex="0" role="button" aria-label="${esc(i.name)} ${money(i.v)}">
        <circle class="pdot" r="7" fill="${heatCol(norm(i.v))}" stroke="#fff" stroke-width="2.5"/>
        <g class="mv-pin-in">
          <rect class="pb" x="-44" y="-38" width="88" height="26" rx="13"/>
          <circle cx="-30" cy="-25" r="4.5" fill="${heatCol(norm(i.v))}"/>
          <text class="pv" x="6" y="-20" text-anchor="middle">${money(i.v)}</text>
          <path class="pt" d="M-6,-12.5 L0,-5 L6,-12.5Z"/>
          <text class="pn" y="10" text-anchor="middle">${esc(i.name)}</text>
        </g>
      </g>`).join("");
    // عرض النص بعرض السعر
    pinsG.querySelectorAll(".mv-pin").forEach((g) => {
      const t = g.querySelector(".pv"); const w = Math.max(70, t.getComputedTextLength() + 34);
      const r = g.querySelector(".pb"); r.setAttribute("x", -w / 2); r.setAttribute("width", w);
      g.querySelector(".mv-pin-in circle").setAttribute("cx", -w / 2 + 12); t.setAttribute("x", 7);
    });

    // التكبير والتحريك
    const home = { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] };
    let v = { ...home };
    const fit = () => {
      const r = svg.getBoundingClientRect();
      const sheetW = window.innerWidth > 860 ? 420 : 0;
      const usable = Math.max(200, r.width - sheetW);
      const topR = window.innerWidth > 860 ? 130 : 135, botR = window.innerWidth > 860 ? 30 : r.height * 0.4 + 60;
      const usableH = Math.max(200, r.height - topR - botR);
      const aspect = usableH / usable;
      let w = home.w, h = home.h;
      if (h / w > aspect) w = h / aspect; else h = w * aspect;
      // نوسع العرض عشان البطاقة ما تغطي الخريطة
      const extra = (w * sheetW) / usable;
      const pxH = h / usableH;
      v = { x: home.x - (w - home.w) / 2 - (EN_ON ? 0 : extra), y: home.y - (h - home.h) / 2 - topR * pxH, w: w + extra, h: h + (topR + botR) * pxH };
    };
    const apply = () => {
      svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
      const k = v.w / svg.getBoundingClientRect().width;
      pinsG.querySelectorAll(".mv-pin").forEach((g) => g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`));
      declutter(k);
    };
    // الدبابيس المتزاحمة تتحول لنقطة صغيرة، والأولوية للمختار والعاصمة والأكثر أماكن
    const prio = (i) => (i.id === sel ? 1e6 : 0) + (i.main ? 1e5 : 0) + (i.c ? i.c.places.length : -Math.abs(i.d.walk));
    const declutter = (k) => {
      const placed = [];
      [...items].sort((a, b) => prio(b) - prio(a)).forEach((i) => {
        const g = pinsG.querySelector(`.mv-pin[data-id="${i.id}"]`);
        const w = (+g.querySelector(".pb").getAttribute("width") + 8) * k, box = [i.x - w / 2, i.y - 40 * k, i.x + w / 2, i.y + 18 * k];
        const hit = placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]);
        g.classList.toggle("mini", hit);
        if (!hit) placed.push(box);
      });
      pinsG.querySelectorAll(".mv-pin:not(.mini)").forEach((g) => pinsG.appendChild(g));
    };
    const zoom = (f, cx, cy) => {
      const nw = Math.max(home.w * 0.15, Math.min(home.w * 3, v.w * f));
      const k = nw / v.w;
      cx = cx ?? v.x + v.w / 2; cy = cy ?? v.y + v.h / 2;
      v = { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: v.w * k, h: v.h * k };
      apply();
    };
    const toWorld = (ev) => { const r = svg.getBoundingClientRect(); return [v.x + ((ev.clientX - r.left) / r.width) * v.w, v.y + ((ev.clientY - r.top) / r.height) * v.h]; };
    svg.addEventListener("wheel", (e) => { e.preventDefault(); const [x, y] = toWorld(e); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
    let drag = null, moved = false;
    const pointers = new Map();
    svg.addEventListener("pointerdown", (e) => { pointers.set(e.pointerId, e); drag = { x: e.clientX, y: e.clientY, v: { ...v } }; moved = false; });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (pointers.size === 2) {
        const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, e);
        const [a, b] = [...pointers.values()];
        const d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const o = a === e ? b : a; const d0 = Math.hypot(prev.clientX - o.clientX, prev.clientY - o.clientY);
        if (d0 && d1) zoom(d0 / d1); moved = true; return;
      }
      const r = svg.getBoundingClientRect();
      const dx = ((e.clientX - drag.x) / r.width) * drag.v.w, dy = ((e.clientY - drag.y) / r.height) * drag.v.h;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) moved = true;
      if (moved && !svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId);
      v = { ...v, x: drag.v.x - dx, y: drag.v.y - dy }; apply();
    });
    const end = (e) => { pointers.delete(e.pointerId); if (!pointers.size) drag = null; };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    document.querySelector(".mv-ctl").addEventListener("click", (e) => {
      const z = e.target.closest("[data-z]"); if (!z) return;
      if (z.dataset.z === "in") zoom(1 / 1.35); else if (z.dataset.z === "out") zoom(1.35); else { fit(); apply(); }
    });

    // البطاقة
    const sheet = document.getElementById("mvSheet");
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    const paint = () => {
      const it = items.find((i) => i.id === sel);
      pinsG.querySelectorAll(".mv-pin").forEach((g) => g.classList.toggle("sel", g.dataset.id === sel));
      declutter(v.w / svg.getBoundingClientRect().width);
      const diff = Math.round(((it.v - avg) / avg) * 100);
      const diffTxt = diff < -3 ? T(`<b>أرخص ${-diff}%</b> من المتوسط`, `<b>${-diff}% cheaper</b> than average`) : diff > 3 ? T(`<b>أغلى ${diff}%</b> من المتوسط`, `<b>${diff}% pricier</b> than average`) : T("<b>قريب من المتوسط</b>", "<b>About average</b>");
      if (!CM) {
        const c = it.c;
        const canZoom = !!M.cities[c.id];
        const curve = seasonCurve(c).map((x) => value(c) * x);
        const cheapM = MONTHS[curve.indexOf(Math.min(...curve))];
        sheet.innerHTML = `
          <div class="mv-grab"></div>
          <div class="mv-art">${cityScene(c, true)}${photoOver(cityWiki(c))}${c.id === M.capital ? `<span class="mv-badge">📍 ${T("العاصمة", "Capital")}</span>` : ""}</div>
          <div class="mv-body">
            <div><h2>${esc(c.name)}</h2><div class="mv-sub">${esc(c.region)} · ${c.places.length} ${T("مكان", "places")} · ${dayWord(c.days.ideal)}</div></div>
            <div class="mv-kpis"><div><small>🏨 ${T("الليلة", "Night")}</small><b>${money(c.costs.hotel[st.tier])}</b></div><div><small>🍽️ ${T("اليوم", "Day")}</small><b>${money(c.costs.food[st.tier])}</b></div><div><small>🚕 ${T("اليوم", "Day")}</small><b>${money(c.costs.transport[st.tier])}</b></div></div>
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
    };
    pinsG.addEventListener("click", (e) => {
      const g = e.target.closest(".mv-pin"); if (!g || moved) return;
      sel = g.dataset.id; store.set("mapSel:" + (cityId || D.id), sel); paint();
      const it = items.find((i) => i.id === sel);
      if (window.innerWidth <= 860) { v = { ...v, x: it.x - v.w / 2, y: it.y - v.h * 0.3 }; apply(); }
    });
    pinsG.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
    document.querySelector(".mv-chips").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.layer) st.layer = b.dataset.layer;
      if (b.dataset.tier) st.tier = b.dataset.tier;
      if (b.hasAttribute("data-stay")) st.stay = st.stay === "apt" ? "hotel" : "apt";
      save(); window.__mvKeep = { ...v }; render();
    });
    fit();
    if (window.__mvKeep && window.__mvKeepFor === (cityId || D.id)) v = window.__mvKeep;
    window.__mvKeep = null; window.__mvKeepFor = cityId || D.id;
    apply(); paint();
    window.addEventListener("resize", function onR() { if (!document.getElementById("msvg")) return window.removeEventListener("resize", onR); fit(); apply(); });
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

  // ---------- التوجيه ----------
  function render() {
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
      ${C ? `<a href="${base}/plan" data-route="plan"><i>🎫</i>${T("ميزانيتي", "Budget")}</a><a href="${base}/places" data-route="places"><i>📍</i>${T("الأماكن", "Places")}</a><a href="${base}/before" data-route="before"><i>🧳</i>${T("قبل السفر", "Prep")}</a>` : ""}`;
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
