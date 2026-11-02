// أماكن إضافية عليها تقييمات عالية من المسافرين (Trip.com وTourscanner وKlook ودراسة TourCentralAsia لتقييمات TripAdvisor، 2026)
// الرسوم بالعملة المحلية وتقريبية. يتحمّل بعد ملفات الإنجليزي ويضيف الأماكن للعربي والإنجليزي بنفس الترتيب.
// [الاسم، النوع، الرسوم، الوقت، الوصف، ويكيبيديا، الاسم بالإنجليزي، الوصف بالإنجليزي]
(function () {
  const W = window.WORLD, EN = window.EN_DATA || {};
  W.sources.reviews = { name: "تقييمات المسافرين: Trip.com وTourscanner وKlook وTripAdvisor", url: "https://www.trip.com/travel-guide/" };
  if (EN.sources) EN.sources.reviews = "Traveller reviews: Trip.com, Tourscanner, Klook and TripAdvisor";
  const X = {
    kyrgyzstan: {
      bishkek: [
        ["متحف التاريخ الوطني", "history", 300, "ساعتين", "على ساحة آلا تو، من أعلى معالم بشكيك تقييمًا عند الزوار (4.5).", "Kyrgyz National History Museum", "State History Museum", "On Ala-Too Square — one of Bishkek's best-rated sights with visitors (4.5)."],
        ["الحديقة البلوطية (Oak Park)", "nature", 0, "ساعة", "حديقة ظليلة وسط المدينة مليانة منحوتات حجرية، مكان المشي المفضل للسكان.", "Oak Park, Bishkek", "Oak Park", "A shady central park full of stone sculptures — the locals' favourite stroll."],
      ],
      issykkul: [
        ["متحف النقوش الصخرية المفتوح", "history", 300, "ساعتين", "حقل صخور منقوشة بالوعول والصيادين، أنصح فيه أغلب أدلة المسافرين.", "Cholpon-Ata", "Petroglyphs Open-Air Museum", "A field of boulders carved with ibex and hunters, recommended in most traveller guides."],
        ["رحلة قارب في البحيرة", "fun", 1000, "ساعتين", "جولة بالقارب أو اليخت على موية إيسيك كول الصافية مع إطلالة الجبال.", "Issyk-Kul", "Lake boat trip", "A boat or yacht cruise on Issyk-Kul's clear water with mountain views."],
      ],
      karakol: [
        ["وادي قره قول", "nature", 300, "يوم كامل", "وادي غابات صنوبر وأنهار جليدية، من أشهر أماكن المشي حول البلدة.", "Karakol", "Karakol Gorge", "Pine forests and glacial rivers — one of the town's best-loved hikes."],
        ["ينابيع ألتين أراشان الحارة", "nature", 500, "يوم كامل", "مسار جبلي لوادي فيه ينابيع حارة وإطلالة على قمة بالاتكا.", "Altyn-Arashan", "Altyn-Arashan hot springs", "A mountain trail to a valley of hot springs below Palatka peak."],
        ["وادي كركرا", "nature", 0, "نصف يوم", "مراعي واسعة وأزهار وخيول على حدود كازاخستان.", "Karkara Valley", "Karkara Valley", "Wide pastures, wildflowers and horses on the Kazakh border."],
      ],
      songkol: [
        ["ركوب الخيل حول البحيرة", "fun", 1500, "نصف يوم", "جولة خيل مع عائلات الرحّل على مراعي سونغ كول.", "Song-Köl", "Horse riding by the lake", "A horse ride with nomad families across Song-Kol's pastures."],
        ["طريق ممر كالماك أشو", "nature", 0, "ساعتين", "طريق متعرج بإطلالات خيالية في الطريق للبحيرة.", "Song-Köl", "Kalmak-Ashuu Pass road", "A switchback road with spectacular views on the way to the lake."],
      ],
    },
    kazakhstan: {
      almaty: [
        ["متحف الآلات الموسيقية الشعبية", "history", 1000, "ساعة", "مبنى خشبي في حديقة بانفيلوف، فيه آلات كازاخية تقدر تسمع صوتها.", "Museum of Kazakh Musical Instruments", "Folk Instruments Museum", "A wooden building in Panfilov Park full of Kazakh instruments you can hear played."],
        ["شارع أربات (جيبيك جولي)", "food", 0, "ساعتين", "شارع مشاة بمقاهي وفنانين وعروض مساء.", "Zhibek Zholy Street", "The Almaty Arbat", "A pedestrian street of cafés, artists and evening performers."],
      ],
      charyn: [
        ["بحيرة كولساي", "nature", 1500, "يوم كامل", "بحيرات فيروزية بين غابات الصنوبر، تجمعها أغلب الرحلات مع شارين.", "Kolsay Lakes", "Kolsai Lakes", "Turquoise lakes among pine forests, paired with Charyn on most tours."],
        ["بحيرة كايندي", "nature", 1500, "نصف يوم", "بحيرة غرقت فيها غابة، وجذوع الأشجار طالعة من الموية.", "Lake Kaindy", "Kaindy Lake", "A lake that drowned a forest — tree trunks rise from the water."],
      ],
      astana: [
        ["جامع حضرة سلطان", "history", 0, "ساعة", "من أكبر مساجد آسيا الوسطى، أبيض بقباب زرقاء.", "Hazrat Sultan Mosque", "Hazrat Sultan Mosque", "One of Central Asia's largest mosques, white with blue domes."],
        ["خان شاتير", "fun", 0, "ساعتين", "خيمة زجاجية عملاقة فيها مول وشاطئ داخلي.", "Khan Shatyr Entertainment Center", "Khan Shatyr", "A giant glass tent with a mall and an indoor beach."],
      ],
    },
    uzbekistan: {
      tashkent: [
        ["مسرح إلخوم", "fun", 30000, "ساعتين", "أعلى معلم تقييمًا في طشقند حسب دراسة مراجعات TripAdvisor.", "Ilkhom Theatre", "Ilkhom Theatre", "Tashkent's top-rated sight in a study of TripAdvisor reviews."],
      ],
      bukhara: [
        ["مدرسة ألوغ بيك وعبد العزيز خان", "history", 20000, "ساعة", "مدرستين متقابلتين بنقوش فيروزية من القرن الخامس عشر.", "Ulugh Beg Madrasah (Bukhara)", "Ulugh Beg & Abdulaziz Khan madrasas", "Two facing 15th–17th-century madrasas with turquoise tilework."],
        ["قصر ستوري ماخي خاصة", "history", 30000, "ساعتين", "القصر الصيفي لآخر أمير، مزيج روسي وبخاري.", "Sitorai Mohi-Khosa", "Sitorai Mokhi-Khosa Palace", "The last emir's summer palace, a mix of Russian and Bukharan styles."],
      ],
      khiva: [
        ["قلعة كهنة أرك", "history", 25000, "ساعة", "قلعة الخانات داخل الأسوار، وبرجها يطل على المدينة كلها.", "Kuhna Ark", "Kuhna Ark fortress", "The khans' fortress inside the walls; its tower overlooks the whole city."],
        ["قصر تاش حوولي", "history", 25000, "ساعة", "قصر بأفنية مزخرفة بالبلاط الأزرق، من أجمل ما في خيوة.", "Tash Hauli Palace", "Tash Hauli Palace", "A palace of blue-tiled courtyards — among Khiva's finest."],
      ],
    },
    srilanka: {
      colombo: [
        ["المتحف الوطني في كولومبو", "history", 1200, "ساعتين", "الأول في كولومبو على Trip.com (4.5 من 181 تقييم).", "Colombo National Museum", "Colombo National Museum", "Colombo's No. 1 on Trip.com (4.5 from 181 reviews)."],
        ["ساحة جالي فيس", "nature", 0, "ساعة", "كورنيش على المحيط للغروب وأكل الشارع (4.4 من 116 تقييم).", "Galle Face Green", "Galle Face Green", "An ocean promenade for sunsets and street food (4.4 from 116 reviews)."],
      ],
      kandy: [
        ["بحيرة كاندي", "nature", 0, "ساعة", "بحيرة وسط المدينة جنب معبد السن، ممشى هادي حولها.", "Kandy Lake", "Kandy Lake", "A lake in the town centre beside the Temple of the Tooth, with a calm walk around it."],
        ["الحديقة النباتية الملكية بيراديينيا", "nature", 3000, "نصف يوم", "أشهر حديقة في سريلانكا، فيها بستان أوركيد وممر نخيل.", "Royal Botanical Gardens, Peradeniya", "Peradeniya Botanical Gardens", "Sri Lanka's most famous garden, with an orchid house and palm avenue."],
      ],
      ella: [
        ["آدم بيك الصغير", "nature", 0, "نصف يوم", "مشي ساعة لقمة بإطلالة على الوادي، أشهر نشاط في إيلا.", "Ella, Sri Lanka", "Little Adam's Peak", "An hour's walk to a summit over the valley — Ella's signature hike."],
        ["قطار كاندي إلى إيلا", "fun", 1000, "يوم كامل", "من أجمل رحلات القطار في العالم بين مزارع الشاي.", "Main Line (Sri Lanka)", "Kandy–Ella train", "One of the world's most scenic train rides, through tea country."],
      ],
      sigiriya: [
        ["صخرة بيدورانغالا", "nature", 2000, "نصف يوم", "صعود قصير لإطلالة مباشرة على صخرة سيجيريا عند الشروق.", "Pidurangala Rock", "Pidurangala Rock", "A short climb with a head-on view of Sigiriya at sunrise."],
        ["كهوف دامبولا", "history", 2000, "ساعتين", "معبد في كهوف مليان تماثيل ورسومات، تراث يونسكو.", "Dambulla cave temple", "Dambulla Cave Temple", "Cave shrines full of statues and murals — UNESCO-listed."],
      ],
      galle: [
        ["منارة قلعة جالي", "history", 0, "ساعة", "المنارة البيضاء على أسوار القلعة الهولندية، أجمل صورة في جالي.", "Galle Lighthouse", "Galle Fort lighthouse", "The white lighthouse on the Dutch fort walls — Galle's classic photo."],
        ["شاطئ أونواتونا", "beach", 0, "نصف يوم", "خليج هادي قريب من جالي للسباحة والغطس.", "Unawatuna", "Unawatuna Beach", "A calm bay near Galle for swimming and snorkelling."],
      ],
    },
    singapore: {
      singapore: [
        ["حدائق الخليج", "nature", 0, "نصف يوم", "اختارها مسافرو TripAdvisor ثالث أفضل معلم في العالم 2026. الحدائق مجانية والقبب بتذكرة.", "Gardens by the Bay", "Gardens by the Bay", "Voted the world's 3rd-best attraction by TripAdvisor travellers in 2026. Gardens are free; the domes are ticketed."],
        ["حديقة الحيوان الليلية", "fun", 55, "ساعتين", "جولة بالترام بين الحيوانات في الليل.", "Night Safari, Singapore", "Night Safari", "A tram ride among animals after dark."],
      ],
      sentosa: [
        ["يونيفرسال ستوديوز سنغافورة", "fun", 83, "يوم كامل", "مدينة ألعاب أفلام هوليوود، الأكثر زيارة في سنتوسا.", "Universal Studios Singapore", "Universal Studios Singapore", "A Hollywood movie theme park — Sentosa's most visited."],
        ["أكواريوم S.E.A.", "fun", 44, "ساعتين", "من أكبر أحواض العالم، بنافذة عملاقة على المحيط.", "S.E.A. Aquarium", "S.E.A. Aquarium", "One of the world's largest aquariums, with a giant ocean window."],
      ],
    },
    southkorea: {
      busan: [
        ["حديقة هايونداي بلو لاين", "fun", 7000, "ساعتين", "ترام وكبسولات سماوية على الساحل، من أعلى الأنشطة تقييمًا في بوسان (4.7–4.8).", "Haeundae Blueline Park", "Haeundae Blueline Park", "A coastal tram and sky capsules — among Busan's top-rated activities (4.7–4.8)."],
        ["تلفريك سونغدو البحري", "fun", 17000, "ساعة", "تلفريك فوق البحر، والإطلالة الليلية أحلى (4.7).", "Songdo Beach", "Songdo Sea Cable Car", "A cable car over the sea, best at night (4.7)."],
      ],
      jeju: [
        ["جزيرة أودو", "nature", 10000, "نصف يوم", "جزيرة صغيرة بعبّارة من سونغسان، شواطئ وفول سوداني (4.7).", "Udo (island)", "Udo Island", "A small island by ferry from Seongsan — beaches and peanut ice cream (4.7)."],
        ["أكوا بلانيت جيجو", "fun", 40000, "ساعتين", "حوض أسماك كبير بعروض، مناسب للعوائل (4.6).", "Aqua Planet Jeju", "Aqua Planet Jeju", "A big aquarium with shows, great for families (4.6)."],
      ],
      seoul: [
        ["برج سيول N", "fun", 21000, "ساعتين", "برج على جبل نامسان بإطلالة على المدينة، أكثر من 1,400 تقييم (4.6).", "N Seoul Tower", "N Seoul Tower", "A tower on Namsan with city views — over 1,400 reviews (4.6)."],
      ],
    },
    japan: {
      kyoto: [
        ["فوشيمي إيناري تايشا", "history", 0, "نصف يوم", "آلاف البوابات البرتقالية، الأول بين معالم اليابان عند المسافرين الأجانب حسب TripAdvisor.", "Fushimi Inari-taisha", "Fushimi Inari Taisha", "Thousands of orange gates — ranked No. 1 in Japan by foreign travellers on TripAdvisor."],
        ["معبد نانزين جي", "history", 600, "ساعتين", "معبد بحدائق زن وقناة مياه رومانية الشكل.", "Nanzen-ji", "Nanzen-ji", "A Zen temple with gardens and a Roman-style aqueduct."],
      ],
      osaka: [
        ["قلعة أوساكا", "history", 600, "ساعتين", "قلعة بيضاء وذهبية وسط حديقة واسعة.", "Osaka Castle", "Osaka Castle", "A white-and-gold castle in a wide park."],
        ["شينسايباشي", "food", 0, "ساعتين", "شارع تسوق مسقوف يكمل على دوتونبوري.", "Shinsaibashi", "Shinsaibashi", "A covered shopping street that runs into Dotonbori."],
      ],
      hakone: [
        ["متحف هاكوني في الهواء الطلق", "history", 2000, "نصف يوم", "منحوتات بين الجبال، من أعلى معالم اليابان عند المسافرين.", "Hakone Open-Air Museum", "Hakone Open-Air Museum", "Sculptures among the mountains — one of Japan's best-rated sights with travellers."],
        ["تلفريك هاكوني", "nature", 1800, "ساعتين", "فوق فتحات بركان أواكوداني مع إطلالة فوجي.", "Hakone Ropeway", "Hakone Ropeway", "Over Owakudani's volcanic vents with views of Fuji."],
      ],
    },
    azerbaijan: {
      sheki: [
        ["قلعة شكي", "history", 0, "ساعة", "أسوار حجرية تضم قصر الخانات والمدينة القديمة.", "Shaki Fortress", "Sheki Fortress", "Stone walls enclosing the khans' palace and old town."],
        ["مسجد الخان", "history", 0, "ساعة", "مسجد تاريخي بمئذنة من الطوب قرب القلعة.", "Khan Mosque, Shaki", "Khan Mosque", "A historic mosque with a brick minaret near the fortress."],
        ["قرية كيش وكنيستها الألبانية", "history", 2, "ساعتين", "كنيسة حجرية قديمة في قرية جبلية قريبة.", "Church of Kish", "Kish village & church", "An ancient stone church in a nearby mountain village."],
      ],
      gabala: [
        ["تلفريك توفنداغ", "nature", 20, "ساعتين", "تلفريك لقمة الجبل، صيف وشتاء.", "Tufandag", "Tufandag cable car", "A cable car to the summit, summer and winter."],
      ],
    },
    malaysia: {
      genting: [
        ["حديقة جنتنغ سكاي وورلدز", "fun", 180, "يوم كامل", "أشهر مدينة ألعاب في جنتنغ.", "Genting SkyWorlds", "Genting SkyWorlds", "Genting's most popular theme park."],
        ["تلفريك أوانا سكاي واي", "fun", 10, "ساعة", "تلفريك فوق الغابات الاستوائية للقمة.", "Awana Skyway", "Awana SkyWay", "A cable car over the rainforest to the summit."],
      ],
      cameron: [
        ["الغابة الطحلبية", "nature", 30, "ساعتين", "ممرات خشبية في غابة غيوم مغطاة بالطحالب.", "Mossy Forest", "Mossy Forest", "Boardwalks through a moss-covered cloud forest."],
        ["سوق برينشانغ الليلي", "food", 0, "ساعتين", "فراولة وذرة مشوية وأكل شارع في الجو البارد.", "Brinchang", "Brinchang night market", "Strawberries, grilled corn and street food in the cool air."],
      ],
      putrajaya: [
        ["رحلة قارب في بحيرة بوتراجايا", "nature", 50, "ساعة", "جولة بالقارب تمر على المساجد والجسور.", "Putrajaya Lake", "Putrajaya Lake cruise", "A boat tour past the mosques and bridges."],
      ],
      kotakinabalu: [
        ["حديقة تونكو عبدالرحمن البحرية", "beach", 25, "يوم كامل", "جزر بشعاب ومياه شفافة على ربع ساعة بالقارب.", "Tunku Abdul Rahman National Park", "Tunku Abdul Rahman Marine Park", "Islands with reefs and clear water, 15 minutes by boat."],
        ["حديقة كينابالو", "nature", 50, "يوم كامل", "تراث يونسكو تحت جبل كينابالو، أعلى قمم ماليزيا.", "Kinabalu Park", "Kinabalu Park", "A UNESCO park below Mount Kinabalu, Malaysia's highest peak."],
      ],
    },
    indonesia: {
      jakarta: [
        ["المدينة القديمة (كوتا تووا)", "history", 0, "ساعتين", "ساحة هولندية قديمة بمتاحف ودراجات ملونة (4.7 من 160 تقييم).", "Kota Tua Jakarta", "Kota Tua (Old Town)", "An old Dutch square with museums and colourful bikes (4.7 from 160 reviews)."],
        ["تامان ميني إندونيسيا إندا", "fun", 25000, "نصف يوم", "حديقة تعرض بيوت وثقافات كل جزر إندونيسيا (4.7).", "Taman Mini Indonesia Indah", "Taman Mini Indonesia", "A park showcasing the houses and cultures of every Indonesian island (4.7)."],
      ],
      puncak: [
        ["حديقة بوغور النباتية", "nature", 25000, "نصف يوم", "من أقدم الحدائق النباتية في آسيا (4.9 من 171 تقييم).", "Bogor Botanical Gardens", "Bogor Botanical Gardens", "One of Asia's oldest botanical gardens (4.9 from 171 reviews)."],
        ["تامان سفاري إندونيسيا", "fun", 230000, "يوم كامل", "سفاري بالسيارة بين الحيوانات، مناسب للعوائل.", "Taman Safari", "Taman Safari Indonesia", "A drive-through safari, great for families."],
      ],
      lombok: [
        ["شاطئ تانجونغ آن", "beach", 0, "نصف يوم", "خليجين برمل أبيض وتلال خضراء في جنوب لومبوك.", "Tanjung Aan", "Tanjung Aan Beach", "Twin white-sand bays and green hills in south Lombok."],
        ["شلال تيو كيليب", "nature", 20000, "نصف يوم", "شلال ستارة عند سفح رينجاني، مع شلال سينداغ غيلي.", "Tiu Kelep Waterfall", "Tiu Kelep Waterfall", "A curtain waterfall at Rinjani's foot, paired with Sendang Gile."],
      ],
    },
    thailand: {
      pattaya: [
        ["معبد الحقيقة", "history", 500, "ساعتين", "معبد خشبي ضخم بدون مسامير، الأول في باتايا (4.9 من أكثر من 54 ألف تقييم على Klook).", "Sanctuary of Truth", "Sanctuary of Truth", "A huge nail-free wooden temple — Pattaya's No. 1 (4.9 from 54,000+ Klook reviews)."],
        ["حديقة نونغ نوتش الاستوائية", "nature", 500, "نصف يوم", "حدائق ضخمة بعروض ثقافية.", "Nong Nooch Tropical Garden", "Nong Nooch Tropical Garden", "Vast gardens with cultural shows."],
      ],
      krabi: [
        ["شاطئ فرا نانغ", "beach", 0, "نصف يوم", "رمل أبيض تحت جرف جيري وكهف.", "Phra Nang Cave Beach", "Phra Nang Beach", "White sand beneath a limestone cliff and cave."],
      ],
    },
    georgia: {
      kazbegi: [
        ["شلال غفيليتي", "nature", 0, "ساعتين", "مشي قصير لشلال قريب من الحدود.", "Gveleti Waterfall", "Gveleti Waterfall", "A short walk to a waterfall near the border."],
        ["وادي تروسو", "nature", 0, "يوم كامل", "وادي ملون بينابيع معدنية، أعلى رحلة تقييمًا في كازبيغي (4.91 من 178).", "Truso Valley", "Truso Valley", "A colourful valley of mineral springs — Kazbegi's top-rated trip (4.91 from 178)."],
      ],
      borjomi: [
        ["حديقة بورجومي المركزية", "nature", 5, "ساعتين", "حديقة النبع، تذوق موية بورجومي من مصدرها.", "Borjomi Central Park", "Borjomi Central Park", "The spring park — taste Borjomi water at the source."],
        ["مدينة فاردزيا الصخرية", "history", 15, "نصف يوم", "مدينة كهوف من القرن الثاني عشر محفورة في الجبل.", "Vardzia", "Vardzia cave city", "A 12th-century cave city carved into a mountain."],
      ],
    },
    nepal: {
      kathmandu: [
        ["حديقة الأحلام", "nature", 400, "ساعة", "حديقة كلاسيكية هادئة وسط ثمل (4.5 من 152 تقييم).", "Garden of Dreams", "Garden of Dreams", "A quiet classical garden next to Thamel (4.5 from 152 reviews)."],
      ],
      pokhara: [
        ["شلال ديفيز وكهف غوبتيشور", "nature", 200, "ساعتين", "شلال يختفي في نفق، وقدامه كهف معبد.", "Devi's Fall", "Davis Falls & Gupteshwor Cave", "A waterfall that vanishes into a tunnel, with a cave temple opposite."],
      ],
    },
    cambodia: {
      siemreap: [
        ["السوق القديم", "food", 0, "ساعتين", "سوق شعبي للحرف والأكل والتوابل.", "Siem Reap", "Old Market (Phsar Chas)", "A local market for crafts, food and spices."],
        ["عرض رقص الأبسارا", "fun", 120000, "ساعتين", "رقص خميري كلاسيكي مع عشاء.", "Apsara Dance", "Apsara dance show", "Classical Khmer dance with dinner."],
      ],
      phnompenh: [
        ["وات فنوم", "history", 4000, "ساعة", "المعبد اللي أخذت المدينة اسمها منه، على تلة.", "Wat Phnom", "Wat Phnom", "The hilltop temple the city is named after."],
      ],
      kampot: [
        ["حديقة كيب الوطنية", "nature", 4000, "نصف يوم", "مسارات غابة بإطلالة على البحر.", "Kep National Park", "Kep National Park", "Jungle trails with sea views."],
      ],
    },
    armenia: {
      yerevan: [
        ["دير غيغارد", "history", 0, "ساعتين", "دير محفور في الصخر، من أكثر أماكن أرمينيا تقييمًا (4.8 من 5,762).", "Geghard", "Geghard Monastery", "A monastery carved into rock — among Armenia's most reviewed (4.8 from 5,762)."],
        ["ماتيناداران", "history", 2000, "ساعتين", "متحف المخطوطات القديمة، فيه آلاف الكتب النادرة.", "Matenadaran", "Matenadaran", "The museum of ancient manuscripts, with thousands of rare books."],
      ],
      sevan: [
        ["شارع شارامبيان (ديليجان القديمة)", "history", 0, "ساعة", "حي حرفيين بيوته خشب قديمة.", "Dilijan", "Sharambeyan Street", "An artisans' street of old wooden houses."],
        ["دير غوشافانك", "history", 0, "ساعة", "دير من القرن الثاني عشر قرب ديليجان.", "Goshavank", "Goshavank Monastery", "A 12th-century monastery near Dilijan."],
      ],
    },
    tajikistan: {
      dushanbe: [
        ["متحف غورمينج للآلات الموسيقية", "history", 20, "ساعة", "بيت صغير مليان آلات من البامير، وأحيانًا عزف حي.", "Gurminj Museum", "Gurminj Museum of Musical Instruments", "A small house full of Pamiri instruments, sometimes with live music."],
        ["بحيرة نوريك", "nature", 0, "يوم كامل", "بحيرة سد فيروزية بين الجبال، رحلة يوم من دوشنبه.", "Nurek Reservoir", "Nurek Reservoir", "A turquoise dam lake among mountains, a day trip from Dushanbe."],
      ],
      khujand: [
        ["حديقة كمال خوجندي", "nature", 0, "ساعة", "حديقة على النهر بممرات وأماكن جلوس.", "Khujand", "Kamoli Khujandi Park", "A riverside park with walkways and seating."],
      ],
    },
  };

  // الدفعة الثانية: معالم مشهورة وكثيرة التقييمات ما كانت موجودة
  const X2 = {
    kazakhstan: {
      astana: [
        ["جامع نور أستانا", "history", 0, "ساعة", "مسجد ضخم بقبة ذهبية، من أشهر محطات زوار العاصمة.", "Nur-Astana Mosque", "Nur-Astana Mosque", "A huge golden-domed mosque, a staple for visitors to the capital."],
        ["قصر السلام والمصالحة (الهرم)", "history", 1500, "ساعة", "هرم زجاجي من تصميم نورمان فوستر بإطلالة من القمة.", "Palace of Peace and Reconciliation", "Palace of Peace and Reconciliation", "A glass pyramid by Norman Foster with a view from the apex."],
        ["دار أوبرا أستانا", "fun", 5000, "ساعتين", "مبنى كلاسيكي فخم، احضر عرض باليه أو أوبرا.", "Astana Opera", "Astana Opera", "A grand classical house — catch a ballet or opera."],
      ],
      charyn: [
        ["الكثيب الغنّاء في ألتين إيميل", "nature", 2000, "يوم كامل", "كثيب رملي يطلع صوت مثل الطنين مع الرياح.", "Altyn-Emel National Park", "Singing Dune, Altyn-Emel", "A sand dune that hums when the wind blows."],
      ],
    },
    srilanka: {
      colombo: [["حديقة فيهارامهاديفي", "nature", 0, "ساعة", "أكبر حديقة في كولومبو جنب مبنى البلدية الأبيض.", "Viharamahadevi Park", "Viharamahadevi Park", "Colombo's largest park, beside the white Town Hall."]],
      kandy: [
        ["تمثال بوذا باهيراوا كاندا", "history", 200, "ساعة", "تمثال أبيض كبير على تلة بإطلالة على كاندي كلها.", "Bahirawakanda Vihara Buddha Statue", "Bahirawakanda Buddha", "A big white statue on a hill overlooking all of Kandy."],
        ["غابة أوداوتّيكيلي", "nature", 1000, "ساعتين", "غابة محمية وسط المدينة بقرود وطيور.", "Udawatta Kele Sanctuary", "Udawattakele Forest", "A protected forest in the city, with monkeys and birds."],
      ],
      ella: [
        ["شلالات رافانا", "nature", 0, "ساعة", "شلال على طريق إيلا، من أعرض شلالات الجزيرة.", "Ravana Falls", "Ravana Falls", "A roadside waterfall near Ella, one of the island's widest."],
        ["صخرة إيلا", "nature", 0, "نصف يوم", "مشي أطول من آدم بيك لإطلالة على وادي إيلا.", "Ella, Sri Lanka", "Ella Rock", "A longer hike than Little Adam's Peak for views over the Ella gap."],
      ],
      sigiriya: [["مدينة بولوناروا القديمة", "history", 5000, "نصف يوم", "عاصمة قديمة بتماثيل بوذا محفورة في الصخر، تراث يونسكو.", "Polonnaruwa", "Ancient Polonnaruwa", "An ancient capital with rock-cut Buddhas — UNESCO-listed."]],
    },
    singapore: {
      singapore: [
        ["حدائق سنغافورة النباتية", "nature", 0, "نصف يوم", "تراث يونسكو، وحديقة الأوركيد فيها مشهورة.", "Singapore Botanic Gardens", "Singapore Botanic Gardens", "UNESCO-listed, with a famous orchid garden."],
        ["حي الحي العربي (كامبونغ غلام)", "food", 0, "ساعتين", "حول مسجد السلطان: شارع حاجي لين ومطاعم عربية وحلال.", "Kampong Glam", "Kampong Glam", "Around the Sultan Mosque: Haji Lane and Arab and halal restaurants."],
        ["تمثال ميرلاين", "fun", 0, "ساعة", "رمز سنغافورة على خليج مارينا.", "Merlion Park", "Merlion Park", "Singapore's symbol on Marina Bay."],
      ],
      sentosa: [["زلاجة سكاي لاين سنتوسا", "fun", 30, "ساعتين", "نزول بعربات بدون محرك على مسارات بالغابة.", "Skyline Luge Sentosa", "Skyline Luge", "Gravity carts down forest tracks."]],
    },
    southkorea: {
      seoul: [
        ["سوق غوانغجانغ", "food", 0, "ساعتين", "أقدم سوق أكل في سيول، مشهور بالبينداتوك.", "Gwangjang Market", "Gwangjang Market", "Seoul's oldest food market, famous for bindaetteok."],
        ["إنسادونغ", "history", 0, "ساعتين", "شارع حرف تقليدية ومقاهي شاي.", "Insa-dong", "Insadong", "A street of traditional crafts and tea houses."],
        ["مكتبة ستارفيلد في كوكس", "fun", 0, "ساعة", "رفوف كتب عملاقة داخل المول، من أكثر الأماكن تصويرًا.", "Starfield COEX Mall", "Starfield Library", "Giant bookshelves inside the mall — one of the most photographed spots."],
      ],
    },
    japan: {
      tokyo: [
        ["حديقة شينجوكو غيون", "nature", 500, "ساعتين", "حديقة واسعة هادئة وسط المدينة، رائعة في موسم الساكورا.", "Shinjuku Gyo-en", "Shinjuku Gyoen", "A vast calm garden in the city — stunning in cherry blossom season."],
        ["سوق تسوكيجي الخارجي", "food", 0, "ساعتين", "أكشاك مأكولات بحرية طازجة وأكل شارع.", "Tsukiji fish market", "Tsukiji Outer Market", "Stalls of fresh seafood and street food."],
        ["أكيهابارا", "fun", 0, "ساعتين", "حي الإلكترونيات والألعاب والأنمي.", "Akihabara", "Akihabara", "The district of electronics, games and anime."],
      ],
      kyoto: [
        ["سوق نيشيكي", "food", 0, "ساعتين", "مطبخ كيوتو: شارع طويل مسقوف بأكشاك أكل.", "Nishiki Market", "Nishiki Market", "Kyoto's kitchen — a long covered street of food stalls."],
        ["معبد غينكاكو جي (الجناح الفضي)", "history", 500, "ساعة", "معبد بحديقة رمل زن، وبدايته ممر الفلاسفة.", "Ginkaku-ji", "Ginkaku-ji", "A temple with a Zen sand garden at the start of the Philosopher's Path."],
      ],
      osaka: [
        ["حوض أوساكا كايوكان", "fun", 2700, "نصف يوم", "من أكبر أحواض العالم، فيه قرش الحوت.", "Osaka Aquarium Kaiyukan", "Osaka Aquarium Kaiyukan", "One of the world's largest aquariums, home to a whale shark."],
        ["سوق كورومون", "food", 0, "ساعتين", "سوق أكل بحري ولحم واغيو مشوي.", "Kuromon Market", "Kuromon Market", "A market of seafood and grilled wagyu."],
        ["مبنى أوميدا سكاي", "fun", 2000, "ساعة", "مرصد دائري معلق بين برجين.", "Umeda Sky Building", "Umeda Sky Building", "A circular observatory slung between two towers."],
      ],
      hakone: [["ضريح هاكوني", "history", 0, "ساعة", "بوابة توري حمراء على بحيرة آشي.", "Hakone Shrine", "Hakone Shrine", "A red torii gate standing in Lake Ashi."]],
    },
    malaysia: {
      cameron: [["مزرعة الفراولة", "food", 0, "ساعة", "اقطف فراولتك بنفسك وجرّب حلوياتها.", "Cameron Highlands", "Strawberry farm", "Pick your own strawberries and try the desserts."]],
      kotakinabalu: [
        ["قرية ماري ماري الثقافية", "history", 200, "نصف يوم", "قرية تعرض بيوت وحياة قبائل صباح.", "Mari Mari Cultural Village", "Mari Mari Cultural Village", "A village showcasing the homes and life of Sabah's tribes."],
        ["قرود أنف البحر على نهر كلياس", "nature", 250, "نصف يوم", "رحلة قارب الغروب لمشاهدة قرود الخرطوم واليراعات.", "Proboscis monkey", "Klias River proboscis monkeys", "A sunset boat trip to spot proboscis monkeys and fireflies."],
      ],
      putrajaya: [["الحديقة النباتية في بوتراجايا", "nature", 0, "ساعتين", "حديقة واسعة على البحيرة.", "Putrajaya Botanical Garden", "Putrajaya Botanical Garden", "A large lakeside garden."]],
    },
    indonesia: {
      jakarta: [["أنكول دريم لاند", "fun", 25000, "نصف يوم", "منتجع بحري بملاهي وحوض أسماك على الساحل.", "Ancol Dreamland", "Ancol Dreamland", "A seaside resort of theme parks and an aquarium."]],
      puncak: [
        ["حديقة سيبوداس النباتية", "nature", 20000, "نصف يوم", "حديقة جبلية خضراء عند سفح جبل جيدي.", "Cibodas Botanical Garden", "Cibodas Botanical Garden", "A green mountain garden at the foot of Mount Gede."],
        ["مزارع شاي غونونغ ماس", "nature", 20000, "ساعتين", "تلال شاي خضراء وجو بارد.", "Puncak", "Gunung Mas tea estate", "Green tea hills and cool air."],
      ],
    },
    thailand: {
      pattaya: [
        ["السوق العائم في باتايا", "food", 200, "ساعتين", "قوارب أكل وحرف على قنوات خشبية.", "Pattaya Floating Market", "Pattaya Floating Market", "Food and craft boats on wooden canals."],
        ["إطلالة باتايا (تلة براتومناك)", "nature", 0, "ساعة", "أشهر إطلالة على خليج باتايا.", "Pattaya", "Pattaya Viewpoint", "The best-known view over Pattaya Bay."],
      ],
      krabi: [
        ["جزر هونغ", "beach", 300, "يوم كامل", "بحيرة مخفية داخل جزيرة صخرية وشواطئ هادية.", "Ko Hong", "Hong Islands", "A hidden lagoon inside a limestone island, and calm beaches."],
        ["البركة الزمردية", "nature", 200, "نصف يوم", "بركة خضراء صافية في غابة.", "Emerald Pool", "Emerald Pool", "A clear green pool in the jungle."],
      ],
    },
    georgia: {
      kazbegi: [["المشي لنهر غيرغيتي الجليدي", "nature", 0, "يوم كامل", "مسار طويل يبدأ من الكنيسة لحافة النهر الجليدي.", "Gergeti Glacier", "Gergeti Glacier hike", "A long trail from the church to the glacier's edge."]],
      borjomi: [["حديقة بورجومي-خاراغاولي الوطنية", "nature", 0, "يوم كامل", "من أكبر محميات أوروبا، مسارات غابات وجبال.", "Borjomi-Kharagauli National Park", "Borjomi-Kharagauli National Park", "One of Europe's largest reserves, with forest and mountain trails."]],
    },
    nepal: {
      chitwan: [["عرض رقص الثارو", "history", 200, "ساعة", "رقصة شعبية لقبيلة الثارو في المساء.", "Tharu people", "Tharu cultural dance", "An evening folk dance by the Tharu people."]],
    },
  };
  Object.entries(X2).forEach(([cid, cs]) => Object.entries(cs).forEach(([city, l]) => { X[cid] = X[cid] || {}; X[cid][city] = (X[cid][city] || []).concat(l); }));
  const D = W.DATE || "2026-11";
  // أسماء ويكيبيديا لمعالم محددة (مو أسماء مدن عامة)، نتجاهل المكرر منها
  const UNIQUE = new Set(Object.values(X).flatMap((cs) => Object.values(cs).flatMap((l) => l.map((x) => x[5]))).filter((w) => !/^(Siem Reap|Dilijan|Khujand|Brinchang|Song-Köl|Issyk-Kul|Cholpon-Ata|Karakol|Ella, Sri Lanka|Unawatuna)$/.test(w)));
  Object.entries(X).forEach(([cid, cities]) => {
    const C = W.countries[cid]; if (!C) return;
    const E = EN[cid] && EN[cid].cities;
    Object.entries(cities).forEach(([cityId, list]) => {
      const c = C.cities.find((x) => x.id === cityId); if (!c) return;
      const ec = E && E[cityId];
      if (ec) { ec.places = ec.places || []; while (ec.places.length < c.places.length) ec.places.push(null); }
      list.forEach(([name, type, fee, time, desc, wiki, enName, enDesc]) => {
        const dup = c.places.some((p) => p.name === name || (p.wiki === wiki && UNIQUE.has(wiki)));
        if (dup) return;
        c.places.push({ name, type, fee, time, desc, wiki, src: "reviews", date: D });
        if (ec) ec.places.push([enName, enDesc]);
      });
    });
  });
})();
