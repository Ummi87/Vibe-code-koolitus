/* Astra Atlas — päris tähtede J2000 koordinaatidel põhinev 3D-taevakaart. */

let CONSTELLATIONS = [];
let skyData = [];
let ambientStars = [];
let backgroundScreenPoints = [];

const $ = selector => document.querySelector(selector);
const html = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = $('#skyCanvas');
const ctx = canvas.getContext('2d');
const state = { yaw: 0.2, pitch: 0.12, zoom: 1, selected: 'aries', selectedStar: null, birthMethod: 'date', dragging: false, dragDistance: 0, lastX: 0, lastY: 0, targetYaw: null, targetPitch: null, frame: 0 };

function starVector(raHours, decDegrees) {
  const ra = raHours * Math.PI / 12;
  const dec = decDegrees * Math.PI / 180;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.sin(dec), z: Math.cos(dec) * Math.sin(ra) };
}


// Great-circle edges on the celestial sphere, sampled before projection.
function arcPoints(a, b) {
  const angle = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));
  const steps = Math.max(2, Math.ceil(angle / (Math.PI / 180)));
  const sin = Math.sin(angle);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = sin > 1e-8 ? Math.sin((1 - t) * angle) / sin : 1 - t;
    const v = sin > 1e-8 ? Math.sin(t * angle) / sin : t;
    return { x: a.x * u + b.x * v, y: a.y * u + b.y * v, z: a.z * u + b.z * v };
  });
}

function project(point, width, height) {
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const x1 = point.x * cy - point.z * sy;
  const z1 = point.x * sy + point.z * cy;
  const y2 = point.y * cp - z1 * sp;
  const z2 = point.y * sp + z1 * cp;
  const radius = Math.min(width, height) * 0.44 * state.zoom;
  // Orthographic hemisphere: no back-side stars folded over front-side stars.
  return { x: width / 2 + x1 * radius, y: height / 2 - y2 * radius, z: z2, visible: z2 >= 0 };
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

  backgroundScreenPoints = [];
  ambientStars.forEach(star => {
    const p = project(star, width, height);
    if (!p.visible) return;
    const alpha = (.3 + .7 * p.z) * (isLight ? .6 : .85);
    backgroundScreenPoints.push({ star, point: p });
    ctx.beginPath();
    ctx.fillStyle = isLight ? `rgba(22,67,124,${alpha})` : `rgba(211,234,255,${alpha})`;
    ctx.arc(p.x, p.y, Math.max(.55, 2.8 - star.apparentMagnitude * .42), 0, Math.PI * 2);
    ctx.fill();
    if (state.selectedStar?.starId === star.id) {
      ctx.strokeStyle = isLight ? '#0078b2' : '#73e6ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke();
    }
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
  group.screenPoints = points;
  group.screenSegments = [];
  ctx.save();
  ctx.strokeStyle = selected ? (isLight ? 'rgba(0,120,178,.9)' : 'rgba(0,217,255,.9)') : (isLight ? 'rgba(10,66,216,.24)' : 'rgba(80,138,222,.28)');
  ctx.lineWidth = selected ? 1.8 : 1;
  if (selected) { ctx.shadowColor = isLight ? 'rgba(0,135,210,.32)' : 'rgba(0,217,255,.55)'; ctx.shadowBlur = 8; }
  group.arcs.forEach(arc => {
    const projected = arc.map(p => project(p, width, height));
    for (let i = 1; i < projected.length; i++) {
      const p1 = projected[i - 1], p2 = projected[i];
      if (!p1.visible || !p2.visible) continue;
      group.screenSegments.push([p1, p2]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;
  points.forEach((p, index) => {
    if (!p.visible) return;
    const star = group.points[index];
    const isSelectedStar = state.selectedStar?.groupId === group.id && state.selectedStar.starId === star.id;
    const size = Math.max(1.15, 4.6 - star.apparentMagnitude * .85) * (selected ? 1.25 : .78) * (isSelectedStar ? 1.45 : 1);
    if (selected && size > 1.8) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      glow.addColorStop(0, isLight ? 'rgba(0,121,184,.35)' : 'rgba(88,225,255,.48)');
      glow.addColorStop(1, 'rgba(0,217,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = selected ? (isLight ? '#073d9d' : '#f4fbff') : (isLight ? 'rgba(28,70,125,.6)' : 'rgba(206,230,255,.72)');
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    if (isSelectedStar) {
      ctx.strokeStyle = isLight ? 'rgba(0,105,205,.95)' : 'rgba(115,230,255,.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, size + 6, 0, Math.PI * 2); ctx.stroke();
    }
  });
  if (selected) {
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = isLight ? 'rgba(11,48,93,.92)' : 'rgba(223,243,255,.92)';
    const placed = [];
    const labels = group.points.map((star, i) => ({ star, p: points[i], active: state.selectedStar?.starId === star.id }))
      .filter(s => s.p.visible && (s.active || s.star.apparentMagnitude < 3.1))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.star.apparentMagnitude - b.star.apparentMagnitude);
    for (const { star, p } of labels) {
      const w = ctx.measureText(star.name).width;
      const positions = [[p.x+10,p.y-10],[p.x-w-10,p.y-10],[p.x+10,p.y+19],[p.x-w-10,p.y+19]];
      for (const [x, y] of positions) {
        const rect = { x:x-3, y:y-12, w:w+6, h:17 };
        if (rect.x < 0 || rect.x + rect.w > width || rect.y < 0 || rect.y + rect.h > height) continue;
        if (placed.some(b => rect.x < b.x+b.w && rect.x+rect.w > b.x && rect.y < b.y+b.h && rect.y+rect.h > b.y)) continue;
        if (points.some(q => q.visible && q.x > rect.x && q.x < rect.x+rect.w && q.y > rect.y && q.y < rect.y+rect.h)) continue;
        ctx.fillText(star.name,x,y); placed.push(rect); break;
      }
    }
  }
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
  const speed = reduceMotion.matches ? 1 : .065;
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
  $('#starSelect').replaceChildren(new Option('Vali täht kaardilt või nimekirjast', ''), ...group.stars.map(star => new Option(star.name, star.id)));
  updateDetails(group);
}

function focusConstellation(id, scroll = false, openMenu = true) {
  const group = skyData.find(c => c.id === id) || skyData[0];
  state.selected = group.id;
  state.selectedStar = null;
  $('#starMenu').hidden = true;
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
  const x = (clientX - rect.left) * canvas.clientWidth / rect.width, y = (clientY - rect.top) * canvas.clientHeight / rect.height;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const starRadius = coarsePointer ? 26 : 17;
  const lineRadius = coarsePointer ? 18 : 11;
  let closest = null;

  skyData.forEach(group => {
    const points = group.screenPoints || [];
    let distance = Infinity;
    points.forEach(point => {
      if (point.visible) distance = Math.min(distance, Math.hypot(x - point.x, y - point.y));
    });
    if (distance > starRadius) distance = Infinity;
    for (const [a, b] of group.screenSegments || []) {
      const lineDistance = distanceToSegment(x, y, a, b);
      if (lineDistance <= lineRadius) distance = Math.min(distance, lineDistance);
    }
    if (Number.isFinite(distance) && (!closest || distance < closest.distance)) closest = { group, distance };
  });

  return closest?.group || null;
}

function findStarAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * canvas.clientWidth / rect.width, y = (clientY - rect.top) * canvas.clientHeight / rect.height;
  const radius = matchMedia('(pointer: coarse)').matches ? 20 : 12;
  let closest = null;

  skyData.forEach(group => group.points.forEach((star, i) => {
    const point = group.screenPoints?.[i];
    if (!point?.visible) return;
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance <= radius && (!closest || distance < closest.distance)) closest = { group, star, distance };
  }));
  if (!closest) for (const { star, point } of backgroundScreenPoints) {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance <= 5 && (!closest || distance < closest.distance)) closest = { group: null, star, distance };
  }
  return closest;
}

function openConstellationMenu(group) {
  state.selected = group.id;
  state.selectedStar = null;
  $('#starMenu').hidden = true;
  updateMapSelection(group, true);
}

function formatStarCoordinates(star) {
  const ra = Math.round(star.raHours * 3600) % 86400;
  const dec = Math.round(Math.abs(star.declinationDegrees) * 3600);
  const pad = value => String(value).padStart(2, '0');
  return `RA ${pad(Math.floor(ra/3600))}h ${pad(Math.floor(ra/60)%60)}m ${pad(ra%60)}s · DEC ${star.declinationDegrees >= 0 ? '+' : '−'}${pad(Math.floor(dec/3600))}° ${pad(Math.floor(dec/60)%60)}′ ${pad(dec%60)}″`;
}

function openStarMenu(group, star) {
  if (group) { state.selected = group.id; updateMapSelection(group, false); }
  state.selectedStar = { groupId: group?.id || null, starId: star.id };
  $('#starSelect').value = group ? star.id : '';
  $('#starName').textContent = star.name;
  $('#starCatalogName').textContent = [star.catalogName, star.designation, group?.name].filter(Boolean).join(' · ');
  $('#starDescription').textContent = star.description;
  $('#starMagnitude').textContent = star.apparentMagnitude.toFixed(2).replace('.', ',');
  $('#starDistance').textContent = star.distanceLightYears ? `${star.distanceLightYears.toLocaleString('et-EE')} valgusaastat` : 'Kataloogis puudub';
  $('#starSpectralType').textContent = star.spectralType || 'Kataloogis puudub';
  $('#starCoordinates').textContent = formatStarCoordinates(star);
  $('#starSource').href = star.sourceUrl;
  $('#starSource').textContent = `${star.source} · kataloogikirje ↗`;
  $('#backToConstellation').hidden = !group;
  $('#constellationMenu').hidden = true;
  $('#starMenu').hidden = false;
  if (group) updateDetails(group);
}

function updateDetails(group) {
  $('#detailsTitle').textContent = `${group.name} taevas`;
  $('#detailsDescription').textContent = group.description;
  $('#detailGlyph').textContent = group.glyph;
  $('#latinName').textContent = `${group.latinName} · ${group.abbreviation}`;
  $('#detailName').textContent = group.name;
  $('#mythText').textContent = group.myth;
  const brightest = [...group.stars].sort((a, b) => a.apparentMagnitude - b.apparentMagnitude)[0];
  $('#brightestStar').textContent = brightest.name;
  $('#brightestMagnitude').textContent = `${brightest.apparentMagnitude.toFixed(2).replace('.', ',')} tähesuurust`;
  $('#bestMonth').textContent = group.best;
  $('#visibilityNote').textContent = group.visibilityNote || 'Eesti laiuskraadidel';
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

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function estimateBirthDate(age, month, day, today = new Date()) {
  if (!Number.isInteger(age) || age < 0 || age > 120 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day)) return null;
  const birthdayPassed = month < today.getMonth() + 1 || month === today.getMonth() + 1 && day <= today.getDate();
  const year = today.getFullYear() - age - (birthdayPassed ? 0 : 1);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return {
    year, month, day,
    iso: toIsoDate(year, month, day),
    label: new Intl.DateTimeFormat('et-EE', { day: 'numeric', month: 'long', year: 'numeric' }).format(candidate)
  };
}

function updateEstimatedBirthDate() {
  const estimate = estimateBirthDate(Number($('#ageInput').value), Number($('#birthMonth').value), Number($('#birthDay').value));
  $('#estimatedDate').hidden = !estimate;
  if (!estimate) return null;
  $('#estimatedDateText').textContent = `${estimate.label} · kontrolli ja kinnita alloleva nupuga.`;
  $('#birthDate').value = estimate.iso;
  return estimate;
}

function setBirthMethod(method) {
  state.birthMethod = method;
  const useAge = method === 'age';
  $('#dateFields').hidden = useAge;
  $('#ageFields').hidden = !useAge;
  $('#dateMethodButton').classList.toggle('active', !useAge);
  $('#ageMethodButton').classList.toggle('active', useAge);
  $('#dateMethodButton').setAttribute('aria-pressed', String(!useAge));
  $('#ageMethodButton').setAttribute('aria-pressed', String(useAge));
  $('#birthSubmitLabel').textContent = useAge ? 'Kinnita kuupäev ja leia märk' : 'Leia minu tähtkuju';
  $('#dateError').textContent = '';
  document.querySelectorAll('#birthForm [aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
  if (useAge) updateEstimatedBirthDate();
}

function setupControls() {
  $('#constellationSelect').innerHTML = CONSTELLATIONS.map(c => `<option value="${c.id}">${c.glyph} ${c.name}</option>`).join('');
  $('#starCount').textContent = `${CONSTELLATIONS.reduce((sum, c) => sum + c.stars.length, 0)} kaardistatud tähte`;
  $('#starCount').textContent += ` · ${ambientStars.length} taustatähte`;
  $('#constellationSelect').addEventListener('change', event => focusConstellation(event.target.value, false, true));
  $('#starSelect').addEventListener('change', event => {
    const group = skyData.find(c => c.id === state.selected);
    const star = group.points.find(s => s.id === event.target.value);
    if (!star) return;
    state.targetYaw = Math.PI / 2 - star.raHours * Math.PI / 12;
    state.targetPitch = star.declinationDegrees * Math.PI / 180;
    openStarMenu(group, star);
  });

  $('#dateMethodButton').addEventListener('click', () => setBirthMethod('date'));
  $('#ageMethodButton').addEventListener('click', () => setBirthMethod('age'));
  ['#ageInput', '#birthMonth', '#birthDay'].forEach(selector => $(selector).addEventListener('input', () => {
    $('#dateError').textContent = '';
    $(selector).removeAttribute('aria-invalid');
    updateEstimatedBirthDate();
  }));

  const today = new Date();
  $('#birthDate').max = toIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  $('#birthForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#birthDate');
    let month, day;

    if (state.birthMethod === 'age') {
      const age = Number($('#ageInput').value);
      const selectedMonth = Number($('#birthMonth').value);
      const selectedDay = Number($('#birthDay').value);
      const estimate = updateEstimatedBirthDate();
      if (!Number.isInteger(age) || age < 0 || age > 120) {
        $('#dateError').textContent = 'Sisesta vanus vahemikus 0–120.';
        $('#ageInput').setAttribute('aria-invalid', 'true'); $('#ageInput').focus(); return;
      }
      if (!selectedMonth) {
        $('#dateError').textContent = 'Vali sünnikuu.';
        $('#birthMonth').setAttribute('aria-invalid', 'true'); $('#birthMonth').focus(); return;
      }
      if (!estimate) {
        $('#dateError').textContent = 'Sisesta selle kuu jaoks kehtiv sünnipäev.';
        $('#birthDay').setAttribute('aria-invalid', 'true'); $('#birthDay').focus(); return;
      }
      month = selectedMonth; day = selectedDay;
    } else {
      if (!input.value) {
        $('#dateError').textContent = 'Vali kõigepealt sünnikuupäev.';
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      if (input.value > input.max) {
        $('#dateError').textContent = 'Sünnikuupäev ei saa olla tulevikus.';
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      [, month, day] = input.value.split('-').map(Number);
    }

    const sign = getZodiac(month, day);
    if (!sign) { $('#dateError').textContent = 'Kuupäeva ei õnnestunud tõlgendada.'; return; }
    $('#dateError').textContent = ''; input.removeAttribute('aria-invalid'); showResult(sign);
  });
  $('#birthDate').addEventListener('input', () => { $('#dateError').textContent = ''; $('#birthDate').removeAttribute('aria-invalid'); });
  $('#showOnMap').addEventListener('click', event => focusConstellation(event.currentTarget.dataset.sign, true));
  $('#closeConstellationMenu').addEventListener('click', () => $('#constellationMenu').hidden = true);
  $('#closeStarMenu').addEventListener('click', () => { $('#starMenu').hidden = true; state.selectedStar = null; });
  $('#backToConstellation').addEventListener('click', () => openConstellationMenu(skyData.find(group => group.id === state.selected)));
  $('#openConstellationDetails').addEventListener('click', () => $('#details').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }));

  $('#zoomIn').addEventListener('click', () => state.zoom = Math.min(1.85, state.zoom + .14));
  $('#zoomOut').addEventListener('click', () => state.zoom = Math.max(.65, state.zoom - .14));
  $('#resetView').addEventListener('click', () => { state.yaw = .2; state.pitch = .12; state.zoom = 1; state.targetYaw = null; state.targetPitch = null; });

  canvas.addEventListener('pointerdown', event => { state.dragging = true; state.dragDistance = 0; state.lastX = event.clientX; state.lastY = event.clientY; state.targetYaw = null; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) {
      canvas.style.cursor = findStarAt(event.clientX, event.clientY) || findConstellationAt(event.clientX, event.clientY) ? 'pointer' : 'grab';
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
      const starTarget = findStarAt(event.clientX, event.clientY);
      if (starTarget) { openStarMenu(starTarget.group, starTarget.star); return; }
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
  html.dataset.theme = savedTheme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  try {
    const [response, backgroundResponse] = await Promise.all([
      fetch('./constellations.json', { cache: 'no-cache' }), fetch('./data/sky-catalog.json', { cache: 'no-cache' })
    ]);
    if (!response.ok || !backgroundResponse.ok) throw new Error('Kaardi JSON-faili ei õnnestunud laadida');
    CONSTELLATIONS = await response.json();
    const catalog = await backgroundResponse.json();
    const valid = Array.isArray(CONSTELLATIONS) && CONSTELLATIONS.length === 12 && CONSTELLATIONS.every(item =>
      item.id && item.name && item.latinName && item.abbreviation && item.description && item.location && Array.isArray(item.stars) && item.stars.every(star =>
        star.id && star.name && Number.isFinite(star.raHours) && Number.isFinite(star.declinationDegrees) && Number.isFinite(star.apparentMagnitude) && star.description) && Array.isArray(item.lines));
    if (!valid) throw new Error('Vigane tähtkujude andmestik');
    skyData = CONSTELLATIONS.map(c => {
      const points = c.stars.map(star => ({ ...starVector(star.raHours, star.declinationDegrees), ...star }));
      return { ...c, points, arcs: c.lines.map(([a, b]) => arcPoints(points[a], points[b])) };
    });
    if (!Array.isArray(catalog.backgroundStars) || !catalog.backgroundStars.length) throw new Error('Puuduvad taustatähed');
    ambientStars = catalog.backgroundStars.map(star => ({ ...starVector(star.raHours, star.declinationDegrees), ...star }));
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
