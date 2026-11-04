/*
  لوحات المدن المرسومة (SVG)
  كل دالة ترجع رسمة بمقاس 800×450. العناصر اللي فيها data-depth تتحرك مع التمرير.
*/
(function () {
  "use strict";

  let uidN = 0;
  const uid = () => "s" + ++uidN;

  // مولد أرقام عشوائية ثابت عشان الرسمة تطلع نفسها كل مرة
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const svg = (id, body, defs, label) => `
    <svg class="scene" viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${label}">
      <defs>${defs}
        <filter id="${id}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="${id}-soft"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>
      ${body}
    </svg>`;

  const grad = (id, stops, vertical = true) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops
      .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

  // جبل كلسي بقمة دائرية
  function karst(x, base, w, h, lean = 0) {
    const t = x + w * (0.5 + lean);
    return `M${x},${base} C${x - w * 0.05},${base - h * 0.55} ${t - w * 0.45},${base - h} ${t},${base - h} C${t + w * 0.45},${base - h} ${x + w * 1.05},${base - h * 0.5} ${x + w},${base} Z`;
  }

  function clouds(id, color, ys) {
    return ys.map(([x, y, s, dur]) => `
      <g class="drift" style="--dur:${dur}s">
        <g transform="translate(${x} ${y}) scale(${s})" fill="${color}" opacity="0.55">
          <ellipse cx="0" cy="0" rx="46" ry="10"/><ellipse cx="22" cy="-6" rx="26" ry="10"/><ellipse cx="-20" cy="-3" rx="20" ry="8"/>
        </g>
      </g>`).join("");
  }

  function birds(color) {
    return `<g class="birds" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round">
      <path d="M300,110 q6,-6 12,0 q6,-6 12,0"/><path d="M330,96 q5,-5 10,0 q5,-5 10,0"/><path d="M352,118 q4,-4 8,0 q4,-4 8,0"/>
    </g>`;
  }

  function lantern(x, y, r, color, id, sway = true) {
    return `<g class="${sway ? "sway" : ""}" style="transform-origin:${x}px ${y - r * 1.6}px; --d:${(x % 7) * 0.3}s">
      <line x1="${x}" y1="${y - r * 1.6}" x2="${x}" y2="${y - r}" stroke="#2a1a2e" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${color}" opacity="0.35" filter="url(#${id}-glow)"/>
      <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="${color}"/>
      <rect x="${x - r * 0.45}" y="${y - r * 1.3}" width="${r * 0.9}" height="${r * 0.25}" fill="#3a2016"/>
      <rect x="${x - r * 0.45}" y="${y + r * 1.08}" width="${r * 0.9}" height="${r * 0.25}" fill="#3a2016"/>
    </g>`;
  }

  // ---------- ها لونغ ----------
  function halong() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#1f2156"], [0.45, "#7b3f7a"], [0.78, "#f0845c"], [1, "#ffcf8a"]]) +
      grad(id + "-sea", [[0, "#5a3d74"], [1, "#171538"]]);
    const far = [[-20, 90, 120], [70, 70, 150], [180, 60, 95], [430, 80, 130], [620, 70, 110], [700, 100, 140]];
    const mid = [[20, 110, 170], [150, 80, 120], [480, 90, 160], [600, 120, 120], [740, 90, 180]];
    const near = [[-40, 150, 290], [90, 70, 170], [650, 130, 250], [760, 90, 200]];
    const sunX = 400;
    const refl = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${sunX - 60 + i * 8}" y="${342 + i * 14}" width="${120 - i * 16}" height="3" rx="1.5" fill="#ffd9a0" opacity="${0.75 - i * 0.11}"/>`).join("");
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      ${clouds(id, "#ffd6c0", [[150, 90, 1.2, 70], [560, 60, 0.9, 90], [700, 140, 0.7, 60]])}
      <circle cx="${sunX}" cy="300" r="70" fill="#ffd9a0" opacity="0.45" filter="url(#${id}-glow)"/>
      <circle cx="${sunX}" cy="300" r="44" fill="#ffe2b0"/>
      ${birds("#3b2450")}
      <g data-depth="0.08" fill="#9a6c9c" opacity="0.75">${far.map(([x, w, h]) => `<path d="${karst(x, 335, w, h)}"/>`).join("")}</g>
      <rect y="330" width="800" height="120" fill="url(#${id}-sea)"/>
      ${refl}
      <g data-depth="0.16" fill="#5d3b78">${mid.map(([x, w, h]) => `<path d="${karst(x, 348, w, h, 0.05)}"/>`).join("")}</g>
      <g data-depth="0.26">
        <g transform="translate(300 380)" class="bob">
          <path d="M-58,0 L58,0 Q50,16 30,18 L-36,18 Q-54,14 -58,0 Z" fill="#2a1730"/>
          <path d="M-30,-2 L-30,-70 Q-10,-56 -4,-6 Z" fill="#e8743b"/>
          <path d="M0,-2 L0,-86 Q24,-66 30,-6 Z" fill="#f29a52"/>
          <path d="M34,-2 L34,-52 Q48,-40 50,-6 Z" fill="#e8743b"/>
          <g stroke="#a14a24" stroke-width="1" opacity="0.6"><path d="M-29,-50 L-12,-46 M-29,-30 L-8,-26 M1,-66 L20,-60 M1,-44 L26,-38 M1,-22 L28,-18"/></g>
        </g>
        <g fill="#2a1d4a">${near.map(([x, w, h]) => `<path d="${karst(x, 372, w, h, -0.05)}"/>`).join("")}</g>
      </g>`;
    return svg(id, body, defs, "خليج ها لونغ وقت الغروب");
  }

  // ---------- هانوي ----------
  function hanoi() {
    const id = uid();
    const r = rng(7);
    const defs =
      grad(id + "-sky", [[0, "#16204a"], [0.4, "#4b3a7a"], [0.75, "#d9677a"], [1, "#f6b26b"]]) +
      grad(id + "-lake", [[0, "#5b3e72"], [1, "#141634"]]);
    let city = "";
    for (let x = 0; x < 800; ) {
      const w = 26 + r() * 40, h = 30 + r() * 60;
      city += `<rect x="${x}" y="${300 - h}" width="${w}" height="${h + 2}"/>`;
      x += w + 2;
    }
    const lanternsLine = [];
    const colors = ["#e63946", "#f4a261", "#ffd166", "#e76f51"];
    for (let i = 0; i < 13; i++) {
      const x = 30 + i * 62;
      const t = x / 800;
      const y = 100 + Math.sin(t * Math.PI) * 50 + 22;
      lanternsLine.push(lantern(x, y, 10, colors[i % 4], id));
    }
    const tier = (cx, y, w, h) => `
      <rect x="${cx - w / 2}" y="${y - h}" width="${w}" height="${h}"/>
      <path d="M${cx - w / 2 - 12},${y - h + 2} Q${cx},${y - h - 14} ${cx + w / 2 + 12},${y - h + 2} L${cx + w / 2 + 2},${y - h + 6} L${cx - w / 2 - 2},${y - h + 6} Z"/>`;
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="610" cy="250" r="34" fill="#ffd9a0" opacity="0.5" filter="url(#${id}-glow)"/>
      <circle cx="610" cy="250" r="24" fill="#ffe0b0"/>
      <g data-depth="0.08" fill="#3a2d5c">${city}</g>
      <rect y="298" width="800" height="152" fill="url(#${id}-lake)"/>
      <g data-depth="0.16" fill="#22183d">
        <ellipse cx="330" cy="330" rx="70" ry="9"/>
        ${tier(330, 328, 46, 26)}${tier(330, 296, 34, 18)}${tier(330, 272, 22, 14)}
        <rect x="327" y="242" width="6" height="16"/>
        <g fill="#ffcf7a" opacity="0.9"><rect x="318" y="314" width="6" height="9" rx="3"/><rect x="336" y="314" width="6" height="9" rx="3"/><rect x="327" y="286" width="6" height="8" rx="3"/></g>
      </g>
      <g opacity="0.25" filter="url(#${id}-soft)" fill="#22183d" transform="translate(0 664) scale(1 -1)">
        ${tier(330, 328, 46, 26)}${tier(330, 296, 34, 18)}
      </g>
      <g data-depth="0.24">
        <path d="M520,360 Q640,300 800,350" fill="none" stroke="#c8323a" stroke-width="9"/>
        <path d="M520,360 Q640,300 800,350" fill="none" stroke="#e85a4f" stroke-width="2" transform="translate(0 -8)"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const t = i / 8; const x = 520 + t * 280; const y = (1 - t) * (1 - t) * 360 + 2 * (1 - t) * t * 300 + t * t * 350; return `<line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y}" stroke="#c8323a" stroke-width="2"/>`; }).join("")}
        <path d="M0,390 Q120,370 260,400 L260,450 L0,450 Z" fill="#120f2a"/>
      </g>
      <path d="M0,100 Q400,206 800,100" fill="none" stroke="#2a1a2e" stroke-width="1.2"/>
      ${lanternsLine.join("")}`;
    return svg(id, body, defs, "هانوي: فوانيس وبحيرة هوان كيم وبرج السلحفاة");
  }

  // ---------- دا نانغ وهوي آن ----------
  function danang() {
    const id = uid();
    const r = rng(21);
    const defs =
      grad(id + "-sky", [[0, "#1d3557"], [0.45, "#45537e"], [0.8, "#e07a5f"], [1, "#f2cc8f"]]) +
      grad(id + "-river", [[0, "#2f3f6e"], [1, "#101a36"]]);
    let houses = "", lanterns = "";
    const lc = ["#e63946", "#ffb703", "#fb8500", "#d62828"];
    for (let x = -10, i = 0; x < 820; i++) {
      const w = 74 + r() * 46, h = 62 + r() * 40, base = 312;
      const wall = ["#e9b44c", "#dca23f", "#efc265", "#d99a3a"][i % 4];
      houses += `
        <rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${wall}"/>
        <path d="M${x - 8},${base - h + 4} L${x + w * 0.12},${base - h - 22} L${x + w * 0.88},${base - h - 22} L${x + w + 8},${base - h + 4} Z" fill="#6b3a2a"/>
        <rect x="${x + w * 0.38}" y="${base - 34}" width="${w * 0.24}" height="34" fill="#4a2a20"/>
        <rect x="${x + w * 0.1}" y="${base - h + 18}" width="${w * 0.2}" height="16" fill="#5a3426"/>
        <rect x="${x + w * 0.7}" y="${base - h + 18}" width="${w * 0.2}" height="16" fill="#5a3426"/>`;
      lanterns += lantern(x + w * 0.25, base - h + 50, 6, lc[i % 4], id) + lantern(x + w * 0.75, base - h + 52, 6, lc[(i + 2) % 4], id);
      x += w + 6;
    }
    let floats = "";
    for (let i = 0; i < 16; i++) {
      const x = r() * 800, y = 340 + r() * 100;
      floats += `<g class="float" style="--d:${(r() * 6).toFixed(2)}s"><circle cx="${x}" cy="${y}" r="8" fill="#ffb703" opacity="0.4" filter="url(#${id}-glow)"/><circle cx="${x}" cy="${y}" r="2.6" fill="#ffe08a"/></g>`;
    }
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      ${clouds(id, "#f6c8b0", [[200, 70, 1, 80], [620, 110, 0.8, 70]])}
      <g data-depth="0.06" fill="#4b4e7c" opacity="0.8"><path d="M0,250 Q120,190 260,230 Q380,180 520,226 Q650,196 800,236 L800,320 L0,320 Z"/></g>
      <g data-depth="0.14">${houses}${lanterns}</g>
      <rect y="312" width="800" height="138" fill="url(#${id}-river)"/>
      <g opacity="0.28" filter="url(#${id}-soft)" transform="translate(0 624) scale(1 -1)"><g data-depth="0.14">${houses}</g></g>
      <g data-depth="0.22">${floats}
        <g transform="translate(560 392)" class="bob"><path d="M-44,0 L44,0 Q36,12 20,13 L-26,13 Q-40,10 -44,0 Z" fill="#1b1430"/><path d="M-14,-2 Q0,-22 14,-2 Z" fill="#2b2140"/>${lantern(-30, -20, 5, "#e63946", id, false)}</g>
      </g>`;
    return svg(id, body, defs, "هوي آن: بيوت قديمة وفوانيس على النهر");
  }

  // ---------- هو تشي منه ----------
  function hcmc() {
    const id = uid();
    const r = rng(81);
    const defs =
      grad(id + "-sky", [[0, "#0b1030"], [0.55, "#2a1f5c"], [1, "#a0456e"]]) +
      grad(id + "-river", [[0, "#2a1f4c"], [1, "#0a0c22"]]) +
      grad(id + "-trailR", [[0, "#ff4d4d", 0], [0.6, "#ff6b4a", 0.9], [1, "#ffd0a0", 1]], false) +
      grad(id + "-trailW", [[0, "#ffffff", 0], [1, "#fff6d8", 1]], false);
    let back = "", front = "", windows = "";
    for (let x = -10; x < 820; ) { const w = 30 + r() * 40, h = 70 + r() * 110; back += `<rect x="${x}" y="${320 - h}" width="${w}" height="${h}"/>`; x += w + 4; }
    for (let x = -10; x < 820; ) {
      const w = 34 + r() * 46, h = 50 + r() * 120;
      if (x > 470 && x < 600) { x += 10; continue; }
      if (x > 280 && x < 370) { x += 10; continue; }
      front += `<rect x="${x}" y="${330 - h}" width="${w}" height="${h}"/>`;
      for (let wy = 330 - h + 10; wy < 320; wy += 12) for (let wx = x + 6; wx < x + w - 6; wx += 10) if (r() > 0.55) windows += `<rect x="${wx}" y="${wy}" width="4" height="5" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
      x += w + 5;
    }
    const lm = `
      <rect x="510" y="70" width="56" height="262"/><rect x="518" y="40" width="40" height="32"/><rect x="526" y="18" width="24" height="24"/><rect x="535" y="0" width="6" height="20"/>
      <path d="M300,332 L312,90 Q326,80 340,90 L352,332 Z"/><ellipse cx="341" cy="140" rx="22" ry="5"/>`;
    let lmWin = "";
    for (let y = 80; y < 320; y += 10) lmWin += `<rect x="516" y="${y}" width="44" height="2" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
    const trails = [0, 1, 2, 3].map((i) => `<path class="trail" style="--d:${i * 0.7}s" d="M-40,${420 + i * 7} C200,${400 + i * 6} 500,${396 + i * 5} 860,${380 + i * 6}" stroke="url(#${id}-${i % 2 ? "trailW" : "trailR"})" stroke-width="${2.4 - i * 0.3}" fill="none" stroke-linecap="round"/>`).join("");
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      ${[...Array(40)].map(() => `<circle cx="${(r() * 800).toFixed(0)}" cy="${(r() * 180).toFixed(0)}" r="${(r() * 1.2 + 0.3).toFixed(1)}" fill="#fff" opacity="${(r() * 0.7 + 0.2).toFixed(2)}"/>`).join("")}
      <g data-depth="0.06" fill="#2b2760">${back}</g>
      <g data-depth="0.12"><g fill="#16143a">${front}${lm}</g><g fill="#ffc96b">${windows}</g><g fill="#9ad8ff">${lmWin}</g></g>
      <rect y="330" width="800" height="120" fill="url(#${id}-river)"/>
      <g opacity="0.35" filter="url(#${id}-soft)">${[...Array(18)].map(() => `<rect x="${(r() * 780).toFixed(0)}" y="${(340 + r() * 40).toFixed(0)}" width="${(10 + r() * 30).toFixed(0)}" height="2" fill="#ffc96b"/>`).join("")}</g>
      <g data-depth="0.22"><rect y="404" width="800" height="46" fill="#0a0a1f"/>${trails}</g>`;
    return svg(id, body, defs, "سايغون ليلًا: أبراج وأنوار");
  }

  // ---------- فو كوك ----------
  function palm(x, base, h, lean, id) {
    const tx = x + lean, ty = base - h;
    const leaves = [-160, -125, -95, -60, -25, 10, 40].map((a) => {
      const rad = (a * Math.PI) / 180, L = 70 + (Math.abs(a + 70) % 30);
      const ex = tx + Math.cos(rad) * L, ey = ty + Math.sin(rad) * L * 0.6 + 34;
      const cx = tx + Math.cos(rad) * L * 0.5, cy = ty + Math.sin(rad) * L * 0.6 - 14;
      return `<path d="M${tx},${ty} Q${cx},${cy} ${ex},${ey} Q${cx + 4},${cy + 12} ${tx},${ty + 4} Z"/>`;
    }).join("");
    return `<g class="sway-slow" style="transform-origin:${x}px ${base}px">
      <path d="M${x},${base} Q${x + lean * 0.2},${base - h * 0.6} ${tx},${ty}" stroke="#6b4a2b" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g fill="#1f7a4c">${leaves}</g><circle cx="${tx - 3}" cy="${ty + 6}" r="5" fill="#5a3a1c"/><circle cx="${tx + 5}" cy="${ty + 8}" r="4.5" fill="#5a3a1c"/>
    </g>`;
  }

  function phuquoc() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#2fa9c9"], [0.6, "#8fdcea"], [1, "#fff1d6"]]) +
      grad(id + "-sea", [[0, "#3cc4cf"], [1, "#0e8a96"]]) +
      grad(id + "-sand", [[0, "#f7e2b8"], [1, "#e9c88d"]]);
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="640" cy="90" r="60" fill="#fff6d0" opacity="0.7" filter="url(#${id}-glow)"/>
      <circle cx="640" cy="90" r="34" fill="#fffbe8"/>
      ${clouds(id, "#ffffff", [[160, 80, 1.3, 90], [430, 130, 1, 70], [720, 170, 0.8, 80]])}
      <g data-depth="0.06" fill="#5aa5a8" opacity="0.8"><path d="M380,296 Q440,250 520,292 Z"/><path d="M560,296 Q600,272 650,294 Z"/></g>
      <rect y="292" width="800" height="90" fill="url(#${id}-sea)"/>
      <g data-depth="0.08">
        <path d="M-10,120 L810,250" stroke="#33495a" stroke-width="1.4"/>
        <g class="gondola"><animateMotion dur="40s" repeatCount="indefinite" path="M-10,120 L810,250"/><line x1="0" y1="0" x2="0" y2="16" stroke="#33495a" stroke-width="1.4"/><rect x="-12" y="16" width="24" height="18" rx="4" fill="#ff6b4a"/><rect x="-8" y="20" width="16" height="7" rx="2" fill="#dff6ff"/></g>
        <g transform="translate(470 300)" class="bob"><path d="M-22,0 L22,0 L16,8 L-16,8 Z" fill="#fff"/><path d="M0,-2 L0,-40 L18,-4 Z" fill="#fff"/><path d="M-2,-4 L-2,-32 L-16,-4 Z" fill="#ffd166"/></g>
      </g>
      <path d="M0,360 Q200,346 400,362 T800,356 L800,450 L0,450 Z" fill="url(#${id}-sand)"/>
      <path class="wave" d="M0,360 Q200,346 400,362 T800,356" stroke="#fff" stroke-width="3" fill="none" opacity="0.8"/>
      <g data-depth="0.2">${palm(90, 450, 230, 60, id)}${palm(170, 455, 180, 40, id)}${palm(730, 450, 210, -50, id)}</g>`;
    return svg(id, body, defs, "فو كوك: نخيل وبحر وتلفريك");
  }

  // ---------- جبال ومدرجات أرز (سابا، ها جيانغ، دا لات) ----------
  function terraces() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#7cc4dc"], [0.6, "#cfe9e6"], [1, "#f6ecc9"]]) +
      grad(id + "-mist", [[0, "#ffffff", 0], [1, "#ffffff", 0.85]]);
    const ridge = (base, amp, f, ph) => {
      let d = `M0,450 L0,${base}`;
      for (let x = 0; x <= 800; x += 20) d += ` L${x},${(base - Math.sin(x / f + ph) * amp - Math.sin(x / (f * 0.37) + ph * 2) * amp * 0.3).toFixed(1)}`;
      return d + " L800,450 Z";
    };
    const greens = ["#86b94f", "#74a843", "#98c75e", "#6b9c3c", "#a9d06c"];
    let bands = "";
    for (let i = 0; i < 12; i++) {
      const base = 250 + i * 19;
      let top = "", bottom = "";
      for (let x = 0; x <= 800; x += 16) {
        const y = base + Math.sin(x / 110 + i * 0.45) * 16 + (x / 800) * 30;
        top += `${x === 0 ? "M" : " L"}${x},${y.toFixed(1)}`;
      }
      bands += `<path d="${top} L800,450 L0,450 Z" fill="${greens[i % 5]}"/><path d="${top}" fill="none" stroke="#d9efa8" stroke-width="2" opacity="0.8"/>`;
    }
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="170" cy="90" r="40" fill="#fff8d6" opacity="0.8" filter="url(#${id}-glow)"/>
      ${clouds(id, "#ffffff", [[520, 80, 1.3, 90], [260, 140, 1, 70]])}
      ${birds("#43606a")}
      <g data-depth="0.05"><path d="${ridge(170, 40, 140, 0.5)}" fill="#7d9fb0"/></g>
      <g data-depth="0.09"><path d="${ridge(210, 34, 100, 2)}" fill="#5f8a8a"/></g>
      <rect y="170" width="800" height="90" fill="url(#${id}-mist)" opacity="0.7"/>
      <g data-depth="0.16">${bands}
        <g fill="#5a3a24"><path d="M600,300 l18,-14 l18,14 Z"/><rect x="604" y="300" width="28" height="14"/><path d="M660,322 l14,-11 l14,11 Z"/><rect x="663" y="322" width="22" height="11"/></g>
      </g>`;
    return svg(id, body, defs, "مدرجات أرز بين الجبال");
  }

  // ---------- كثبان (موي ني) ----------
  function dunes() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#f7a76c"], [0.55, "#ffd9a0"], [1, "#fff3dc"]]) +
      grad(id + "-d1", [[0, "#f6d199"], [1, "#e7b26e"]]) +
      grad(id + "-d2", [[0, "#efbd78"], [1, "#d4934c"]]);
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="600" cy="200" r="70" fill="#fff0c8" opacity="0.6" filter="url(#${id}-glow)"/>
      <circle cx="600" cy="200" r="42" fill="#fff6dc"/>
      ${birds("#8a5a3a")}
      <rect y="250" width="800" height="40" fill="#3fb3b6"/>
      <rect y="250" width="800" height="4" fill="#ffffff" opacity="0.6"/>
      <g data-depth="0.08"><path d="M0,300 Q150,230 330,280 Q480,230 640,270 Q720,250 800,262 L800,450 L0,450 Z" fill="url(#${id}-d1)"/></g>
      <g data-depth="0.18">
        <path d="M0,360 Q200,280 420,340 Q600,300 800,330 L800,450 L0,450 Z" fill="url(#${id}-d2)"/>
        <path d="M0,360 Q200,280 420,340" fill="none" stroke="#fff1d0" stroke-width="2.5" opacity="0.7"/>
        <g fill="#b8793c" opacity="0.6">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<ellipse cx="${300 + i * 26}" cy="${372 + (i % 2) * 6 - i * 2}" rx="4" ry="2"/>`).join("")}</g>
      </g>`;
    return svg(id, body, defs, "كثبان رملية على البحر");
  }

  // ---------- قباب ومآذن على الموية (إسطنبول، باكو، تبليسي) ----------
  function domes() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#1e2a5e"], [0.45, "#7a4a86"], [0.8, "#f08a5d"], [1, "#ffd08a"]]) +
      grad(id + "-sea", [[0, "#4a3c74"], [1, "#151538"]]);
    const mosque = (cx, base, w, col) => {
      const h = w * 0.55;
      let g = `<rect x="${cx - w / 2}" y="${base - h * 0.45}" width="${w}" height="${h * 0.45}" fill="${col}"/>`;
      g += `<path d="M${cx - w * 0.32},${base - h * 0.45} Q${cx - w * 0.32},${base - h * 1.25} ${cx},${base - h * 1.3} Q${cx + w * 0.32},${base - h * 1.25} ${cx + w * 0.32},${base - h * 0.45} Z" fill="${col}"/>`;
      g += `<rect x="${cx - 1.2}" y="${base - h * 1.5}" width="2.4" height="${h * 0.22}" fill="${col}"/>`;
      [-1, 1].forEach((sd) => {
        g += `<path d="M${cx + sd * w * 0.38},${base - h * 0.45} Q${cx + sd * w * 0.38},${base - h * 0.85} ${cx + sd * w * 0.24},${base - h * 0.85} Q${cx + sd * w * 0.12},${base - h * 0.85} ${cx + sd * w * 0.12},${base - h * 0.45} Z" fill="${col}"/>`;
        const mx = cx + sd * (w / 2 + 10);
        g += `<rect x="${mx - 3}" y="${base - h * 1.9}" width="6" height="${h * 1.9}" fill="${col}"/><path d="M${mx - 3},${base - h * 1.9} L${mx},${base - h * 2.25} L${mx + 3},${base - h * 1.9} Z" fill="${col}"/><rect x="${mx - 5}" y="${base - h * 1.35}" width="10" height="3" fill="${col}"/>`;
      });
      return g;
    };
    const r = rng(5);
    let city = "";
    for (let x = 0; x < 800; ) { const w = 20 + r() * 34, h = 14 + r() * 26; city += `<rect x="${x}" y="${300 - h}" width="${w}" height="${h + 2}"/>`; x += w + 2; }
    const refl = [0, 1, 2, 3, 4].map((i) => `<rect x="${560 - 50 + i * 8}" y="${318 + i * 14}" width="${100 - i * 16}" height="3" rx="1.5" fill="#ffd9a0" opacity="${0.7 - i * 0.12}"/>`).join("");
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="560" cy="250" r="60" fill="#ffd9a0" opacity="0.45" filter="url(#${id}-glow)"/>
      <circle cx="560" cy="250" r="34" fill="#ffe2b0"/>
      ${birds("#3b2450")}
      ${clouds(id, "#ffd6c0", [[180, 90, 1.1, 80], [640, 120, 0.8, 70]])}
      <g data-depth="0.06" fill="#5a3f7a">${city}</g>
      <g data-depth="0.12">${mosque(230, 300, 150, "#2c2050")}${mosque(470, 302, 110, "#33255a")}</g>
      <rect y="300" width="800" height="150" fill="url(#${id}-sea)"/>
      ${refl}
      <g opacity="0.3" filter="url(#${id}-soft)" transform="translate(0 602) scale(1 -1)">${mosque(230, 300, 150, "#2c2050")}</g>
      <g data-depth="0.22"><g transform="translate(640 372)" class="bob"><path d="M-50,0 L50,0 Q44,12 30,14 L-34,14 Q-46,10 -50,0 Z" fill="#1d1534"/><rect x="-24" y="-16" width="44" height="16" rx="3" fill="#f2f0f6"/><rect x="-18" y="-12" width="8" height="6" fill="#ffd08a"/><rect x="-4" y="-12" width="8" height="6" fill="#ffd08a"/><rect x="10" y="-12" width="6" height="6" fill="#ffd08a"/><rect x="-6" y="-26" width="6" height="10" fill="#c8323a"/></g></g>`;
    return svg(id, body, defs, "قباب ومآذن على الموية وقت الغروب");
  }

  // ---------- بالونات كبادوكيا ----------
  function balloons() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#5aa7d6"], [0.55, "#f6c7a5"], [1, "#ffe6c4"]]) +
      grad(id + "-rock", [[0, "#f1cfa3"], [1, "#c98f5f"]]);
    const cols = [["#e63946", "#ffd166"], ["#ff8c42", "#fff3d6"], ["#2a9d8f", "#e9c46a"], ["#7b5ea7", "#ffb4a2"], ["#f4a261", "#264653"], ["#ef476f", "#ffd166"]];
    const balloon = (x, y, s, c, i) => `
      <g class="float" style="--d:${i * 0.8}s"><g transform="translate(${x} ${y}) scale(${s})">
        <path d="M0,-30 C22,-30 28,-8 18,10 C12,20 6,24 4,28 L-4,28 C-6,24 -12,20 -18,10 C-28,-8 -22,-30 0,-30 Z" fill="${c[0]}"/>
        <path d="M0,-30 C8,-30 10,-8 6,10 C4,20 2,24 1.5,28 L-1.5,28 C-2,24 -4,20 -6,10 C-10,-8 -8,-30 0,-30 Z" fill="${c[1]}"/>
        <line x1="-4" y1="28" x2="-3" y2="36" stroke="#5a3a24" stroke-width="0.8"/><line x1="4" y1="28" x2="3" y2="36" stroke="#5a3a24" stroke-width="0.8"/>
        <rect x="-4" y="36" width="8" height="6" rx="1" fill="#6b4a2b"/>
      </g></g>`;
    const list = [[150, 110, 1.3], [300, 70, 0.8], [420, 150, 1.6], [560, 90, 1.0], [680, 160, 0.9], [230, 190, 0.7], [740, 60, 0.6], [80, 200, 0.6], [500, 220, 0.55]];
    const chim = (x, base, w, h, col) => `<path d="M${x},${base} L${x + w * 0.15},${base - h} Q${x + w * 0.5},${base - h - w * 0.5} ${x + w * 0.85},${base - h} L${x + w},${base} Z" fill="${col}"/><ellipse cx="${x + w / 2}" cy="${base - h - w * 0.2}" rx="${w * 0.42}" ry="${w * 0.18}" fill="#8a5a3a"/>`;
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="120" cy="300" r="70" fill="#fff0d0" opacity="0.6" filter="url(#${id}-glow)"/>
      ${list.map(([x, y, s], i) => balloon(x, y, s, cols[i % cols.length], i)).join("")}
      <g data-depth="0.06"><path d="M0,330 Q120,290 260,320 Q400,280 540,316 Q680,290 800,310 L800,450 L0,450 Z" fill="#e8b98a"/></g>
      <g data-depth="0.14">${chim(60, 380, 50, 90, "#ddb084")}${chim(130, 384, 40, 60, "#d6a274")}${chim(560, 380, 56, 110, "#ddb084")}${chim(640, 386, 44, 70, "#d6a274")}${chim(720, 382, 50, 95, "#e2bb8f")}</g>
      <g data-depth="0.22"><path d="M0,400 Q200,370 400,396 T800,390 L800,450 L0,450 Z" fill="url(#${id}-rock)"/>
        <g fill="#7a4e30"><rect x="600" y="372" width="6" height="8" rx="3"/><rect x="616" y="368" width="6" height="8" rx="3"/></g></g>`;
    return svg(id, body, defs, "بالونات فوق مداخن الجنيات");
  }


  // ---------- براغ: القلعة والكاتدرائية وجسر تشارلز ----------
  function prague() {
    const id = uid();
    const defs =
      grad(id + "-sky", [[0, "#24345e"], [0.5, "#8a5a86"], [0.82, "#f19a6a"], [1, "#ffd59a"]]) +
      grad(id + "-river", [[0, "#3c3f6e"], [1, "#16183a"]]) +
      grad(id + "-hill", [[0, "#3b3a5e"], [1, "#24233f"]]);
    const spire = (x, base, w, h, col) => `<rect x="${x - w / 2}" y="${base - h * 0.62}" width="${w}" height="${h * 0.62}" fill="${col}"/><path d="M${x - w / 2 - 2},${base - h * 0.62} L${x},${base - h} L${x + w / 2 + 2},${base - h * 0.62} Z" fill="${col}"/><rect x="${x - 0.8}" y="${base - h - 8}" width="1.6" height="9" fill="${col}"/>`;
    // الكاتدرائية: صحن طويل وبرجين أماميين وبرج كبير
    const cathedral = (x, base, col) => `
      <rect x="${x - 70}" y="${base - 46}" width="140" height="46" fill="${col}"/>
      <path d="M${x - 70},${base - 46} L${x},${base - 70} L${x + 70},${base - 46} Z" fill="${col}"/>
      ${spire(x - 58, base, 16, 132, col)}${spire(x - 34, base, 16, 132, col)}${spire(x + 40, base, 22, 112, col)}
      <circle cx="${x - 46}" cy="${base - 30}" r="7" fill="#ffcf8a" opacity=".55"/>`;
    // القلعة: مبنى طويل بنوافذ مضيئة
    let castle = `<rect x="70" y="214" width="250" height="40" fill="#2c2b4c"/>`;
    for (let i = 0; i < 18; i++) castle += `<rect x="${80 + i * 13}" y="${222 + (i % 2) * 14}" width="5" height="7" fill="#ffd08a" opacity="${0.35 + (i % 3) * 0.2}"/>`;
    // بيوت بأسقف حمراء
    const r = rng(11);
    let roofs = "";
    for (let x = 300; x < 800; ) { const w = 22 + r() * 28, h = 16 + r() * 22, b = 318; roofs += `<rect x="${x}" y="${b - h}" width="${w}" height="${h}" fill="#4a3c62"/><path d="M${x - 2},${b - h} L${x + w / 2},${b - h - w * 0.45} L${x + w + 2},${b - h} Z" fill="#b4513a"/>`; if (r() > 0.55) roofs += `<rect x="${x + w * 0.3}" y="${b - h + 6}" width="4" height="5" fill="#ffd08a" opacity=".7"/>`; x += w + 1; }
    roofs += spire(520, 318, 12, 92, "#3a3156") + spire(540, 318, 12, 92, "#3a3156") + spire(690, 318, 14, 74, "#3a3156");
    // جسر تشارلز: أقواس وتماثيل وبرج البوابة
    let bridge = `<rect x="0" y="336" width="800" height="12" fill="#2a2440"/>`;
    for (let i = 0; i < 9; i++) bridge += `<path d="M${i * 92 - 10},372 Q${i * 92 + 36},334 ${i * 92 + 82},372 Z" fill="url(#${id}-river)"/>`;
    for (let i = 0; i < 16; i++) bridge += `<rect x="${20 + i * 50}" y="322" width="4" height="14" fill="#2a2440"/><circle cx="${22 + i * 50}" cy="319" r="3.5" fill="#2a2440"/>`;
    bridge += `<rect x="700" y="276" width="44" height="62" fill="#2a2440"/><path d="M698,276 L722,240 L746,276 Z" fill="#2a2440"/><rect x="714" y="306" width="16" height="30" rx="8" fill="#ffcf8a" opacity=".35"/>`;
    for (let i = 0; i < 10; i++) bridge += `<circle cx="${40 + i * 70}" cy="330" r="2.2" fill="#ffd9a0"/><circle cx="${40 + i * 70}" cy="330" r="7" fill="#ffd9a0" opacity=".25" filter="url(#${id}-glow)"/>`;
    const refl = [0, 1, 2, 3].map((i) => `<rect x="${170 - i * 6}" y="${386 + i * 14}" width="${120 + i * 12}" height="3" rx="1.5" fill="#ffcf8a" opacity="${0.5 - i * 0.1}"/>`).join("");
    const body = `
      <rect width="800" height="450" fill="url(#${id}-sky)"/>
      <circle cx="610" cy="200" r="70" fill="#ffd9a0" opacity="0.4" filter="url(#${id}-glow)"/>
      <circle cx="610" cy="200" r="30" fill="#ffe3b6"/>
      ${birds("#3b2450")}
      ${clouds(id, "#ffd6c0", [[150, 70, 1.1, 80], [520, 110, 0.8, 70]])}
      <g data-depth="0.05"><path d="M0,270 Q90,214 210,218 Q330,222 420,268 L420,330 L0,330 Z" fill="url(#${id}-hill)"/></g>
      <g data-depth="0.08">${castle}${cathedral(205, 214, "#28264a")}</g>
      <g data-depth="0.12">${roofs}</g>
      <rect y="336" width="800" height="114" fill="url(#${id}-river)"/>
      ${refl}
      <g data-depth="0.2">${bridge}</g>`;
    return svg(id, body, defs, "قلعة براغ وجسر تشارلز وقت الغروب");
  }

  window.SCENES = { halong, hanoi, danang, hcmc, phuquoc, terraces, dunes, domes, balloons, prague };
})();
