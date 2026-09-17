import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const groups = JSON.parse(await readFile(new URL('constellations.json', root), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('data/sky-catalog.json', root), 'utf8'));
const stars = groups.flatMap(c => c.stars);
const background = catalog.backgroundStars;
const separation = (a, b) => {
  const rad = Math.PI / 180;
  const dra = (a.raHours - b.raHours) * 15 * rad;
  const ddec = (a.declinationDegrees - b.declinationDegrees) * rad;
  const hav = Math.sin(ddec / 2) ** 2 + Math.cos(a.declinationDegrees * rad) * Math.cos(b.declinationDegrees * rad) * Math.sin(dra / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(hav))) / rad;
};
assert.equal(groups.length, 12);
const identities = new Set();
for (const star of [...stars, ...background]) {
  assert(!identities.has(star.hip), `Duplicate HIP ${star.hip}`);
  identities.add(star.hip);
  assert.equal(star.id, `hip-${star.hip}`);
  assert(star.raHours >= 0 && star.raHours < 24 && Math.abs(star.declinationDegrees) <= 90);
  assert(Number.isFinite(star.apparentMagnitude));
  assert(star.distanceLightYears === null || (star.distanceLightYears > 0 && star.distanceLightYears < 326156));
}
for (const group of groups) {
  const edges = new Set();
  for (const [a, b] of group.lines) {
    assert(group.stars[a] && group.stars[b] && a !== b);
    const key = [a, b].sort((x, y) => x - y).join('-');
    assert(!edges.has(key), `${group.id}: duplicate edge`); edges.add(key);
    assert(separation(group.stars[a], group.stars[b]) > 0.001, `${group.id}: overlapping vertices`);
  }
}
for (const [name, hip] of Object.entries({ Alpherg: 7097, Torcular: 8198, Fumalsamakah: 113889, Bharani: 13209, Shatabhisha: 112961 })) {
  assert.equal(stars.find(s => s.hip === hip)?.name, name, `Incorrect identity for ${name}`);
}
assert(!stars.some(s => s.name === 'Kullat Nunu' || s.name === 'Hydor'));
assert(stars.find(s => s.hip === 7097).aliases.includes('Kullat Nunu'));

// Exercise the actual rendering/picking functions without a browser dependency.
const source = await readFile(new URL('sketch.js', root), 'utf8');
const elements = new Map();
const el = () => ({ dataset: {}, hidden: true, value: '', textContent: '', style: {}, replaceChildren() {},
  getContext() { return {}; }, clientWidth: 800, clientHeight: 600,
  getBoundingClientRect() { return { left: 20, top: 40, width: 400, height: 300 }; } });
const context = { console, Math, Intl, Number, Option: function(text, value) { this.text = text; this.value = value; },
  matchMedia: () => ({ matches: false }), document: { documentElement: el(), querySelector: key => {
    if (!elements.has(key)) elements.set(key, el()); return elements.get(key);
  } }, groups, background };
vm.createContext(context);
vm.runInContext(source.replace(/\ninit\(\);\s*$/, ''), context);
vm.runInContext(`
  CONSTELLATIONS = groups;
  skyData = groups.map(c => { const points = c.stars.map(s => ({...starVector(s.raHours,s.declinationDegrees),...s}));
    return {...c,points,arcs:c.lines.map(([a,b])=>arcPoints(points[a],points[b]))}; });
`, context);
for (const group of groups) {
  context.groupId = group.id;
  const result = vm.runInContext(`(() => {
    focusConstellation(groupId, false, false); state.yaw=state.targetYaw; state.pitch=state.targetPitch;
    skyData.forEach(g=>g.screenPoints=g.points.map(p=>project(p,800,600)));
    const group=skyData.find(g=>g.id===groupId);
    const star=group.points[0], p=project(star,800,600);
    const hit=findStarAt(20+p.x/2,40+p.y/2);
    openStarMenu(group,star);
    return {visible:group.screenPoints.every(p=>p.visible),hit:hit?.star.id,expected:star.id,name:$('#starName').textContent};
  })()`, context);
  assert(result.visible, `Focus hides part of ${group.id}`);
  assert.equal(result.hit, result.expected, `Wrong click at CSS-scaled ${group.id}`);
  assert(result.name);
}
const orientation = vm.runInContext(`(() => {
  state.yaw=Math.PI/2; state.pitch=0;
  return {north:project(starVector(0,10),800,600).y<300,east:project(starVector(1,0),800,600).x<400,back:project(starVector(12,0),800,600).visible};
})()`, context);
assert(orientation.north && orientation.east && !orientation.back);
console.log(`Local checks passed: ${groups.length} figures, ${stars.length} foreground stars, ${background.length} background stars; identity, edges, orientation, focus and click tests.`);

if (process.argv.includes('--online')) {
  const fetchJson = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    return response.json();
  };
  const reference = await fetchJson(catalog.sources.figures.url);
  const edgeSet = lines => [...new Set(lines.map(([a,b])=>[a,b].sort((x,y)=>x-y).join('-')))].sort();
  for (const group of groups) {
    const original = reference.constellations.find(c => c.id === `CON modern ${group.abbreviation}`);
    const pairs = original.lines.flatMap(chain=>chain.slice(1).map((b,i)=>[chain[i],b]));
    assert.deepEqual(edgeSet(group.lines.map(([a,b])=>[group.stars[a].hip,group.stars[b].hip])),edgeSet(pairs),`${group.id}: figure differs from Stellarium`);
  }
  const ids = stars.map(s => `'HIP ${s.hip}'`).join(',');
  const query = `select ident.id,basic.main_id,basic.ra,basic.dec from ident join basic on ident.oidref=basic.oid where ident.id in (${ids})`;
  const payload = await fetchJson('https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query='+encodeURIComponent(query));
  let max = 0;
  for (const star of stars) {
    const matches=payload.data.filter(row=>row[0]===`HIP ${star.hip}`);
    assert.equal(matches.length,1,`Ambiguous/missing HIP ${star.hip}`);
    const row=matches[0];
    const arcseconds=separation(star,{raHours:row[2]/15,declinationDegrees:row[3]})*3600;
    max=Math.max(max,arcseconds);
    if (arcseconds>1) console.log(`Catalog difference: ${star.name} ${star.catalogName}: ${arcseconds.toFixed(3)} arcsec (${row[1]})`);
    // Different catalog versions/component centroids can differ by arcseconds.
    assert(arcseconds<2,`Investigate position: HIP ${star.hip}, ${arcseconds} arcsec`);
  }
  console.log(`Online checks passed: all ${groups.length} figures exactly match Stellarium; all ${stars.length} HIP positions match SIMBAD within ${max.toFixed(3)} arcseconds.`);
}
