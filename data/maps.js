// بيانات الخرائط التفاعلية. الأحياء مواقعها تقريبية للتوضيح، والأسعار معامل × سعر فندق المدينة (تقديري)
window.MAPS = {
  vietnam: {
    // حدود فيتنام المبسطة (نفس نقاط الموقع): x = (خط الطول − 102) × 25، y = (23.5 − خط العرض) × 25
    outline: [[82.5,5],[117.5,15],[135,37.5],[150,50],[117.5,67.5],[100,90],[95,120],[112.5,140],[115,150],[140,175],[155,185],[172.5,210],[180,242.5],[182.5,260],[180,282.5],[175,300],[152.5,315],[127.5,328.75],[117.5,345],[70,372.5],[70,350],[62.5,327.5],[77.5,315],[105,312.5],[110,295],[137.5,280],[140,250],[137.5,220],[140,202.5],[130,182.5],[112.5,172.5],[100,152.5],[90,132.5],[62.5,117.5],[50,105],[67.5,90],[30,72.5],[25,50],[5,30],[12.5,20],[37.5,22.5],[57.5,17.5]],
    project: (lat, lon) => [(lon - 102) * 25, (23.5 - lat) * 25],
    capital: "hanoi",
    cities: {
      hanoi: {
        // وحدات الخريطة الداخلية للمدينة (المركز = الحي القديم)
        river: [[150,-420],[120,-260],[175,-120],[150,20],[205,170],[180,320],[230,460]],
        lake: [[-260,-200],[-160,-250],[-70,-215],[-50,-140],[-130,-95],[-230,-110]],
        pond: [[18,-28],[40,-18],[36,14],[14,22],[2,0]],
        lakeName: ["البحيرة الغربية", "West Lake"], riverName: ["النهر الأحمر", "Red River"],
        walk: { x: 20, y: -10, r: 150 },
        districts: [
          { id: "old", name: ["الحي القديم", "Old Quarter"], x: 20, y: -10, f: 1.08, walk: 0, main: true, desc: ["قلب المدينة: أسواق وأكل شارع، وكل المعالم مشي. صاخب بالليل.", "The heart of the city: markets and street food, every sight walkable. Lively at night."] },
          { id: "tayho", name: ["تاي هو", "Tay Ho"], x: -40, y: -165, f: 0.78, walk: 20, desc: ["هادئ على البحيرة الغربية، مقاهي ومطاعم عالمية. مناسب للعوائل.", "Calm, on West Lake, with cafés and international food. Good for families."] },
          { id: "badinh", name: ["با دينه", "Ba Dinh"], x: -110, y: -30, f: 0.7, walk: 15, desc: ["حي الضريح والوزارات، شوارع واسعة وأشجار.", "The mausoleum and ministries district — wide, leafy streets."] },
          { id: "hbt", name: ["هاي با ترونغ", "Hai Ba Trung"], x: 40, y: 140, f: 0.55, walk: 12, desc: ["حي محلي حيوي، فنادق أرخص وقريب من الحي القديم.", "A lively local district with cheaper hotels, close to the Old Quarter."] },
          { id: "dongda", name: ["دونغ دا", "Dong Da"], x: -120, y: 120, f: 0.48, walk: 18, desc: ["سكني ورخيص، قريب من معبد الأدب.", "Residential and cheap, near the Temple of Literature."] },
          { id: "caugiay", name: ["كاو جاي", "Cau Giay"], x: -300, y: -20, f: 0.42, walk: 25, desc: ["حي حديث بمولات ومتحف الأعراق، بعيد شوي عن المعالم.", "A modern district of malls and the Ethnology Museum, a bit far from the sights."] },
          { id: "longbien", name: ["لونغ بيين", "Long Bien"], x: 330, y: -40, f: 0.35, walk: 30, desc: ["عبر النهر، أرخص حي وأهدأ، تحتاج Grab للوصول.", "Across the river — the cheapest, quietest area; you'll need Grab."] },
        ],
        landmarks: [["🛕", -225, -150], ["🕌", -70, 45], ["🎭", 85, 25], ["🌉", 185, -56]],
      },
    },
  },
};
