/* ══════════════════════════════════════════════════
   APP.JS  ·  Japan Travel App
   Navigation · Tabs · Route Map · Sakura · Modal
══════════════════════════════════════════════════ */

/* ── State ─────────────────────────────────────── */
let currentDayIndex  = null;
let currentColor     = DAY_COLORS[0];
let currentWeatherUrl = '';
let currentTab       = 'map';

/* ── DOM refs ───────────────────────────────────── */
const viewCover     = document.getElementById('view-cover');
const viewMain      = document.getElementById('view-main');
const viewDayDetail = document.getElementById('view-day-detail');
const dayList       = document.getElementById('day-list');
const dayTimeline   = document.getElementById('day-timeline');
const spotModal     = document.getElementById('spot-modal');
const modalContent  = document.getElementById('modal-content');


/* ══════════════════════════════════════════════════
   SAKURA ANIMATION
══════════════════════════════════════════════════ */
(function initSakura() {
  const canvas = document.getElementById('sakura-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, petals;
  const N = 38;
  const COLORS = [
    'rgba(255,200,210,.85)', 'rgba(255,170,185,.75)',
    'rgba(255,215,225,.65)', 'rgba(230,180,200,.6)'
  ];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function randomPetal(fromTop) {
    const size = 5 + Math.random() * 9;
    return {
      x: Math.random() * W, y: fromTop ? -size : Math.random() * H,
      size, speed: .5 + Math.random() * 1.2,
      drift: (Math.random() - .5) * .7,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .04,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: .4 + Math.random() * .55
    };
  }
  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * .55, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach(p => {
      p.y += p.speed; p.x += p.drift + Math.sin(p.y * .012) * .45;
      p.rot += p.rotSpeed;
      if (p.y > H + 20) Object.assign(p, randomPetal(true));
      drawPetal(p);
    });
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize);
  resize();
  petals = Array.from({ length: N }, () => randomPetal(false));
  tick();
})();


/* ══════════════════════════════════════════════════
   VIEW NAVIGATION
══════════════════════════════════════════════════ */
function showMain() {
  viewCover.classList.remove('active');
  viewDayDetail.classList.remove('active');
  viewMain.classList.remove('prev');
  viewMain.classList.add('active');
}

function showDayDetail(idx) {
  currentDayIndex = idx;
  currentColor    = DAY_COLORS[idx];
  renderDayDetail(idx);

  viewMain.classList.add('prev');
  viewMain.classList.remove('active');
  viewDayDetail.classList.add('active');
}

/* Back from day detail → restore last tab */
document.getElementById('back-btn').addEventListener('click', showMain);


/* ══════════════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════════════ */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-bar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`tabbtn-${tab}`).classList.add('active');

  /* Lazy-build route map on first show */
  if (tab === 'map') buildRouteMap();
}


/* ══════════════════════════════════════════════════
   ROUTE MAP  (SVG route diagram)
══════════════════════════════════════════════════ */
let routeMapBuilt = false;
function buildRouteMap() {
  if (routeMapBuilt) return;
  routeMapBuilt = true;
  const container = document.getElementById('route-map-svg-container');
  container.innerHTML = routeMapSVG();
}

function routeMapSVG() {
  const C = DAY_COLORS;
  const SX = 58;   /* Main spine x */
  const LX = 76;   /* Label x */

  /* Helper: station row */
  function stop(x, y, color, size, label, sub, day, nodeType) {
    let node = '';
    if (nodeType === 'star') {
      node = `<circle cx="${x}" cy="${y}" r="${size + 3}" fill="${color}" opacity=".18"/>
              <circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>
              <circle cx="${x}" cy="${y}" r="${size - 3.5}" fill="white"/>
              <circle cx="${x}" cy="${y}" r="${size - 7}" fill="${color}"/>`;
    } else if (nodeType === 'small') {
      node = `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>`;
    } else {
      node = `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>
              <circle cx="${x}" cy="${y}" r="${size - 2.5}" fill="white"/>
              <circle cx="${x}" cy="${y}" r="${size - 5}" fill="${color}"/>`;
    }
    const subEl = sub
      ? `<text x="${LX}" y="${y + 16}" font-size="9.5" fill="#9a9a9a" font-family="Noto Sans TC, sans-serif">${sub}</text>`
      : '';
    const dayEl = day
      ? `<rect x="256" y="${y - 10}" width="58" height="17" rx="8.5" fill="${color}" opacity=".9"/>
         <text x="285" y="${y + 3}" text-anchor="middle" font-size="9" fill="white" font-weight="bold"
               font-family="Noto Sans TC, sans-serif">${day}</text>`
      : '';
    return `${node}
    <text x="${LX}" y="${y + 4}" font-size="13.5" fill="${color}" font-weight="700"
          font-family="Noto Serif JP, serif">${label}</text>
    ${subEl}${dayEl}`;
  }

  /* Helper: vertical line segment */
  function vline(x, y1, y2, color, dash = '') {
    const da = dash ? `stroke-dasharray="${dash}"` : '';
    return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"
                  stroke="${color}" stroke-width="2.2" ${da}/>`;
  }

  return `
<svg viewBox="0 0 320 825" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">

  <!-- Background -->
  <rect width="320" height="825" fill="#f4efe6"/>

  <!-- Horizontal rules (washi paper) -->
  ${Array.from({length:13}, (_,i) => `<line x1="14" y1="${65+i*58}" x2="306" y2="${65+i*58}" stroke="#ddd7ca" stroke-width="0.6" opacity="0.55"/>`).join('')}

  <!-- Thin left accent bar -->
  <rect x="0" y="0" width="4" height="825" fill="${C[0]}" opacity="0.25"/>

  <!-- ══ TAIWAN (start) ══ -->
  <text x="160" y="32" text-anchor="middle" font-size="22" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">🇹🇼</text>
  <text x="174" y="32" font-size="10.5" fill="#8a8a8a" font-family="Noto Sans TC, sans-serif">桃園國際機場出發</text>

  <!-- Flight dashed line down -->
  ${vline(SX, 38, 80, '#bbb', '4 3')}
  <text x="${SX+9}" y="62" font-size="9.5" fill="#b0b0b0" font-family="Noto Sans TC, sans-serif">✈ 長榮航空 3h</text>

  <!-- ══ DAY 1 ══ -->
  ${stop(SX, 93, C[0], 5.5, '小松空港', null, 'Day 1 · 7/31', 'small')}
  ${vline(SX, 99, 158, C[0])}

  ${stop(SX, 170, C[0], 8, '金沢', '兼六園 · 近江町 · 東茶屋街 · 21美', 'Day 1', 'star')}

  <!-- ══ DAY 2 ══ -->
  ${vline(SX, 182, 234, C[1], '5 3')}

  ${stop(SX, 246, C[1], 6, '富山', null, 'Day 2 · 8/1', 'normal')}
  ${vline(SX, 252, 272, C[1])}

  <!-- Branch line right: 富山 → 立山ルート -->
  <line x1="${SX}" y1="272" x2="88" y2="295" stroke="${C[1]}" stroke-width="2" stroke-linecap="round"/>
  <line x1="88" y1="295" x2="240" y2="295" stroke="${C[1]}" stroke-width="2"/>

  <!-- 立山ルート stops (horizontal) -->
  <circle cx="97"  cy="295" r="4" fill="${C[1]}"/>
  <text x="97"  y="313" text-anchor="middle" font-size="9" fill="${C[1]}" font-weight="700" font-family="Noto Serif JP, serif">立山</text>

  <circle cx="145" cy="295" r="4" fill="${C[1]}"/>
  <text x="145" y="313" text-anchor="middle" font-size="9" fill="${C[1]}" font-weight="700" font-family="Noto Serif JP, serif">室堂</text>

  <circle cx="190" cy="295" r="4" fill="${C[1]}"/>
  <text x="190" y="313" text-anchor="middle" font-size="8.5" fill="${C[1]}" font-weight="700" font-family="Noto Serif JP, serif">黒部ダム</text>

  <circle cx="237" cy="295" r="4" fill="${C[1]}"/>
  <text x="237" y="313" text-anchor="middle" font-size="9" fill="${C[1]}" font-weight="700" font-family="Noto Serif JP, serif">扇沢</text>

  <!-- Return:扇沢 → 信濃大町 → 松本 (curve back to spine) -->
  <path d="M237 299 Q237 340 130 356 Q90 362 ${SX} 367"
        stroke="${C[1]}" stroke-width="1.8" fill="none" stroke-dasharray="5 3"/>
  <text x="148" y="352" font-size="8.5" fill="#aaa" text-anchor="middle"
        font-family="Noto Sans TC, sans-serif">→ 信濃大町</text>

  ${stop(SX, 380, C[1], 6, '松本', null, null, 'normal')}

  <!-- ══ DAY 3 ══ -->
  ${vline(SX, 386, 428, C[2], '5 3')}

  ${stop(SX, 440, C[2], 6, '上高地', '大正池 · 河童橋', 'Day 3 · 8/2', 'normal')}
  ${vline(SX, 448, 482, C[2])}

  ${stop(SX, 494, C[2], 5, '新穂高', null, null, 'small')}
  ${vline(SX, 499, 525, C[2])}

  ${stop(SX, 537, C[2], 5, '高山', null, null, 'small')}

  <!-- ══ DAY 3→6: 名古屋 ══ -->
  ${vline(SX, 543, 592, C[3], '5 3')}

  ${stop(SX, 606, C[3], 9, '名古屋', '名城 · 大須 · リニア館 · ジブリ', 'Day 3〜6', 'star')}

  <!-- ══ DAY 6 ══ -->
  ${vline(SX, 620, 668, C[5])}

  ${stop(SX, 680, C[5], 5.5, '中部国際空港', null, 'Day 6 · 8/5', 'small')}

  <!-- Flight up -->
  ${vline(SX, 686, 728, '#bbb', '4 3')}
  <text x="${SX+9}" y="710" font-size="9.5" fill="#b0b0b0" font-family="Noto Sans TC, sans-serif">✈ 台灣虎航 2h</text>

  <!-- ══ TAIWAN (end) ══ -->
  <text x="160" y="762" text-anchor="middle" font-size="22" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">🇹🇼</text>
  <text x="174" y="762" font-size="10.5" fill="#8a8a8a" font-family="Noto Sans TC, sans-serif">桃園國際機場抵達</text>

  <!-- Bottom padding -->
  <rect x="0" y="800" width="320" height="25" fill="#f4efe6"/>
</svg>`;
}


/* ══════════════════════════════════════════════════
   RENDER: DAY LIST CARDS
══════════════════════════════════════════════════ */
function renderDayList() {
  if (dayList.childElementCount === DAYS.length) return;
  dayList.innerHTML = '';

  DAYS.forEach((day, i) => {
    const color = DAY_COLORS[i];
    const card  = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-card-stripe" style="background:${color}"></div>
      <div class="day-card-body">
        <div class="day-card-text">
          <div class="day-badge" style="background:${color}">${day.label}</div>
          <div class="day-card-title">${day.titleJa}</div>
          <div class="day-card-meta">${day.date} &nbsp;·&nbsp; ${day.location}</div>
        </div>
        <div class="day-card-arrow">›</div>
      </div>`;
    card.addEventListener('click', () => showDayDetail(i));
    dayList.appendChild(card);
  });
}


/* ══════════════════════════════════════════════════
   RENDER: DAY DETAIL
══════════════════════════════════════════════════ */
function renderDayDetail(idx) {
  const day   = DAYS[idx];
  const color = DAY_COLORS[idx];

  /* Header */
  const header = document.getElementById('day-detail-header');
  header.style.background = color;
  document.getElementById('day-detail-label').textContent    = `${day.label}  ·  ${day.date}`;
  document.getElementById('day-detail-title').textContent    = day.titleJa;
  document.getElementById('day-detail-location').textContent = day.location;

  /* Store weather URL for the button */
  currentWeatherUrl = day.weatherUrl || '';

  /* Timeline */
  dayTimeline.innerHTML = '';

  day.items.forEach((item, i) => {
    const isLast = i === day.items.length - 1;

    /* Food-rec items: special food search card */
    if (item.type === 'food-rec') {
      const row  = document.createElement('div');
      row.className = 'timeline-row';

      const dotEl = document.createElement('div');
      dotEl.className = 'tl-dot';
      dotEl.textContent = item.icon;

      const lineEl = document.createElement('div');
      lineEl.className = 'tl-connector';
      if (isLast) lineEl.style.display = 'none';

      const leftEl = document.createElement('div');
      leftEl.className = 'tl-left';
      leftEl.appendChild(dotEl);
      leftEl.appendChild(lineEl);

      const card = document.createElement('div');
      card.className = 'tl-card is-food-rec';
      const mealLabel = item.mealType === 'lunch' ? '午餐' : '晚餐';
      card.innerHTML = `
        <div class="food-rec-header">
          <div class="food-rec-icon-ring">🗺️</div>
          <div class="food-rec-title">${mealLabel}推薦美食</div>
        </div>
        <div class="food-rec-subtitle">${item.locationJa} 附近餐廳</div>
        <div class="food-rec-cta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          在 Google Maps 搜尋
        </div>`;
      card.addEventListener('click', () => {
        const url = `https://www.google.com/maps/search/${encodeURIComponent(item.foodQuery)}`;
        window.open(url, '_blank', 'noopener');
      });

      const rightEl = document.createElement('div');
      rightEl.className = 'tl-right';
      rightEl.appendChild(card);

      row.appendChild(leftEl);
      row.appendChild(rightEl);
      dayTimeline.appendChild(row);
      return;
    }

    /* Regular items */
    const row = document.createElement('div');
    row.className = 'timeline-row';

    const dotEl = document.createElement('div');
    dotEl.className = 'tl-dot' + (item.type === 'fixed' ? ' fixed' : '');
    if (item.type === 'fixed') {
      dotEl.style.background = color;
      dotEl.textContent = '!';
    } else {
      dotEl.textContent = item.icon || '•';
    }

    const lineEl = document.createElement('div');
    lineEl.className = 'tl-connector';
    if (isLast) lineEl.style.display = 'none';

    const leftEl = document.createElement('div');
    leftEl.className = 'tl-left';
    leftEl.appendChild(dotEl);
    leftEl.appendChild(lineEl);

    const rightEl = document.createElement('div');
    rightEl.className = 'tl-right';

    if (item.type === 'fixed' && item.time) {
      const timeTag = document.createElement('div');
      timeTag.className = 'tl-time-tag';
      timeTag.style.background = color;
      timeTag.textContent = item.time;
      rightEl.appendChild(timeTag);
    }

    rightEl.appendChild(buildTimelineCard(item, color));
    row.appendChild(leftEl);
    row.appendChild(rightEl);
    dayTimeline.appendChild(row);
  });
}

function buildTimelineCard(item, color) {
  const card      = document.createElement('div');
  const hasDetail = !!item.spotId;
  const isStatic  = (item.type === 'transport' || item.type === 'fixed');

  let cls = 'tl-card';
  if (isStatic)                   cls += ' is-transport';
  if (item.type === 'food')       cls += ' is-food';
  if (item.type === 'attraction') cls += ' is-attraction';
  if (item.type === 'experience') cls += ' is-experience';
  card.className = cls;

  if (!isStatic) {
    card.style.borderLeft  = `3.5px solid ${color}`;
    card.style.paddingLeft = '11px';
  }

  let html = `<div class="tl-card-title">${item.titleJa || ''}</div>`;
  if (item.titleZh) html += `<div class="tl-card-title-zh">${item.titleZh}</div>`;
  if (item.desc)    html += `<div class="tl-card-desc">${item.desc}</div>`;

  if (hasDetail) {
    const chipClass = item.type === 'food'       ? 'chip-food' :
                      item.type === 'experience' ? 'chip-experience' : 'chip-attraction';
    const chipText  = item.type === 'food'       ? '美食介紹' :
                      item.type === 'experience' ? '體驗介紹' : '景點介紹';
    html += `<div class="tl-card-chip ${chipClass}">${chipText}</div>`;
    html += `<div class="tl-card-tap-hint">›</div>`;
  }

  card.innerHTML = html;

  if (hasDetail) {
    card.addEventListener('click', () => openSpotModal(item.spotId, color));
  }
  return card;
}


/* ══════════════════════════════════════════════════
   WEATHER
══════════════════════════════════════════════════ */
function openWeather() {
  if (currentWeatherUrl) window.open(currentWeatherUrl, '_blank', 'noopener');
}


/* ══════════════════════════════════════════════════
   SPOT MODAL
══════════════════════════════════════════════════ */
function openSpotModal(spotId, color) {
  const spot = SPOTS[spotId];
  if (!spot) return;

  const typeLabel = spot.type === 'food' ? '美食' :
                    spot.type === 'experience' ? '體驗' : '景點';

  const imageHtml = spot.image ? `<img src="${spot.image}" style="width: 100%; border-radius: 8px; margin-bottom: 15px; object-fit: cover; max-height: 200px;" alt="${spot.nameZh || spot.nameJa}">` : '';
  const hoursHtml = spot.hours ? `<div style="font-size: 13px; color: var(--ink-light); margin-bottom: 12px; display: flex; align-items: center;"><span style="margin-right: 6px;">🕒</span> ${spot.hours}</div>` : '';
  const formattedDesc = spot.description ? spot.description.replace(/\n\n/g, '<br><br>') : '';

  modalContent.innerHTML = `
    <div class="modal-tag" style="background:${color}">${typeLabel}</div>
    ${imageHtml}
    <div class="modal-name-ja">${spot.nameJa}</div>
    ${spot.nameZh ? `<div class="modal-name-zh">${spot.nameZh}</div>` : ''}
    <div class="modal-gold-line"></div>
    ${hoursHtml}
    <div class="modal-description">${formattedDesc}</div>
    <button class="modal-map-btn" style="background:${color}"
            onclick="openMap('${encodeURIComponent(spot.mapQuery)}')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      在 Google Maps 查看
    </button>`;

  spotModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  spotModal.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('modal-sheet').style.transform = '';
}

function openMap(encodedQuery) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank', 'noopener');
}

spotModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

/* Swipe-down to close modal */
(function() {
  let startY = 0, dragging = false;
  const sheet = document.getElementById('modal-sheet');

  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY; dragging = true;
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (!dragging) return; dragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) {
      closeModal();
    } else {
      sheet.style.transition = 'transform .3s ease';
      sheet.style.transform  = '';
      setTimeout(() => sheet.style.transition = '', 300);
    }
  });
})();


/* ══════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════ */
renderDayList();
buildRouteMap(); /* pre-build map immediately so it's instant */
