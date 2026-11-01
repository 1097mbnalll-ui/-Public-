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
  // السعر بعملة العرض، وتحته بالدونق
  function money2(vnd) {
    if (vnd === 0 || currency === "VND") return money(vnd);
    return `${money(vnd)}<span class="sub">${money(vnd, "VND")}</span>`;
  }

  function src(id, date, id2) {
    const ids = [id, id2].filter(Boolean);
    const links = ids.map((i) => {
      const s = D.sources[i];
      return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : "";
    }).join(" · ");
    return `<div class="src">المصدر: ${links}${date ? ` · آخر تحقق ${esc(date)}` : ""}</div>`;
  }

  // ---------- الرئيسية ----------
  function viewHome() {
    const cards = D.cities.map((c) => {
      const from = c.costs.hotel.eco;
      return `
        <a class="card" href="#/city/${c.id}">
          <div class="emoji">${c.emoji}</div>
          <h3>${esc(c.name)}</h3>
          <div class="region">${esc(c.region)} · ${esc(c.en)}</div>
          <p>${esc(c.summary)}</p>
          <div class="from">السكن من <b>${money(from)}</b> لليلة</div>
        </a>`;
    }).join("");

    app.innerHTML = `
      <section class="hero">
        <span class="kicker">الوجهة الأولى: ${esc(D.country.name)} 🇻🇳</span>
        <h1>رحلتك لفيتنام، من الفكرة لآخر يوم</h1>
        <p class="lead">وين تروح، وين تسكن، وكم بتصرف، ووين تلقى أكل حلال. كل المعلومات في مكان واحد، وجنب كل رقم مصدره.</p>
      </section>

      <div class="paths">
        <a class="path primary" href="#/plan">
          <div class="big">🗺️</div>
          <h3>اعطني خطة جاهزة</h3>
          <p>اختر عدد الأيام والميزانية واهتماماتك، ويطلع لك برنامج يوم بيوم مع التكلفة.</p>
        </a>
        <a class="path" href="#cities" onclick="document.getElementById('cities').scrollIntoView({behavior:'smooth'});return false;">
          <div class="big">🔎</div>
          <h3>أبي أتصفح بنفسي</h3>
          <p>المدن والأماكن ومناطق السكن والأسعار، وتبني رحلتك على كيفك.</p>
        </a>
        <a class="path" href="#/before">
          <div class="big">🧳</div>
          <h3>قبل لا تسافر</h3>
          <p>التأشيرة، أفضل وقت، الصرف، الشريحة، ونصائح للمسافر المسلم.</p>
        </a>
      </div>

      <section class="section" id="cities">
        <h2>المدن</h2>
        <div class="grid">${cards}</div>
      </section>`;
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

    const typeName = (t) => D.interests[t] || "";
    const places = c.places.map((p) => `
      <div class="card place">
        <h3>${esc(p.name)}</h3>
        <div class="meta">
          <span class="fee">${p.fee ? "الدخول " + money(p.fee) : "الدخول مجاني"}</span>
          <span>⏱ ${esc(p.time)}</span>
          <span>${esc(typeName(p.type))}</span>
        </div>
        <p>${esc(p.desc)}</p>
        ${src(p.src, p.date)}
      </div>`).join("");

    const areas = c.stayAreas.map((a) => `
      <div class="card"><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div>`).join("");

    const mosques = c.halal.mosques.length
      ? `<ul class="clean">${c.halal.mosques.map((m) => `<li><b>${esc(m.name)}:</b> ${esc(m.note)}</li>`).join("")}</ul>`
      : `<p>ما فيه مساجد معروفة قريبة للسياح.</p>`;

    const others = D.routes
      .filter((r) => r.from === c.id || r.to === c.id)
      .map((r) => {
        const other = cityById[r.from === c.id ? r.to : r.from];
        return `<tr><td>${esc(other.name)}</td><td>${esc(r.mode)}</td><td>${esc(r.duration)}</td><td class="num">${money2(r.cost.eco)}</td></tr>`;
      }).join("");

    app.innerHTML = `
      <div class="crumbs"><a href="#/">الرئيسية</a> ‹ ${esc(c.name)}</div>
      <h1>${c.emoji} ${esc(c.name)}</h1>
      <div class="badges">
        <span class="badge">${esc(c.region)}</span>
        <span class="badge">المدة المقترحة: ${c.days.ideal} أيام</span>
        ${Object.entries(c.interests).filter(([, v]) => v >= 2).map(([k]) => `<span class="badge">${esc(D.interests[k])}</span>`).join("")}
      </div>
      <p class="lead">${esc(c.summary)}</p>
      <div class="callout">🌤️ <b>أفضل وقت:</b> ${esc(c.bestTime)}</div>

      <section class="section">
        <h2>💰 كم بتصرف؟</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th>${TIERS.map((t) => `<th>${D.tiers[t].name}</th>`).join("")}</tr></thead>
            <tbody>${tierRows}</tbody>
          </table>
        </div>
        ${c.costs.note ? `<p class="hint">${esc(c.costs.note)}</p>` : ""}
        ${src(c.costs.src, c.costs.date, "numbeo")}
      </section>

      <section class="section">
        <h2>📍 وش تزور؟</h2>
        <div class="grid">${places}</div>
      </section>

      <section class="section">
        <h2>🏨 وين تسكن؟</h2>
        <div class="grid">${areas}</div>
      </section>

      <section class="section">
        <h2>🕌 الأكل الحلال والمساجد</h2>
        <div class="card">
          ${mosques}
          <p style="margin-top:10px">${esc(c.halal.food)}</p>
          ${src(c.halal.src, c.halal.date)}
        </div>
      </section>

      <section class="section">
        <h2>🚕 التنقل</h2>
        <ul class="clean">${c.transport.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${others ? `
        <h3 style="margin-top:20px">من ${esc(c.name)} للمدن الثانية</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>إلى</th><th>الطريقة</th><th>المدة</th><th>من (للشخص)</th></tr></thead>
            <tbody>${others}</tbody>
          </table>
        </div>
        ${src(D.routesSrc, D.routesDate)}` : ""}
      </section>

      <div class="section no-print"><a class="btn" href="#/plan">خطط رحلة فيها ${esc(c.name)}</a></div>`;
  }

  // ---------- قبل لا تسافر ----------
  function viewBefore() {
    const blocks = D.before.map((b) => `
      <div class="card">
        <h2 style="font-size:1.25rem">${b.icon} ${esc(b.title)}</h2>
        <ul class="clean">${b.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        ${src(b.src, b.date, b.src2)}
      </div>`).join("");
    app.innerHTML = `
      <h1>قبل لا تسافر</h1>
      <p class="lead">أهم الأشياء اللي لازم تعرفها وتجهزها قبل رحلتك لفيتنام.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${blocks}</div>`;
  }

  // ---------- مخطط الرحلة ----------
  function findRoute(a, b) {
    return D.routes.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a));
  }

  function buildPlan({ days, tier, interests, travelers }) {
    const score = (c) => 1 + interests.reduce((s, i) => s + (c.interests[i] || 0), 0);
    const maxCities = days <= 4 ? 2 : days <= 7 ? 3 : days <= 10 ? 4 : 5;

    // اختيار المدن حسب الاهتمامات. ها لونغ ما تنضاف إلا مع هانوي.
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
    // ترتيب جغرافي من الشمال للجنوب
    const order = (c) => D.cities.indexOf(c);
    chosen.sort((a, b) => order(a) - order(b));
    // لو الأيام ما تكفي الحد الأدنى، شيل الأقل أهمية
    while (chosen.length > 1 && chosen.reduce((s, c) => s + c.days.min, 0) > days) {
      const weakest = [...chosen].sort((a, b) => score(a) - score(b))[0];
      chosen = chosen.filter((c) => c !== weakest && !(weakest.id === "hanoi" && c.id === "halong"));
    }

    // توزيع الأيام
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

    // البرنامج اليومي
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
        if (d === 0 && ci > 0 && route) { travel = `انتقال من ${chosen[ci - 1].name}: ${route.mode} (${route.duration})`; slots = 1; }
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
        plan.push({ day: dayNo, city: c, items, travel });
        foodPP += c.costs.food[tier];
        localPP += c.costs.transport[tier];
        if (!isLastDay) hotel += c.costs.hotel[tier] * rooms;
      }
    });

    const visa = 25 * D.rates.VND_PER_USD;
    const perPerson = feesPP + foodPP + localPP + interPP + visa;
    const total = perPerson * travelers + hotel;
    return {
      chosen, alloc, plan, total, travelers,
      parts: { hotel, food: foodPP * travelers, local: localPP * travelers, fees: feesPP * travelers, inter: interPP * travelers, visa: visa * travelers },
    };
  }

  function viewPlan() {
    const saved = store.get("plan", { days: 7, tier: "mid", interests: ["history", "beach"], travelers: 2 });
    const chips = Object.entries(D.interests).map(([k, v]) => `
      <label class="chip"><input type="checkbox" name="interest" value="${k}" ${saved.interests.includes(k) ? "checked" : ""}><span>${v}</span></label>`).join("");
    const tiers = TIERS.map((t) => `
      <label class="chip"><input type="radio" name="tier" value="${t}" ${saved.tier === t ? "checked" : ""}><span>${D.tiers[t].name}</span></label>`).join("");

    app.innerHTML = `
      <h1>خطط رحلتي</h1>
      <p class="lead">اختر وش يناسبك، ويطلع لك برنامج كامل مع التكلفة التقريبية.</p>
      <div class="planner">
        <form class="card form" id="planForm" onsubmit="return false">
          <div class="field">
            <label for="days">كم يوم؟</label>
            <div class="range-row"><input type="range" id="days" min="3" max="14" value="${saved.days}"><output id="daysOut">${saved.days} أيام</output></div>
          </div>
          <div class="field">
            <label for="travelers">كم شخص؟</label>
            <div class="range-row"><input type="range" id="travelers" min="1" max="6" value="${saved.travelers}"><output id="trOut">${saved.travelers}</output></div>
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
        <div id="result"></div>
      </div>`;

    const form = document.getElementById("planForm");
    const update = () => {
      const days = +form.days.value;
      const travelers = +form.travelers.value;
      const tier = form.querySelector("input[name=tier]:checked")?.value || "mid";
      const interests = [...form.querySelectorAll("input[name=interest]:checked")].map((i) => i.value);
      document.getElementById("daysOut").textContent = days + (days > 10 ? " يوم" : " أيام");
      document.getElementById("trOut").textContent = travelers;
      document.getElementById("tierHint").textContent = D.tiers[tier].desc;
      const s = { days, tier, interests, travelers };
      store.set("plan", s);
      renderResult(buildPlan(s), s);
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
  }

  function renderResult(r, s) {
    const dayWord = (n) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n + " أيام");
    const strip = r.chosen.map((c) => `<a class="stop" href="#/city/${c.id}">${c.emoji} ${esc(c.name)} · ${dayWord(r.alloc.get(c))}</a>`)
      .join('<span class="arrow">←</span>');

    const days = r.plan.map((d) => `
      <div class="day">
        <div class="num">${d.day}<small>اليوم</small></div>
        <div>
          <div class="city">${d.city.emoji} ${esc(d.city.name)}</div>
          ${d.travel ? `<div class="travel">✈️ ${esc(d.travel)}</div>` : ""}
          <ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        </div>
      </div>`).join("");

    const p = r.parts;
    document.getElementById("result").innerHTML = `
      <div class="total">
        <div class="per">التكلفة التقريبية لـ ${r.travelers} ${r.travelers === 1 ? "شخص" : r.travelers === 2 ? "شخصين" : "أشخاص"} (بدون تذاكر الطيران الدولي)</div>
        <div class="amount">${money(r.total)}</div>
        <div class="per">تقريبًا ${money(r.total / r.travelers)} للشخص</div>
        <div class="breakdown">
          <div>السكن<b>${money(p.hotel)}</b></div>
          <div>الأكل<b>${money(p.food)}</b></div>
          <div>التنقل الداخلي<b>${money(p.local)}</b></div>
          <div>بين المدن<b>${money(p.inter)}</b></div>
          <div>رسوم الأماكن<b>${money(p.fees)}</b></div>
          <div>التأشيرة<b>${money(p.visa)}</b></div>
        </div>
      </div>
      <div class="route-strip">${strip}</div>
      <div class="card">${days}</div>
      <p class="hint">السكن محسوب على أساس غرفة لكل شخصين. الأسعار تقريبية، وتفاصيلها ومصادرها في صفحة كل مدينة.</p>
      <div class="no-print" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button class="btn" onclick="window.print()">اطبع الخطة أو احفظها PDF</button>
        <a class="btn ghost" href="#/before">جهّز نفسك قبل السفر</a>
      </div>`;
  }

  function viewNotFound() {
    app.innerHTML = `<h1>الصفحة مو موجودة</h1><p><a href="#/">ارجع للرئيسية</a></p>`;
  }

  // ---------- التوجيه ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    if (h === "cities") return; // رابط داخلي للتمرير
    const [page, arg] = h.split("/");
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (page || "home")));
    if (!page) viewHome();
    else if (page === "city") viewCity(arg);
    else if (page === "before") viewBefore();
    else if (page === "plan") viewPlan();
    else viewNotFound();
    window.scrollTo(0, 0);
  }

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
    route();
    window.scrollTo(0, y);
  });

  paintCurrency();
  window.addEventListener("hashchange", route);
  route();
})();
