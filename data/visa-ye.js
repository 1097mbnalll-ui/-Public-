// معلومات التأشيرة لحاملي الجواز اليمني، ولليمني المقيم في السعودية (بإقامة سارية)
// مصادر: ويكيبيديا (متطلبات التأشيرة للمواطنين اليمنيين)، Passport Index، ومواقع سفر. تتغير كثير، فتأكد من السفارة.
window.VISA_YE = {
  turkey: {
    ye: ["غالبًا تحتاج تأشيرة من السفارة أو القنصلية التركية. التأشيرة الإلكترونية المشروطة متاحة فقط لو عندك تأشيرة أو إقامة سارية من دول شنغن أو أمريكا أو بريطانيا أو إيرلندا.", "Usually a visa from a Turkish embassy or consulate. The conditional e-visa only applies if you hold a valid Schengen, US, UK or Irish visa or residence permit."],
    res: ["الإقامة في السعودية ما تعفيك. قدّم على التأشيرة من القنصلية التركية في الرياض أو جدة، وجهّز الإقامة وكشف حساب وحجز فندق وتذكرة.", "A Saudi iqama alone doesn't exempt you. Apply at the Turkish consulate in Riyadh or Jeddah with your iqama, bank statement, hotel booking and ticket."],
  },
  malaysia: {
    ye: ["حسب مصادر السفر: بدون تأشيرة حتى 90 يوم، مع تعبئة بطاقة الوصول الرقمية MDAC. تأكد من موقع الهجرة الماليزية قبل السفر.", "Travel sources list visa-free entry for up to 90 days, plus the MDAC digital arrival card. Confirm with Malaysian immigration before you fly."],
    res: ["نفس شروط الجواز اليمني. خذ معك الإقامة سارية لأنها تساعد عند الرجوع للسعودية.", "Same as the Yemeni passport rules. Carry your valid iqama — you'll need it to re-enter Saudi Arabia."],
  },
  indonesia: {
    ye: ["تحتاج تأشيرة إلكترونية لمدة 60 يوم، لكنها تتطلب كفيل في إندونيسيا (شركة أو وكيل سفر)، فما تقدر تقدم عليها مباشرة بنفسك.", "You need a 60-day e-visa, but it requires a sponsor in Indonesia (a company or travel agent) — you can't apply directly yourself."],
    res: ["الإقامة في السعودية ما تغيّر الشرط. قدّم عن طريق وكيل سفر معتمد يوفر لك الكفالة.", "A Saudi iqama doesn't change this. Apply through an approved travel agent who can act as sponsor."],
  },
  thailand: {
    ye: ["تحتاج تأشيرة سياحية قبل السفر، عن طريق نظام التأشيرة الإلكترونية التايلاندي أو السفارة.", "You need a tourist visa before travel, via Thailand's e-visa system or the embassy."],
    res: ["قدّم من السعودية على التأشيرة الإلكترونية التايلاندية واختر سفارة الرياض، وارفع الإقامة سارية.", "Apply for the Thai e-visa from Saudi Arabia under the Riyadh embassy, and upload your valid iqama."],
  },
  vietnam: {
    ye: ["التأشيرة الإلكترونية متاحة لكل الجنسيات: 25 دولار، حتى 90 يوم، من evisa.gov.vn فقط.", "The e-visa is open to all nationalities: USD 25, up to 90 days, via evisa.gov.vn only."],
    res: ["نفس التأشيرة الإلكترونية. حط عنوانك في السعودية في الطلب، وخذ الإقامة معك.", "Same e-visa. Use your Saudi address in the application and carry your iqama."],
  },
  georgia: {
    ye: ["الجواز اليمني لحاله يحتاج تأشيرة جورجية مسبقة.", "A Yemeni passport on its own needs a Georgian visa in advance."],
    res: ["حسب أغلب المصادر: المقيم في دول الخليج بإقامة سارية (3 شهور على الأقل) يدخل جورجيا بدون تأشيرة حتى 90 يوم خلال 180 يوم. خذ تذكرة رجوع وحجز فندق وما يثبت قدرتك المالية.", "Most sources say GCC residents with a valid permit (at least 3 months left) can enter visa-free for up to 90 days in 180. Carry a return ticket, hotel booking and proof of funds."],
  },
  azerbaijan: {
    ye: ["تحتاج تأشيرة من السفارة الأذربيجانية، والتأشيرة الإلكترونية ASAN غالبًا ما تكون متاحة للجواز اليمني.", "You need a visa from an Azerbaijani embassy; the ASAN e-visa usually isn't open to Yemeni passports."],
    res: ["قدّم عن طريق سفارة أذربيجان في الرياض. بعض المصادر تطلب إقامة سارية 6 شهور.", "Apply through the Azerbaijani embassy in Riyadh. Some sources ask for at least 6 months left on the iqama."],
  },
};

Object.assign(window.VISA_YE, {
  kyrgyzstan: {
    ye: ["تأشيرة إلكترونية (eVisa) من البوابة الرسمية لقيرغيزستان قبل السفر.", "An e-visa from Kyrgyzstan's official portal before travel."],
    res: ["نفس التأشيرة الإلكترونية، وارفع الإقامة السعودية مع الطلب لو طُلبت.", "Same e-visa; upload your Saudi iqama if requested."],
  },
  uzbekistan: {
    ye: ["تحتاج تأشيرة. جرّب التأشيرة الإلكترونية من e-visa.gov.uz، ولو ما كانت متاحة لجوازك فعن طريق السفارة.", "A visa is required. Try the e-visa at e-visa.gov.uz; if it isn't open to your passport, apply via the embassy."],
    res: ["قدّم عن طريق سفارة أوزبكستان في الرياض مع الإقامة السارية.", "Apply through the Uzbek embassy in Riyadh with your valid iqama."],
  },
  kazakhstan: {
    ye: ["تحتاج تأشيرة مسبقة. فيه تأشيرة إلكترونية لبعض الجنسيات، تأكد إذا الجواز اليمني منها.", "A visa is required in advance. Kazakhstan has an e-visa for some nationalities — check whether Yemen qualifies."],
    res: ["قدّم عن طريق سفارة كازاخستان في الرياض مع الإقامة.", "Apply via the Kazakh embassy in Riyadh with your iqama."],
  },
  srilanka: {
    ye: ["تصريح إلكتروني ETA من البوابة الرسمية قبل السفر، أو تأشيرة عند الوصول.", "An online ETA from the official portal before travel, or a visa on arrival."],
    res: ["نفس التصريح الإلكتروني.", "The same online ETA."],
  },
  singapore: {
    ye: ["تحتاج تأشيرة، ولازم تقدم عن طريق جهة محلية في سنغافورة (فندق أو وكيل سفر معتمد).", "A visa is required, applied for through a local Singapore contact (a hotel or approved travel agent)."],
    res: ["نفس الشرط، والإقامة السعودية تدعم الطلب لكن ما تعفيك.", "Same rule — a Saudi iqama supports the application but doesn't exempt you."],
  },
  southkorea: {
    ye: ["تحتاج تأشيرة من السفارة الكورية، مع كشف حساب وحجوزات.", "A visa from the Korean embassy, with bank statements and bookings."],
    res: ["قدّم في السفارة الكورية في الرياض مع الإقامة.", "Apply at the Korean embassy in Riyadh with your iqama."],
  },
  japan: {
    ye: ["تحتاج تأشيرة من السفارة اليابانية، مع برنامج الرحلة والحجوزات.", "A visa from the Japanese embassy, with your itinerary and bookings."],
    res: ["قدّم في السفارة اليابانية في الرياض أو القنصلية في جدة مع الإقامة.", "Apply at the Japanese embassy in Riyadh or consulate in Jeddah with your iqama."],
  },
});
