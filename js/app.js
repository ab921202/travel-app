/* ══════════════════════════════════════════════════
   APP.JS  ·  Japan Travel App
   Navigation · Tabs · Route Map · Sakura · Modal
══════════════════════════════════════════════════ */

/* ── State ─────────────────────────────────────── */
let currentDayIndex  = null;
let currentColor     = DAY_COLORS[0];
let currentWeatherUrl = '';

/* ── DOM refs ───────────────────────────────────── */
const viewHome      = document.getElementById('view-home');
const viewMain      = document.getElementById('view-main');
const viewDayDetail = document.getElementById('view-day-detail');
const dayList       = document.getElementById('day-list');
const dayTimeline   = document.getElementById('day-timeline');
const spotModal     = document.getElementById('spot-modal');
const modalContent  = document.getElementById('modal-content');
const mainTabBar    = document.getElementById('main-tab-bar');


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

/* Tab Bar Visibility Logic */
function updateTabBarVisibility() {
  if (viewDayDetail.classList.contains('active')) {
    mainTabBar.classList.add('hide-tab-bar');
    return;
  }
  if (viewHome.classList.contains('active')) {
    if (viewHome.scrollTop > window.innerHeight * 0.4) {
      mainTabBar.classList.remove('hide-tab-bar');
    } else {
      mainTabBar.classList.add('hide-tab-bar');
    }
  } else {
    mainTabBar.classList.remove('hide-tab-bar');
  }
}

viewHome.addEventListener('scroll', updateTabBarVisibility, { passive: true });

/* Scroll to map section within the home view */
function scrollToMap() {
  const mapSection = document.getElementById('map-section');
  mapSection.scrollIntoView({ behavior: 'smooth' });
}

/* Show home (cover+map) view */
function showHome() {
  viewDayDetail.classList.remove('active');
  viewMain.classList.remove('active');
  viewMain.classList.remove('prev');
  viewHome.classList.remove('prev');
  viewHome.classList.add('active');
  updateTabBar('map');
  updateTabBarVisibility();
}

/* Show itinerary list view */
function showItinerary() {
  viewDayDetail.classList.remove('active');
  viewHome.classList.remove('active');
  viewHome.classList.add('prev');
  viewMain.classList.remove('prev');
  viewMain.classList.add('active');
  updateTabBar('itinerary');
  updateTabBarVisibility();
}

/* Show day detail */
function showDayDetail(idx) {
  currentDayIndex = idx;
  currentColor    = DAY_COLORS[idx];
  renderDayDetail(idx);

  viewMain.classList.add('prev');
  viewMain.classList.remove('active');
  viewDayDetail.classList.add('active');
  updateTabBarVisibility();
}

/* Back from day detail → restore itinerary list */
document.getElementById('back-btn').addEventListener('click', showItinerary);

function updateTabBar(active) {
  document.getElementById('tabbtn-map').classList.toggle('active', active === 'map');
  document.getElementById('tabbtn-itinerary').classList.toggle('active', active === 'itinerary');
}

/* Legacy: keep showMain pointing to home */
function showMain() { showHome(); }


/* ══════════════════════════════════════════════════
   ROUTE MAP  (SVG — straight vertical spine only)
══════════════════════════════════════════════════ */
function buildRouteMap() {
  const container = document.getElementById('route-map-svg-container');
  if (container.children.length > 0) return;
  container.innerHTML = routeMapSVG();
}

function routeMapSVG() {
  const C = DAY_COLORS;
  const SX = 52;   /* Main spine x */
  const LX = 72;   /* Label x */

  /* Helper: station stop */
  function stop(y, color, size, label, sub, day, nodeType) {
    let node = '';
    if (nodeType === 'star') {
      node = `<circle cx="${SX}" cy="${y}" r="${size + 3}" fill="${color}" opacity=".18"/>
              <circle cx="${SX}" cy="${y}" r="${size}" fill="${color}"/>
              <circle cx="${SX}" cy="${y}" r="${size - 3.5}" fill="white"/>
              <circle cx="${SX}" cy="${y}" r="${size - 7}" fill="${color}"/>`;
    } else if (nodeType === 'small') {
      node = `<circle cx="${SX}" cy="${y}" r="${size}" fill="${color}"/>`;
    } else {
      node = `<circle cx="${SX}" cy="${y}" r="${size}" fill="${color}"/>
              <circle cx="${SX}" cy="${y}" r="${size - 2.5}" fill="white"/>
              <circle cx="${SX}" cy="${y}" r="${size - 5}" fill="${color}"/>`;
    }
    const subEl = sub
      ? `<text x="${LX}" y="${y + 17}" font-size="10" fill="#9a9a9a" font-family="Noto Sans TC, sans-serif">${sub}</text>`
      : '';
    const dayEl = day
      ? `<rect x="226" y="${y - 10}" width="68" height="18" rx="9" fill="${color}" opacity=".9"/>
         <text x="260" y="${y + 3.5}" text-anchor="middle" font-size="9.5" fill="white" font-weight="bold"
               font-family="Noto Sans TC, sans-serif">${day}</text>`
      : '';
    return `${node}
    <text x="${LX}" y="${y + 5}" font-size="14" fill="${color}" font-weight="700"
          font-family="Noto Serif JP, serif">${label}</text>
    ${subEl}${dayEl}`;
  }

  /* Helper: vertical line segment */
  function vline(y1, y2, color, dash = '') {
    const da = dash ? `stroke-dasharray="${dash}"` : '';
    return `<line x1="${SX}" y1="${y1}" x2="${SX}" y2="${y2}"
                  stroke="${color}" stroke-width="2.5" ${da}/>`;
  }

  /* Helper: sub-stop (smaller, indented slightly) */
  function subStop(y, color, label, sub) {
    return `<circle cx="${SX}" cy="${y}" r="4.5" fill="${color}"/>
    <text x="${LX}" y="${y + 5}" font-size="13" fill="${color}" font-weight="600"
          font-family="Noto Serif JP, serif">${label}</text>
    ${sub ? `<text x="${LX}" y="${y + 19}" font-size="10" fill="#9a9a9a" font-family="Noto Sans TC, sans-serif">${sub}</text>` : ''}`;
  }

  return `
<svg viewBox="0 0 320 950" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">

  <!-- Background -->
  <rect width="320" height="950" fill="#f4efe6"/>

  <!-- Washi horizontal lines -->
  ${Array.from({length:16}, (_,i) => `<line x1="14" y1="${60+i*56}" x2="306" y2="${60+i*56}" stroke="#ddd7ca" stroke-width="0.6" opacity="0.5"/>`).join('')}

  <!-- Thin left accent bar -->
  <rect x="0" y="0" width="4" height="950" fill="${C[0]}" opacity="0.25"/>

  <!-- ══ TAIWAN (start) ══ -->
  <text x="${SX}" y="32" text-anchor="middle" font-size="20" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">🇹🇼</text>
  <text x="${LX}" y="28" font-size="13" fill="#8a8a8a" font-weight="600" font-family="Noto Sans TC, sans-serif">桃園國際機場 出發</text>

  <!-- Flight dashed line down -->
  ${vline(38, 78, '#bbb', '4 3')}
  <text x="${SX+10}" y="62" font-size="10" fill="#b0b0b0" font-family="Noto Sans TC, sans-serif">✈ 長榮航空 3h</text>

  <!-- ══ DAY 1 ══ -->
  ${stop(90, C[0], 5.5, '小松空港', null, 'Day 1 · 7/31', 'small')}
  ${vline(96, 148, C[0])}

  ${stop(160, C[0], 9, '金沢', '兼六園 · 近江町 · 東茶屋街 · 21美', null, 'star')}

  <!-- ══ DAY 2 ══ -->
  ${vline(176, 218, C[1], '5 3')}

  ${stop(230, C[1], 6, '富山', null, 'Day 2 · 8/1', 'normal')}
  ${vline(238, 278, C[1])}

  ${subStop(290, C[1], '立山', '高原バス')}
  ${vline(296, 334, C[1])}

  ${subStop(346, C[1], '室堂', '標高 2,450m')}
  ${vline(352, 390, C[1])}

  ${subStop(402, C[1], '黒部ダム', 'ケーブルカー＋トンネルバス')}
  ${vline(408, 444, C[1], '5 3')}

  ${stop(456, C[1], 6, '松本', '信濃大町経由', null, 'normal')}

  <!-- ══ DAY 3 ══ -->
  ${vline(464, 502, C[2], '5 3')}

  ${stop(514, C[2], 6, '上高地', '大正池 · 河童橋', 'Day 3 · 8/2', 'normal')}
  ${vline(522, 560, C[2])}

  ${subStop(572, C[2], '新穂高', 'ロープウェイ')}
  ${vline(578, 612, C[2])}

  ${subStop(624, C[2], '高山', '古い町並')}

  <!-- ══ DAY 3→6: 名古屋 ══ -->
  ${vline(630, 668, C[3], '5 3')}

  ${stop(682, C[3], 9, '名古屋', '名城 · 大須 · リニア館 · ジブリ', 'Day 3〜6', 'star')}

  <!-- ══ DAY 6 ══ -->
  ${vline(698, 736, C[5])}

  ${stop(748, C[5], 5.5, '中部国際空港', null, 'Day 6 · 8/5', 'small')}

  <!-- Flight up -->
  ${vline(754, 796, '#bbb', '4 3')}
  <text x="${SX+10}" y="778" font-size="10" fill="#b0b0b0" font-family="Noto Sans TC, sans-serif">✈ 台灣虎航 2h</text>

  <!-- ══ TAIWAN (end) ══ -->
  <text x="${SX}" y="832" text-anchor="middle" font-size="20" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">🇹🇼</text>
  <text x="${LX}" y="828" font-size="13" fill="#8a8a8a" font-weight="600" font-family="Noto Sans TC, sans-serif">桃園國際機場 抵達</text>

  <!-- Bottom padding -->
  <rect x="0" y="858" width="320" height="92" fill="#f4efe6"/>
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
   SPOT MODAL  —  mobile-optimized touch handling
══════════════════════════════════════════════════ */
function openSpotModal(spotId, color) {
  const spot = SPOTS[spotId];
  if (!spot) return;

  const typeLabel = spot.type === 'food' ? '美食' :
                    spot.type === 'experience' ? '體驗' : '景點';

  const imageHtml = spot.image
    ? `<img src="${spot.image}" style="width:100%;border-radius:8px;margin-bottom:15px;object-fit:cover;max-height:200px;" alt="${spot.nameZh || spot.nameJa}">`
    : '';
  const hoursHtml = spot.hours
    ? `<div style="font-size:13px;color:var(--ink-light);margin-bottom:12px;display:flex;align-items:center;"><span style="margin-right:6px;">🕒</span> ${spot.hours}</div>`
    : '';
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

  /* Reset scroll position when opening */
  const modalScroll = document.getElementById('modal-scroll');
  modalScroll.scrollTop = 0;

  spotModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  spotModal.classList.remove('open');
  document.body.style.overflow = '';
  const sheet = document.getElementById('modal-sheet');
  sheet.style.transition = '';
  sheet.style.transform  = '';
}

function openMap(encodedQuery) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank', 'noopener');
}

/* Backdrop click closes modal */
document.getElementById('modal-backdrop').addEventListener('click', closeModal);

/* ── Swipe-down gesture to close modal ────────── */
(function() {
  const sheet     = document.getElementById('modal-sheet');
  const modalScroll = document.getElementById('modal-scroll');
  let startY = 0;
  let startScrollTop = 0;
  let dragging = false;
  let swipeMode = false; // true = swiping sheet, false = scrolling content

  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startScrollTop = modalScroll.scrollTop;
    dragging = true;
    swipeMode = false;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;

    /* Only enter swipe mode if:
       - moving downward AND
       - scroll area is already at the top */
    if (!swipeMode) {
      if (dy > 8 && startScrollTop <= 0) {
        swipeMode = true;
      } else {
        return; // let normal scroll happen
      }
    }

    if (swipeMode && dy > 0) {
      /* Prevent the scroll from happening when swiping the sheet down */
      e.preventDefault();
      sheet.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: false });

  sheet.addEventListener('touchend', e => {
    if (!dragging) return;
    dragging = false;
    const dy = e.changedTouches[0].clientY - startY;

    if (swipeMode && dy > 80) {
      closeModal();
    } else {
      sheet.style.transition = 'transform .3s ease';
      sheet.style.transform  = '';
      setTimeout(() => {
        sheet.style.transition = '';
      }, 300);
    }
    swipeMode = false;
  }, { passive: true });
})();


/* ══════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════ */
renderDayList();
buildRouteMap();
