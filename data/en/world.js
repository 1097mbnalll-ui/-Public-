// English: shared world data, and the merge that swaps Arabic content for English
(function () {
  const W = window.WORLD;
  const EN = (window.EN_DATA = window.EN_DATA || {});
  EN.continents = {
    asia: ["Asia", "From the Malay islands to the Caucasus"], europe: ["Europe", "Historic cities and green landscapes"],
    africa: ["Africa", "Safaris, deserts and beaches"], namerica: ["North America", "Giant cities and national parks"],
    samerica: ["South America", "The Amazon and the Andes"], oceania: ["Oceania", "Australia, New Zealand and the islands"],
  };
  EN.europe = { czechia: "Czechia", bosnia: "Bosnia & Herzegovina", albania: "Albania", montenegro: "Montenegro", austria: "Austria", hungary: "Hungary", poland: "Poland", switzerland: "Switzerland" };
  EN.asia = {
    turkey: "Türkiye", malaysia: "Malaysia", indonesia: "Indonesia", thailand: "Thailand", vietnam: "Vietnam", georgia: "Georgia", azerbaijan: "Azerbaijan",
    maldives: "Maldives", japan: "Japan", southkorea: "South Korea", china: "China", singapore: "Singapore", philippines: "Philippines", srilanka: "Sri Lanka",
    india: "India", pakistan: "Pakistan", uzbekistan: "Uzbekistan", kazakhstan: "Kazakhstan", kyrgyzstan: "Kyrgyzstan", nepal: "Nepal", cambodia: "Cambodia",
    laos: "Laos", myanmar: "Myanmar", bangladesh: "Bangladesh", brunei: "Brunei", taiwan: "Taiwan", mongolia: "Mongolia", bhutan: "Bhutan", armenia: "Armenia",
    tajikistan: "Tajikistan", turkmenistan: "Turkmenistan", iran: "Iran", timorleste: "Timor-Leste",
  };
  EN.tiers = {
    eco: ["Budget", "Simple, clean hotels, street food, public transport and ride apps"],
    mid: ["Comfort", "3–4 star hotels, sit-down restaurants, ride apps and cars"],
    lux: ["Luxury", "5-star hotels and resorts, fine dining, private driver"],
  };
  EN.interests = { nature: "Nature", history: "History & culture", beach: "Beaches", food: "Food & markets", fun: "Fun & theme parks" };
  EN.time = {
    "ساعة": "1 hour", "ساعتين": "2 hours", "نصف يوم": "Half day", "يوم كامل": "Full day", "مساء": "Evening", "نص ساعة": "30 min",
    "ساعة إلى ساعتين": "1–2 hours", "ساعة ونص": "1.5 hours", "نصف يوم وليلة": "Half day + evening",
  };
  EN.sources = {
    booking: "Estimate from booking-site averages (Booking & Agoda) — check before you book",
    numbeo: "Numbeo: cost of living", wise: "Wise: real exchange rate", halalspy: "HalalSpy: Muslim travel guide",
    visaWiki: "Wikipedia: visa requirements for Saudi citizens", visaGuide: "VisaGuide: visa-free countries for Saudi passports",
  };
  window.addEN = (id, data) => { EN[id] = data; };

  // تبديل المحتوى للإنجليزي قبل ما يبدأ الموقع
  window.applyEnglish = function () {
    W.continents.forEach((k) => { const e = EN.continents[k.id]; if (e) { k.name = e[0]; k.blurb = e[1]; } });
    W.asia.forEach((c) => { if (EN.asia[c.id]) c.name = EN.asia[c.id]; });
    (W.europe || []).forEach((c) => { if (EN.europe[c.id]) c.name = EN.europe[c.id]; });
    Object.entries(EN.tiers).forEach(([k, v]) => { W.tiers[k].name = v[0]; W.tiers[k].desc = v[1]; });
    Object.assign(W.interests, EN.interests);
    Object.entries(EN.sources).forEach(([k, v]) => { if (W.sources[k]) W.sources[k].name = v; });
    Object.values(W.countries).forEach((c) => {
      const e = EN[c.id];
      if (!e) return;
      if (e.sources && c.sources) Object.entries(e.sources).forEach(([k, v]) => { if (c.sources[k]) c.sources[k].name = v; });
      c.name = e.name; c.tagline = e.tagline; c.visaNote = e.visaNote; c.currency.name = e.currency;
      c.cities.forEach((x) => {
        const ec = e.cities[x.id];
        if (!ec) return;
        ["name", "short", "region", "summary", "bestTime"].forEach((f) => { if (ec[f]) x[f] = ec[f]; });
        if (ec.note) x.costs.note = ec.note;
        if (ec.stay) x.stayAreas = ec.stay.map(([name, desc]) => ({ name, desc }));
        if (ec.halal) { x.halal.food = ec.halal.food; x.halal.mosques = (ec.halal.mosques || []).map(([name, note]) => ({ name, note })); }
        if (ec.transport) x.transport = ec.transport;
        x.places.forEach((p, i) => {
          const ep = ec.places && ec.places[i];
          if (ep) { p.name = ep[0]; p.desc = ep[1]; }
          p.time = EN.time[p.time] || p.time;
        });
      });
      if (e.before) c.before.forEach((b, i) => { const eb = e.before[i]; if (eb) { b.title = eb[0]; b.points = eb[1]; } });
    });
  };
})();
