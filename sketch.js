/* Astra Atlas — päris tähtede J2000 koordinaatidel põhinev 3D-taevakaart. */

let CONSTELLATIONS = [];
let skyData = [];

const $ = selector => document.querySelector(selector);
const html = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = $('#skyCanvas');
const ctx = canvas.getContext('2d');
const state = { yaw: 0.2, pitch: 0.12, zoom: 1, selected: 'aries', dragging: false, dragDistance: 0, lastX: 0, lastY: 0, targetYaw: null, targetPitch: null, frame: 0 };
const motionModes = ['reduced', 'standard', 'enhanced'];
const motionLabels = { reduced: 'Vähendatud', standard: 'Standard', enhanced: 'Täiustatud' };

function starVector(raHours, decDegrees) {
  const ra = raHours * Math.PI / 12;
  const dec = decDegrees * Math.PI / 180;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.sin(dec), z: Math.cos(dec) * Math.sin(ra) };
}


function seededRandom(seed) {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

const ambientStars = Array.from({ length: 520 }, (_, index) => {
  const ra = seededRandom(index + 3) * 24;
  const dec = Math.asin(seededRandom(index + 77) * 2 - 1) * 180 / Math.PI;
  return { ...starVector(ra, dec), mag: 3.6 + seededRandom(index + 191) * 2.4 };
});

function project(point, width, height) {
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const x1 = point.x * cy - point.z * sy;
  const z1 = point.x * sy + point.z * cy;
  const y2 = point.y * cp - z1 * sp;
  const z2 = point.y * sp + z1 * cp;
  const radius = Math.min(width, height) * 0.44 * state.zoom;
  const perspective = 1 / (1.22 - z2 * 0.22);
  return { x: width / 2 + x1 * radius * perspective, y: height / 2 - y2 * radius * perspective, z: z2, visible: z2 > -0.32 };
}

function drawSky() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const isLight = html.dataset.theme === 'light';
  const bg = ctx.createRadialGradient(width * .55, height * .46, 0, width * .5, height * .5, Math.max(width, height) * .72);
  bg.addColorStop(0, isLight ? 'rgba(215,235,255,.92)' : 'rgba(11,45,90,.82)');
  bg.addColorStop(.48, isLight ? 'rgba(237,245,253,.98)' : 'rgba(7,23,48,.96)');
  bg.addColorStop(1, isLight ? '#eaf1f9' : '#050b16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawGrid(width, height, isLight);

  ambientStars.forEach((star, index) => {
    const p = project(star, width, height);
    if (!p.visible) return;
    const alpha = Math.max(.08, (p.z + .35) / 1.35) * (isLight ? .34 : .66);
    const twinkle = html.dataset.motion === 'enhanced' && !reduceMotion.matches ? .72 + Math.sin(state.frame * .018 + index) * .18 : 1;
    ctx.beginPath();
    ctx.fillStyle = isLight ? `rgba(22,67,124,${alpha * twinkle})` : `rgba(211,234,255,${alpha * twinkle})`;
    ctx.arc(p.x, p.y, Math.max(.45, 1.35 - (star.mag - 3.6) * .34), 0, Math.PI * 2);
    ctx.fill();
  });

  skyData.forEach(group => drawConstellation(group, width, height, isLight, group.id === state.selected));

  state.frame++;
  updateCoordinates();
  if (state.targetYaw !== null) animateFocus();
  requestAnimationFrame(drawSky);
}

function drawGrid(width, height, isLight) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isLight ? 'rgba(10,66,216,.10)' : 'rgba(95,164,230,.11)';
  [-60, -30, 0, 30, 60].forEach(dec => {
    ctx.beginPath(); let started = false;
    for (let ra = 0; ra <= 24.1; ra += .25) {
      const p = project(starVector(ra, dec), width, height);
      if (!p.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  });
  for (let ra = 0; ra < 24; ra += 3) {
    ctx.beginPath(); let started = false;
    for (let dec = -90; dec <= 90; dec += 3) {
      const p = project(starVector(ra, dec), width, height);
      if (!p.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawConstellation(group, width, height, isLight, selected) {
  const points = group.points.map(point => project(point, width, height));
  ctx.save();
  ctx.strokeStyle = selected ? (isLight ? 'rgba(0,120,178,.9)' : 'rgba(0,217,255,.9)') : (isLight ? 'rgba(10,66,216,.24)' : 'rgba(80,138,222,.28)');
  ctx.lineWidth = selected ? 1.8 : 1;
  if (selected) { ctx.shadowColor = isLight ? 'rgba(0,135,210,.32)' : 'rgba(0,217,255,.55)'; ctx.shadowBlur = 8; }
  group.lines.forEach(([a, b]) => {
    const p1 = points[a], p2 = points[b];
    if (!p1.visible || !p2.visible || Math.abs(p1.x - p2.x) > width * .55) return;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  });
  ctx.shadowBlur = 0;
  points.forEach((p, index) => {
    if (!p.visible) return;
    const star = group.points[index];
    const size = Math.max(1.15, 4.6 - star.mag * .85) * (selected ? 1.25 : .78);
    if (selected && size > 1.8) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      glow.addColorStop(0, isLight ? 'rgba(0,121,184,.35)' : 'rgba(88,225,255,.48)');
      glow.addColorStop(1, 'rgba(0,217,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = selected ? (isLight ? '#073d9d' : '#f4fbff') : (isLight ? 'rgba(28,70,125,.6)' : 'rgba(206,230,255,.72)');
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    if (selected && star.mag < 3.1) {
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = isLight ? 'rgba(11,48,93,.82)' : 'rgba(223,243,255,.82)';
      ctx.fillText(star.name, p.x + size + 6, p.y - size - 3);
    }
  });
  if (!selected) {
    const visible = points.filter(p => p.visible);
    if (visible.length >= Math.max(3, points.length * .55)) {
      const center = visible.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.fillStyle = isLight ? 'rgba(10,66,216,.48)' : 'rgba(126,178,234,.54)';
      ctx.fillText(group.name.toUpperCase(), center.x / visible.length + 8, center.y / visible.length - 8);
    }
  }
  ctx.restore();
}

function animateFocus() {
  const speed = html.dataset.motion === 'reduced' || reduceMotion.matches ? 1 : .065;
  let dy = state.targetYaw - state.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  state.yaw += dy * speed;
  state.pitch += (state.targetPitch - state.pitch) * speed;
  if (Math.abs(dy) < .002 && Math.abs(state.targetPitch - state.pitch) < .002) {
    state.yaw = state.targetYaw; state.pitch = state.targetPitch; state.targetYaw = null; state.targetPitch = null;
  }
}

function updateCoordinates() {
  let ra = (Math.PI / 2 - state.yaw) * 12 / Math.PI;
  while (ra < 0) ra += 24; while (ra >= 24) ra -= 24;
  const hours = Math.floor(ra), minutes = Math.floor((ra - hours) * 60);
  const dec = Math.round(state.pitch * 180 / Math.PI);
  $('#raReadout').textContent = `RA ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  $('#decReadout').textContent = `DEC ${dec >= 0 ? '+' : '−'}${String(Math.abs(dec)).padStart(2, '0')}°`;
}

function updateMapSelection(group, openMenu = false) {
  $('#constellationSelect').value = group.id;
  $('#markerGlyph').textContent = group.glyph;
  $('#markerName').textContent = group.name;
  $('#markerLatin').textContent = `${group.latinName} · ${group.abbreviation}`;
  $('#markerLocation').textContent = group.location;
  $('#markerDescription').textContent = group.description;
  $('#constellationMenu').hidden = !openMenu;
  updateDetails(group);
}

function focusConstellation(id, scroll = false, openMenu = true) {
  const group = skyData.find(c => c.id === id) || skyData[0];
  state.selected = group.id;
  const average = group.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  const length = Math.hypot(average.x, average.y, average.z);
  const vector = { x: average.x / length, y: average.y / length, z: average.z / length };
  const ra = Math.atan2(vector.z, vector.x);
  const dec = Math.asin(vector.y);
  state.targetYaw = Math.PI / 2 - ra;
  state.targetPitch = dec;
  state.zoom = 1.22;
  updateMapSelection(group, openMenu);
  if (scroll) $('#atlas').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function distanceToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function findConstellationAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const starRadius = coarsePointer ? 26 : 17;
  const lineRadius = coarsePointer ? 18 : 11;
  let closest = null;

  skyData.forEach(group => {
    const points = group.points.map(point => project(point, rect.width, rect.height));
    let distance = Infinity;
    points.forEach(point => {
      if (point.visible) distance = Math.min(distance, Math.hypot(x - point.x, y - point.y));
    });
    group.lines.forEach(([a, b]) => {
      if (points[a].visible && points[b].visible) distance = Math.min(distance, distanceToSegment(x, y, points[a], points[b]));
    });
    const threshold = distance <= starRadius ? starRadius : lineRadius;
    if (distance <= threshold && (!closest || distance < closest.distance)) closest = { group, distance };
  });

  return closest?.group || null;
}

function openConstellationMenu(group) {
  state.selected = group.id;
  updateMapSelection(group, true);
}

function updateDetails(group) {
  $('#detailsTitle').textContent = `${group.name} taevas`;
  $('#detailsDescription').textContent = group.description;
  $('#detailGlyph').textContent = group.glyph;
  $('#latinName').textContent = `${group.latinName} · ${group.abbreviation}`;
  $('#detailName').textContent = group.name;
  $('#mythText').textContent = group.myth;
  const brightest = [...group.stars].sort((a, b) => a[3] - b[3])[0];
  $('#brightestStar').textContent = brightest[0];
  $('#brightestMagnitude').textContent = `${brightest[3].toFixed(2).replace('.', ',')} tähesuurust`;
  $('#bestMonth').textContent = group.best;
  $('#hemisphere').textContent = group.location;
  $('#constellationArea').textContent = `${group.area} ruutkraadi`;
}

function getZodiac(month, day) {
  return CONSTELLATIONS.find(sign => {
    const [[sm, sd], [em, ed]] = sign.months;
    if (sm <= em) return (month > sm || month === sm && day >= sd) && (month < em || month === em && day <= ed);
    return (month > sm || month === sm && day >= sd) || (month < em || month === em && day <= ed);
  });
}

function showResult(sign) {
  $('#resultEmpty').hidden = true;
  $('#zodiacResult').hidden = false;
  $('#resultGlyph').textContent = sign.glyph;
  $('#resultRange').textContent = sign.range;
  $('#resultName').textContent = sign.name;
  $('#elementBadge').textContent = sign.element.toUpperCase();
  $('#resultSummary').textContent = sign.summary;
  $('#resultStrength').textContent = sign.strength;
  $('#resultGrowth').textContent = sign.growth;
  $('#resultMode').textContent = sign.mode;
  $('#resultPlanet').textContent = sign.planet;
  $('#showOnMap').dataset.sign = sign.id;
  focusConstellation(sign.id);
}

function setupControls() {
  $('#constellationSelect').innerHTML = CONSTELLATIONS.map(c => `<option value="${c.id}">${c.glyph} ${c.name}</option>`).join('');
  $('#starCount').textContent = `${CONSTELLATIONS.reduce((sum, c) => sum + c.stars.length, 0)} kaardistatud tähte`;
  $('#constellationSelect').addEventListener('change', event => focusConstellation(event.target.value, false, true));

  $('#birthForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#birthDate');
    if (!input.value) {
      $('#dateError').textContent = 'Vali kõigepealt sünnikuupäev.';
      input.setAttribute('aria-invalid', 'true'); input.focus(); return;
    }
    const [, month, day] = input.value.split('-').map(Number);
    const sign = getZodiac(month, day);
    if (!sign) { $('#dateError').textContent = 'Kuupäeva ei õnnestunud tõlgendada.'; return; }
    $('#dateError').textContent = ''; input.removeAttribute('aria-invalid'); showResult(sign);
  });
  $('#birthDate').addEventListener('input', () => { $('#dateError').textContent = ''; $('#birthDate').removeAttribute('aria-invalid'); });
  $('#showOnMap').addEventListener('click', event => focusConstellation(event.currentTarget.dataset.sign, true));
  $('#closeConstellationMenu').addEventListener('click', () => $('#constellationMenu').hidden = true);
  $('#openConstellationDetails').addEventListener('click', () => $('#details').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }));

  $('#zoomIn').addEventListener('click', () => state.zoom = Math.min(1.85, state.zoom + .14));
  $('#zoomOut').addEventListener('click', () => state.zoom = Math.max(.65, state.zoom - .14));
  $('#resetView').addEventListener('click', () => { state.yaw = .2; state.pitch = .12; state.zoom = 1; state.targetYaw = null; state.targetPitch = null; });

  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.dragDistance = 0; state.lastX = event.clientX; state.lastY = event.clientY; state.targetYaw = null; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) {
      canvas.style.cursor = findConstellationAt(event.clientX, event.clientY) ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.dragDistance += Math.hypot(dx, dy);
    state.yaw -= dx * .006;
    state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + dy * .006));
    state.lastX = event.clientX; state.lastY = event.clientY;
  });
  canvas.addEventListener('pointerup', event => {
    state.dragging = false;
    if (state.dragDistance < 8) {
      const group = findConstellationAt(event.clientX, event.clientY);
      if (group) openConstellationMenu(group);
    }
  });
  canvas.addEventListener('pointercancel', () => state.dragging = false);
  canvas.addEventListener('wheel', event => { event.preventDefault(); state.zoom = Math.max(.65, Math.min(1.85, state.zoom - event.deltaY * .001)); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const step = .06;
    if (event.key === 'ArrowLeft') state.yaw -= step;
    else if (event.key === 'ArrowRight') state.yaw += step;
    else if (event.key === 'ArrowUp') state.pitch = Math.min(1.35, state.pitch + step);
    else if (event.key === 'ArrowDown') state.pitch = Math.max(-1.35, state.pitch - step);
    else return;
    event.preventDefault(); state.targetYaw = null;
  });

  $('#themeButton').addEventListener('click', () => {
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('astra-theme', html.dataset.theme);
  });
  $('#motionButton').addEventListener('click', () => {
    const next = motionModes[(motionModes.indexOf(html.dataset.motion) + 1) % motionModes.length];
    html.dataset.motion = next; $('#motionLabel').textContent = motionLabels[next]; localStorage.setItem('astra-motion', next);
  });

  const sidebar = $('#sidebar'), menuButton = $('#menuButton'), scrim = $('#menuScrim');
  const closeMenu = () => { sidebar.classList.remove('open'); scrim.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); };
  menuButton.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); scrim.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); });
  scrim.addEventListener('click', closeMenu);
  document.querySelectorAll('.nav-list a').forEach(link => link.addEventListener('click', closeMenu));

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-list a')];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  }), { rootMargin: '-20% 0px -68%' });
  sections.forEach(section => observer.observe(section));
}

async function init() {
  const savedTheme = localStorage.getItem('astra-theme');
  const savedMotion = localStorage.getItem('astra-motion');
  html.dataset.theme = savedTheme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  html.dataset.motion = motionModes.includes(savedMotion) ? savedMotion : 'standard';
  $('#motionLabel').textContent = motionLabels[html.dataset.motion];
  try {
    const response = await fetch('./constellations.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    CONSTELLATIONS = await response.json();
    const valid = Array.isArray(CONSTELLATIONS) && CONSTELLATIONS.length === 12 && CONSTELLATIONS.every(item =>
      item.id && item.name && item.latinName && item.abbreviation && item.description && item.location && Array.isArray(item.stars) && Array.isArray(item.lines));
    if (!valid) throw new Error('Vigane tähtkujude andmestik');
    skyData = CONSTELLATIONS.map(c => ({ ...c, points: c.stars.map(s => ({ ...starVector(s[1], s[2]), name: s[0], mag: s[3] })) }));
    setupControls();
    focusConstellation('aries', false, false);
    drawSky();
  } catch (error) {
    console.error('Tähtkujude laadimine ebaõnnestus:', error);
    $('#mapDataError').hidden = false;
    $('#constellationSelect').disabled = true;
  }
}

init();
