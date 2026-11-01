/*
  الهيكل العالمي: القارات والدول والإعدادات المشتركة.
  كل دولة لها ملف في data/countries/ يسجل نفسه عبر addCountry().
  الأسعار داخل كل دولة بعملتها المحلية، والموقع يحوّلها للريال والدولار.
*/
(function () {
  const D = "2026-11";

  window.WORLD = {
    continents: [
      { id: "asia", name: "آسيا", scene: "halong", blurb: "من جزر الملايو لجبال القوقاز", open: true },
      { id: "europe", name: "أوروبا", scene: "domes", blurb: "مدن تاريخية وطبيعة خضراء", open: false },
      { id: "africa", name: "أفريقيا", scene: "dunes", blurb: "سفاري وصحاري وشواطئ", open: false },
      { id: "namerica", name: "أمريكا الشمالية", scene: "hcmc", blurb: "مدن عملاقة وحدائق وطنية", open: false },
      { id: "samerica", name: "أمريكا الجنوبية", scene: "terraces", blurb: "الأمازون والأنديز", open: false },
      { id: "oceania", name: "أوقيانوسيا", scene: "phuquoc", blurb: "أستراليا ونيوزيلندا والجزر", open: false },
    ],

    // دول آسيا غير العربية. ready: فيها محتوى كامل
    asia: [
      { id: "turkey", name: "تركيا", flag: "🇹🇷" },
      { id: "malaysia", name: "ماليزيا", flag: "🇲🇾" },
      { id: "indonesia", name: "إندونيسيا", flag: "🇮🇩" },
      { id: "thailand", name: "تايلاند", flag: "🇹🇭" },
      { id: "vietnam", name: "فيتنام", flag: "🇻🇳" },
      { id: "georgia", name: "جورجيا", flag: "🇬🇪" },
      { id: "azerbaijan", name: "أذربيجان", flag: "🇦🇿" },
      { id: "maldives", name: "المالديف", flag: "🇲🇻" },
      { id: "japan", name: "اليابان", flag: "🇯🇵" },
      { id: "southkorea", name: "كوريا الجنوبية", flag: "🇰🇷" },
      { id: "china", name: "الصين", flag: "🇨🇳" },
      { id: "singapore", name: "سنغافورة", flag: "🇸🇬" },
      { id: "philippines", name: "الفلبين", flag: "🇵🇭" },
      { id: "srilanka", name: "سريلانكا", flag: "🇱🇰" },
      { id: "india", name: "الهند", flag: "🇮🇳" },
      { id: "pakistan", name: "باكستان", flag: "🇵🇰" },
      { id: "uzbekistan", name: "أوزبكستان", flag: "🇺🇿" },
      { id: "kazakhstan", name: "كازاخستان", flag: "🇰🇿" },
      { id: "kyrgyzstan", name: "قيرغيزستان", flag: "🇰🇬" },
      { id: "nepal", name: "نيبال", flag: "🇳🇵" },
      { id: "cambodia", name: "كمبوديا", flag: "🇰🇭" },
      { id: "laos", name: "لاوس", flag: "🇱🇦" },
      { id: "myanmar", name: "ميانمار", flag: "🇲🇲" },
      { id: "bangladesh", name: "بنغلاديش", flag: "🇧🇩" },
      { id: "brunei", name: "بروناي", flag: "🇧🇳" },
      { id: "taiwan", name: "تايوان", flag: "🇹🇼" },
      { id: "mongolia", name: "منغوليا", flag: "🇲🇳" },
      { id: "bhutan", name: "بوتان", flag: "🇧🇹" },
      { id: "armenia", name: "أرمينيا", flag: "🇦🇲" },
      { id: "tajikistan", name: "طاجيكستان", flag: "🇹🇯" },
      { id: "turkmenistan", name: "تركمانستان", flag: "🇹🇲" },
      { id: "iran", name: "إيران", flag: "🇮🇷" },
      { id: "timorleste", name: "تيمور الشرقية", flag: "🇹🇱" },
    ],

    countries: {},

    tiers: {
      eco: { name: "اقتصادي", desc: "فنادق بسيطة ونظيفة، أكل شعبي، مواصلات عامة وتطبيقات توصيل" },
      mid: { name: "متوسط", desc: "فنادق 3 إلى 4 نجوم، مطاعم مرتبة، تطبيقات توصيل وسيارات" },
      lux: { name: "فاخر", desc: "فنادق ومنتجعات 5 نجوم، مطاعم راقية، سائق خاص" },
    },

    interests: { nature: "طبيعة", history: "تاريخ وثقافة", beach: "بحر وشواطئ", food: "أكل وأسواق", fun: "ملاهي وترفيه" },

    sources: {
      wikivoyage: { name: "Wikivoyage", url: "https://en.wikivoyage.org/" },
      booking: { name: "تقدير من متوسطات مواقع الحجز (Booking وAgoda)، تأكد قبل الحجز", url: "https://www.agoda.com/" },
      numbeo: { name: "Numbeo: تكاليف المعيشة", url: "https://www.numbeo.com/cost-of-living/" },
      wise: { name: "Wise: سعر الصرف الحقيقي", url: "https://wise.com/gb/currency-converter/" },
      halalspy: { name: "HalalSpy: دليل المسافر المسلم", url: "https://halalspy.com/" },
      visaWiki: { name: "ويكيبيديا: متطلبات التأشيرة للمواطنين السعوديين", url: "https://en.wikipedia.org/wiki/Visa_requirements_for_Saudi_citizens" },
      visaGuide: { name: "VisaGuide: الدول بدون تأشيرة للجواز السعودي", url: "https://visaguide.world/visa-free-countries/saudi-passport/" },
    },
  };

  // أدوات لكتابة البيانات باختصار
  window.P = (name, type, fee, time, desc, wiki, src) => ({ name, type, fee, time, desc, wiki, src: src || "wikivoyage", date: D });
  window.costs = (hotel, food, transport, note) => ({
    hotel: { eco: hotel[0], mid: hotel[1], lux: hotel[2] },
    food: { eco: food[0], mid: food[1], lux: food[2] },
    transport: { eco: transport[0], mid: transport[1], lux: transport[2] },
    note, src: "booking", date: D,
  });
  window.halal = (food, mosques) => ({ food, mosques: mosques || [], src: "halalspy", date: D });
  window.addCountry = (c) => { c.date = c.date || D; window.WORLD.countries[c.id] = c; };
  window.WORLD.DATE = D;
})();
