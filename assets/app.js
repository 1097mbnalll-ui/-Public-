(function () {
  "use strict";

  const D = window.TRAVEL_DATA;
  const app = document.getElementById("app");
  const cityById = Object.fromEntries(D.cities.map((c) => [c.id, c]));
  const TIERS = ["eco", "mid", "lux"];

  // ---------- أدوات مساعدة ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } },
  };

  let currency = store.get("currency", "SAR");

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
  const dayWord = (n) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم");

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

  // ---------- الخريطة ----------
  // حدود فيتنام مبسطة (x = (خط الطول − 102) × 25، y = (23.5 − خط العرض) × 25)
  const OUTLINE = "M82.5,5 L117.5,15 L135,37.5 L150,50 L117.5,67.5 L100,90 L95,120 L112.5,140 L115,150 L140,175 L155,185 L172.5,210 L180,242.5 L182.5,260 L180,282.5 L180,290 L175,300 L152.5,315 L127.5,328.75 L117.5,345 L70,372.5 L70,350 L62.5,327.5 L77.5,315 L105,312.5 L110,295 L137.5,280 L140,250 L137.5,220 L140,202.5 L130,182.5 L112.5,172.5 L100,152.5 L90,132.5 L62.5,117.5 L50,105 L67.5,90 L30,72.5 L25,50 L5,30 L12.5,20 L37.5,22.5 L57.5,17.5 Z";
  const ISLAND = "M45,326 Q52,322 53,330 Q52,340 46,338 Q42,332 45,326 Z";

  function routePath(stops) {
    return stops.map((c, i) => {
      if (i === 0) return `M${c.map.x},${c.map.y}`;
      const p = stops[i - 1].map;
      // انحناء الخط ناحية البحر
      const cx = (p.x + c.map.x) / 2 + 34;
      const cy = (p.y + c.map.y) / 2;
      return `Q${cx},${cy} ${c.map.x},${c.map.y}`;
    }).join(" ");
  }

  let mapId = 0;
  function mapSVG(stops, { animate = false } = {}) {
    const id = "m" + ++mapId;
    const on = new Set(stops.map((c) => c.id));
    const d = routePath(stops);
    const labels = D.cities.map((c) => {
      const active = on.has(c.id);
      const left = c.id === "phuquoc" || c.id === "hanoi";
      const tx = left ? c.map.x - 8 : c.map.x + 8;
      const anchor = left ? "end" : "start";
      const name = c.id === "danang" ? "دا نانغ" : c.id === "hcmc" ? "سايغون" : c.id === "halong" ? "ها لونغ" : c.name;
      return `
        <circle class="dot ${active ? "" : "off"}" cx="${c.map.x}" cy="${c.map.y}" r="${active ? 4.5 : 3}"/>
        <text class="${active ? "" : "off"}" x="${tx}" y="${c.map.y + 4}" text-anchor="${anchor}">${esc(name)}</text>`;
    }).join("");
    return `
      <svg viewBox="-40 0 270 380" role="img" aria-label="خريطة فيتنام ومسار الرحلة">
        <path class="land" d="${OUTLINE}"/>
        <path class="land" d="${ISLAND}"/>
        ${stops.length > 1 ? `
        <mask id="${id}"><path class="reveal ${animate ? "draw" : ""}" d="${d}" pathLength="1" style="--len:1"/></mask>
        <path class="route" d="${d}" mask="url(#${id})"/>` : ""}
        ${labels}
      </svg>`;
  }

  // ---------- عناصر مشتركة ----------
  const ICONS = { history: "🏯", nature: "⛰️", beach: "🏖️", food: "🍜", fun: "🎡" };
  const scene = (id, mid) => {
    const out = window.SCENES[id] ? window.SCENES[id]() : "";
    return mid ? out.replace("xMidYMax slice", "xMidYMid slice") : out;
  };

  // ---------- الرئيسية ----------
  function viewHome() {
    const cards = D.cities.map((c) => `
      <a class="postcard" href="#/city/${c.id}">
        <div class="art">${scene(c.id)}</div>
        <span class="stamp">${esc(c.code)}<small>${esc(c.region)}</small></span>
        <div class="body">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.summary)}</p>
          <div class="foot"><span>${dayWord(c.days.ideal)} مقترحة</span><span>السكن من <b>${money(c.costs.hotel.eco)}</b></span></div>
        </div>
      </a>`).join("");

    const presets = [[4, "استراحة قصيرة"], [7, "أسبوع كامل"], [10, "شمال لجنوب"], [14, "كل فيتنام"]]
      .map(([d, t]) => `<a class="preset" href="#/plan/${d}"><b>${dayWord(d)}</b><span>${t}</span></a>`).join("");

    app.innerHTML = `
      <section class="hero">
        <div class="art">${scene("halong")}</div>
        <div class="wrap hero-in">
          <h1 class="display">فيتنام تنتظرك</h1>
          <p class="lead">وين تروح، وين تسكن، وكم بتصرف، ووين تلقى أكل حلال. خطط رحلتك كاملة قبل ما تحجز.</p>
          <div class="actions">
            <a class="btn" href="#/plan">ابدأ خطة رحلتي</a>
            <a class="btn glass" href="#cities" data-scroll>تصفح المدن</a>
          </div>
        </div>
      </section>

      <div class="wrap">
        <section class="band" id="cities">
          <div class="band-head">
            <div>
              <h2 class="display">اختر محطتك</h2>
              <p>خمس وجهات من الشمال للجنوب. اسحب وشوف.</p>
            </div>
            <div class="arrows no-print">
              <button type="button" data-dir="1" aria-label="السابق">→</button>
              <button type="button" data-dir="-1" aria-label="التالي">←</button>
            </div>
          </div>
          <div class="postcards" id="cards">${cards}</div>
        </section>

        <section class="quick">
          <div class="art">${scene("hcmc")}</div>
          <h2 class="display">كم يوم عندك؟</h2>
          <p>اختر المدة ونرتب لك المدن والأيام والتكلفة، وبعدها عدّل على كيفك.</p>
          <div class="presets">${presets}</div>
        </section>

        <section class="band">
          <div class="tiles">
            <a class="tile" href="#/before"><div class="ico">🧳</div><h3>قائمة التجهيز</h3><p>التأشيرة والصرف والشريحة، وأشّر على اللي خلصته.</p></a>
            <a class="tile" href="#/city/hcmc"><div class="ico">🕌</div><h3>أكل حلال ومساجد</h3><p>في كل مدينة قسم للمطاعم الحلال والمساجد القريبة.</p></a>
            <div class="tile"><div class="ico">🔎</div><h3>كل رقم له مصدر</h3><p>جنب كل سعر مصدره وتاريخ آخر تحقق منه.</p></div>
          </div>
        </section>
      </div>`;

    const cardsEl = document.getElementById("cards");
    app.querySelectorAll(".arrows button").forEach((b) => b.addEventListener("click", () => {
      const w = cardsEl.querySelector(".postcard").offsetWidth + 18;
      cardsEl.scrollBy({ left: w * +b.dataset.dir, behavior: "smooth" });
    }));
  }

  // ---------- صفحة المدينة ----------
  function viewCity(id) {
    const c = cityById[id];
    if (!c) return viewNotFound();

    const tierRows = [
      ["السكن (لليلة، غرفة لشخصين)", c.costs.hotel],
      ["الأكل (للشخص في اليوم)", c.costs.food],
      ["التنقل داخل المدينة (للشخص في اليوم)", c.costs.transport],
    ].map(([label, v]) => `
      <tr><td>${label}</td>${TIERS.map((t) => `<td class="num">${v[t] ? money2(v[t]) : "<span class='sub'>مشمول</span>"}</td>`).join("")}</tr>`).join("");

    const places = c.places.map((p) => `
      <div class="place">
        <div class="ico" aria-hidden="true">${ICONS[p.type] || "📍"}</div>
        <div><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p></div>
        <div class="fee">${p.fee ? money(p.fee) : "مجانًا"}<small>${esc(p.time)}</small></div>
        ${src(p.src, p.date)}
      </div>`).join("");

    const areas = c.stayAreas.map((a) => `<div class="area"><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div>`).join("");

    const mosques = c.halal.mosques.length
      ? `<ul class="clean">${c.halal.mosques.map((m) => `<li><b>${esc(m.name)}:</b> ${esc(m.note)}</li>`).join("")}</ul>`
      : `<p>ما فيه مساجد معروفة قريبة للسياح.</p>`;

    const others = D.routes
      .filter((r) => r.from === c.id || r.to === c.id)
      .map((r) => {
        const other = cityById[r.from === c.id ? r.to : r.from];
        return `<tr><td><a href="#/city/${other.id}">${esc(other.name)}</a></td><td>${esc(r.mode)}</td><td>${esc(r.duration)}</td><td class="num">${money2(r.cost.eco)}</td></tr>`;
      }).join("");

    app.innerHTML = `
      <section class="hero city-hero">
        <div class="art">${scene(c.id)}</div>
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
            <h2>وش تزور؟</h2>
            <div class="places">${places}</div>
          </section>

          <section class="block">
            <h2>كم بتصرف؟</h2>
            <div class="table-wrap">
              <table>
                <thead><tr><th></th>${TIERS.map((t) => `<th>${D.tiers[t].name}</th>`).join("")}</tr></thead>
                <tbody>${tierRows}</tbody>
              </table>
            </div>
            ${c.costs.note ? `<p class="hint">${esc(c.costs.note)}</p>` : ""}
            ${src(c.costs.src, c.costs.date, "numbeo")}
          </section>

          <section class="block">
            <h2>وين تسكن؟</h2>
            <div class="areas">${areas}</div>
          </section>

          <section class="block">
            <h2>الأكل الحلال والمساجد</h2>
            <div class="note">
              ${mosques}
              <p style="margin:10px 0 0">${esc(c.halal.food)}</p>
              ${src(c.halal.src, c.halal.date)}
            </div>
          </section>

          <section class="block">
            <h2>التنقل</h2>
            <ul class="clean">${c.transport.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            ${others ? `
            <h3 style="margin-top:22px">من ${esc(c.name)} للمدن الثانية</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th>إلى</th><th>الطريقة</th><th>المدة</th><th>من (للشخص)</th></tr></thead>
                <tbody>${others}</tbody>
              </table>
            </div>
            ${src(D.routesSrc, D.routesDate)}` : ""}
          </section>
        </div>

        <aside class="facts">
          <dl>
            <div><dt>أفضل وقت</dt><dd>${esc(c.bestTime)}</dd></div>
            <div><dt>المدة المقترحة</dt><dd>${dayWord(c.days.ideal)}</dd></div>
            <div><dt>السكن لليلة</dt><dd>من ${money(c.costs.hotel.eco)} إلى ${money(c.costs.hotel.lux)}</dd></div>
            <div><dt>المطار</dt><dd style="direction:ltr;text-align:end">${esc(c.code)}</dd></div>
          </dl>
          <a class="btn no-print" href="#/plan">خطط رحلة فيها ${esc(c.name)}</a>
        </aside>
      </div>`;
  }

  // ---------- قبل لا تسافر ----------
  function viewBefore() {
    const done = store.get("checklist", {});
    const total = D.before.reduce((s, b) => s + b.points.length, 0);
    const blocks = D.before.map((b, bi) => `
      <div class="check-card" data-card="${bi}">
        <h2><span>${b.icon} ${esc(b.title)}</span><small data-count="${bi}"></small></h2>
        ${b.points.map((p, pi) => {
          const k = bi + "-" + pi;
          return `<label class="check"><input type="checkbox" data-k="${k}" ${done[k] ? "checked" : ""}><span>${esc(p)}</span></label>`;
        }).join("")}
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

  // ---------- مخطط الرحلة ----------
  function findRoute(a, b) {
    return D.routes.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a));
  }

  function buildPlan({ days, tier, interests, travelers }) {
    const score = (c) => 1 + interests.reduce((s, i) => s + (c.interests[i] || 0), 0);
    const maxCities = days <= 4 ? 2 : days <= 7 ? 3 : days <= 10 ? 4 : 5;

    const ranked = [...D.cities].sort((a, b) => score(b) - score(a));
    let chosen = [];
    for (const c of ranked) {
      if (chosen.length >= maxCities) break;
      if (chosen.includes(c)) continue;
      if (c.id === "halong" && !chosen.some((x) => x.id === "hanoi")) {
        if (chosen.length + 2 > maxCities) continue;
        chosen.push(cityById.hanoi);
      }
      chosen.push(c);
    }
    const order = (c) => D.cities.indexOf(c);
    chosen.sort((a, b) => order(a) - order(b));
    while (chosen.length > 1 && chosen.reduce((s, c) => s + c.days.min, 0) > days) {
      const weakest = [...chosen].sort((a, b) => score(a) - score(b))[0];
      chosen = chosen.filter((c) => c !== weakest && !(weakest.id === "hanoi" && c.id === "halong"));
    }

    const alloc = new Map(chosen.map((c) => [c, Math.min(c.days.min, days)]));
    let left = days - [...alloc.values()].reduce((a, b) => a + b, 0);
    const byScore = [...chosen].sort((a, b) => score(b) - score(a));
    for (const cap of ["ideal", "extra"]) {
      let progress = true;
      while (left > 0 && progress) {
        progress = false;
        for (const c of byScore) {
          const limit = cap === "ideal" ? c.days.ideal : c.days.ideal + 3;
          if (left > 0 && alloc.get(c) < limit) { alloc.set(c, alloc.get(c) + 1); left--; progress = true; }
        }
      }
    }

    const plan = [];
    let dayNo = 0;
    let feesPP = 0, foodPP = 0, localPP = 0, interPP = 0, hotel = 0;
    const rooms = Math.ceil(travelers / 2);
    chosen.forEach((c, ci) => {
      const n = alloc.get(c);
      const places = [...c.places].sort((a, b) => {
        const m = (p) => (interests.includes(p.type) ? 1 : 0);
        return m(b) - m(a);
      });
      const slotsOf = (p) => (p.time.includes("يوم كامل") ? 2 : 1);
      let route = null;
      if (ci > 0) {
        route = findRoute(chosen[ci - 1].id, c.id);
        if (route) interPP += route.cost[tier];
      }
      for (let d = 0; d < n; d++) {
        dayNo++;
        const isLastDay = dayNo === days;
        let slots = 2;
        const items = [];
        let travel = null;
        if (d === 0 && ci > 0 && route) { travel = `من ${chosen[ci - 1].name}: ${route.mode} (${route.duration})`; slots = 1; }
        if (d === 0 && ci === 0) { items.push("الوصول والاستقرار في الفندق"); slots = 1; }
        if (isLastDay) slots = Math.min(slots, 1);
        while (slots > 0 && places.length) {
          const idx = places.findIndex((p) => slotsOf(p) <= slots);
          if (idx < 0) break;
          const p = places.splice(idx, 1)[0];
          slots -= slotsOf(p);
          feesPP += p.fee;
          items.push(p.name + (p.fee ? ` (${money(p.fee)})` : ""));
        }
        if (slots > 0 && !items.length) items.push("يوم حر: تسوق وراحة وتجربة أكل محلي");
        if (isLastDay) items.push("المغادرة");
        plan.push({ day: dayNo, city: c, items, travel, newCity: d === 0 });
        foodPP += c.costs.food[tier];
        localPP += c.costs.transport[tier];
        if (!isLastDay) hotel += c.costs.hotel[tier] * rooms;
      }
    });

    const visa = 25 * D.rates.VND_PER_USD;
    const perPerson = feesPP + foodPP + localPP + interPP + visa;
    const total = perPerson * travelers + hotel;
    return {
      chosen, alloc, plan, total, travelers, tier, days,
      parts: { hotel, food: foodPP * travelers, local: localPP * travelers, fees: feesPP * travelers, inter: interPP * travelers, visa: visa * travelers },
    };
  }

  function viewPlan(presetDays) {
    const saved = store.get("plan", { days: 7, tier: "mid", interests: ["history", "beach"], travelers: 2 });
    if (presetDays >= 3 && presetDays <= 14) saved.days = presetDays;
    const chips = Object.entries(D.interests).map(([k, v]) => `
      <label class="chip"><input type="checkbox" name="interest" value="${k}" ${saved.interests.includes(k) ? "checked" : ""}><span>${ICONS[k]} ${v}</span></label>`).join("");
    const tiers = TIERS.map((t) => `
      <label class="chip"><input type="radio" name="tier" value="${t}" ${saved.tier === t ? "checked" : ""}><span>${D.tiers[t].name}</span></label>`).join("");

    app.innerHTML = `
      <div class="wrap">
        <div class="page-title">
          <h1 class="display">خطط رحلتي</h1>
          <p class="lead">غيّر الخيارات، والخطة والتكلفة تتحدّث مباشرة.</p>
        </div>
        <div class="planner">
          <form class="form" id="planForm" onsubmit="return false">
            <div class="field">
              <label for="days">مدة الرحلة <output id="daysOut"></output></label>
              <input type="range" id="days" min="3" max="14" value="${saved.days}">
            </div>
            <div class="field">
              <label for="travelers">عدد المسافرين <output id="trOut"></output></label>
              <input type="range" id="travelers" min="1" max="6" value="${saved.travelers}">
            </div>
            <div class="field">
              <span class="label">الميزانية</span>
              <div class="chips">${tiers}</div>
              <div class="hint" id="tierHint"></div>
            </div>
            <div class="field">
              <span class="label">وش تحب؟</span>
              <div class="chips">${chips}</div>
            </div>
          </form>
          <div class="result" id="result"></div>
        </div>
      </div>`;

    const form = document.getElementById("planForm");
    const resEl = document.getElementById("result");
    let first = true, timer;
    const update = () => {
      const days = +form.days.value;
      const travelers = +form.travelers.value;
      const tier = form.querySelector("input[name=tier]:checked")?.value || "mid";
      const interests = [...form.querySelectorAll("input[name=interest]:checked")].map((i) => i.value);
      document.getElementById("daysOut").textContent = dayWord(days);
      document.getElementById("trOut").textContent = travelers === 1 ? "شخص" : travelers === 2 ? "شخصين" : travelers + " أشخاص";
      document.getElementById("tierHint").textContent = D.tiers[tier].desc;
      const s = { days, tier, interests, travelers };
      store.set("plan", s);
      if (first) { first = false; renderResult(buildPlan(s)); return; }
      resEl.classList.add("updating");
      clearTimeout(timer);
      timer = setTimeout(() => { renderResult(buildPlan(s)); resEl.classList.remove("updating"); }, 120);
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
  }

  function renderResult(r) {
    const first = r.chosen[0];
    const last = r.chosen[r.chosen.length - 1];
    const pax = r.travelers === 1 ? "شخص" : r.travelers === 2 ? "شخصين" : r.travelers + " أشخاص";

    const days = r.plan.map((d) => `
      <li class="tl-day ${d.newCity ? "new-city" : ""}">
        <span class="badge">${d.day}</span>
        <div class="tl-card">
          ${d.newCity ? `<div class="strip">${scene(d.city.id, true)}</div>` : ""}
          <div class="in">
            <div class="where">${esc(d.city.name)}</div>
            ${d.travel ? `<div class="travel">✈ ${esc(d.travel)}</div>` : ""}
            <ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          </div>
        </div>
      </li>`).join("");

    const p = r.parts;
    document.getElementById("result").innerHTML = `
      <div class="pass">
        <div class="pass-art">${scene(last.id, true)}<span class="ttl">بطاقة رحلتك</span></div>
        <div class="pass-main">
          <div class="pass-route">
            <div class="code">${esc(first.code)}<small>${esc(first.name)}</small></div>
            <div class="line"></div>
            <div class="code">${esc(last.code)}<small>${esc(last.name)}</small></div>
          </div>
          <div class="pass-fields">
            <div>المدة<b>${dayWord(r.days)}</b></div>
            <div>المسافرون<b>${pax}</b></div>
            <div>الميزانية<b>${D.tiers[r.tier].name}</b></div>
            <div>المحطات<b>${r.chosen.length === 1 ? "مدينة وحدة" : r.chosen.length === 2 ? "مدينتين" : r.chosen.length + " مدن"}</b></div>
          </div>
        </div>
        <div class="pass-stub">
          <div>
            <div class="k">التكلفة التقريبية</div>
            <div class="amount">${money(r.total)}</div>
            <div class="k">${money(r.total / r.travelers)} للشخص</div>
          </div>
          <div class="barcode" aria-hidden="true"></div>
        </div>
      </div>

      <div class="costs">
        <div>السكن<b>${money(p.hotel)}</b></div>
        <div>الأكل<b>${money(p.food)}</b></div>
        <div>التنقل الداخلي<b>${money(p.local)}</b></div>
        <div>بين المدن<b>${money(p.inter)}</b></div>
        <div>رسوم الأماكن<b>${money(p.fees)}</b></div>
        <div>التأشيرة<b>${money(p.visa)}</b></div>
      </div>
      <p class="hint">بدون تذاكر الطيران الدولي. السكن محسوب غرفة لكل شخصين، والأسعار تقريبية ومصادرها في صفحة كل مدينة.</p>

      <div class="trip">
        <ol class="timeline">${days}</ol>
        <div class="map">${mapSVG(r.chosen, { animate: true })}</div>
      </div>

      <div class="no-print actions">
        <button class="btn" type="button" onclick="window.print()">اطبع الخطة أو احفظها PDF</button>
        <a class="btn ghost" href="#/before">قائمة التجهيز</a>
      </div>`;
  }

  function viewNotFound() {
    app.innerHTML = `<div class="wrap"><h1 class="display">الصفحة مو موجودة</h1><p><a href="#/">ارجع للرئيسية</a></p></div>`;
  }

  // ---------- عمق الطبقات مع التمرير ----------
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;
  function parallax() {
    ticking = false;
    const y = window.scrollY;
    document.querySelectorAll(".hero [data-depth]").forEach((el) => {
      el.style.transform = `translateY(${(y * parseFloat(el.dataset.depth)).toFixed(1)}px)`;
    });
  }
  if (!reduced) window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });

  // ---------- التوجيه ----------
  function render() {
    const h = location.hash.replace(/^#\/?/, "");
    const [page, arg] = h.split("/");
    document.body.className = "page-" + (page || "home");
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (page || "home")));
    if (!page) viewHome();
    else if (page === "city") viewCity(arg);
    else if (page === "before") viewBefore();
    else if (page === "plan") viewPlan(+arg);
    else viewNotFound();
    if (reduced) document.querySelectorAll("svg.scene").forEach((s) => s.pauseAnimations && s.pauseAnimations());
  }

  function route() {
    if (location.hash === "#cities") return;
    const go = () => { render(); window.scrollTo({ top: 0, behavior: "instant" }); };
    if (document.startViewTransition && !reduced) document.startViewTransition(go);
    else go();
  }

  // رابط "تصفح المدن" يمرر بدون تغيير الصفحة
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-scroll]");
    if (!a) return;
    e.preventDefault();
    document.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  // ---------- العملة ----------
  const curBox = document.getElementById("currency");
  function paintCurrency() {
    curBox.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.cur === currency));
  }
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
