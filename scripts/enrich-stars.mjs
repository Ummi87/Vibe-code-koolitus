// Rebuild the bundled astronomical data from fixed, attributed catalog releases.
// Every figure vertex is a Hipparcos ID. Never guess identity from proximity.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('data/sky-sources.json', root), 'utf8'));
const groups = JSON.parse(await readFile(new URL('constellations.json', root), 'utf8'));
const fetchText = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.text();
};
function csvRow(line) {
  const cells = []; let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cells.push(value); value = ''; }
    else value += ch;
  }
  cells.push(value); return cells;
}
const [csv, cultureText, namesHtml] = await Promise.all([
  fetchText(sources.hyg.url), fetchText(sources.figures.url), fetchText(sources.names.url)
]);
console.log('Source catalogs downloaded.');
const culture = JSON.parse(cultureText);
const lines = csv.trim().split(/\r?\n/);
const headers = csvRow(lines.shift());
const rows = lines.map(line => Object.fromEntries(csvRow(line).map((v, i) => [headers[i], v])));
const byHip = new Map(rows.filter(s => s.hip).map(s => [Number(s.hip), s]));
const nameRows = [...namesHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m =>
  [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()));
const nameByHip = new Map();
for (const row of nameRows) {
  const hip = Number(row[3]);
  if (Number.isInteger(hip) && hip > 0 && row[0]) nameByHip.set(hip, row[0]);
}
if (nameByHip.size < 300) throw new Error('IAU name catalog format changed; refusing partial data.');
const number = value => value === '' || value === undefined ? null : Number(value);
const greek = { Alp:'α', Bet:'β', Gam:'γ', Del:'δ', Eps:'ε', Zet:'ζ', Eta:'η', The:'θ', Iot:'ι', Kap:'κ', Lam:'λ', Mu:'μ', Nu:'ν', Xi:'ξ', Omi:'ο', Pi:'π', Rho:'ρ', Sig:'σ', Tau:'τ', Ups:'υ', Phi:'φ', Chi:'χ', Psi:'ψ', Ome:'ω' };
function designation(row) {
  if (row.bayer) return `${row.bayer.replace(/[A-Za-z]+/, code => greek[code] || code).replaceAll('-', ' ')} ${row.con}`;
  if (row.flam) return `${row.flam} ${row.con}`;
  return null;
}
function makeStar(hip, group) {
  const row = byHip.get(hip);
  if (!row) throw new Error(`HIP ${hip} missing from HYG`);
  if (group && row.con !== group.abbreviation) throw new Error(`HIP ${hip} belongs to ${row.con}, not ${group.abbreviation}`);
  const raHours = number(row.ra), declinationDegrees = number(row.dec), apparentMagnitude = number(row.mag);
  if (![raHours, declinationDegrees, apparentMagnitude].every(Number.isFinite)) throw new Error(`Invalid HIP ${hip}`);
  const dist = number(row.dist);
  // 100000 pc is HYG's sentinel for missing/unphysical parallax.
  const distanceLightYears = dist > 0 && dist < 100000 ? Math.round(dist * 3.26156) : null;
  const name = nameByHip.get(hip) || designation(row) || `HIP ${hip}`;
  const spectralType = row.spect || null;
  const description = `${name} paikneb ${group ? 'tähtkujus ' + group.name : 'taevas'}. Näiv tähesuurus on ${apparentMagnitude.toFixed(2).replace('.', ',')}${spectralType ? ` ja spektriklass ${spectralType}` : ''}.${distanceLightYears ? ` Kataloogi kaugushinnang on ligikaudu ${distanceLightYears.toLocaleString('et-EE')} valgusaastat.` : ' Usaldusväärne kaugushinnang selles kataloogis puudub.'}`;
  return { id: `hip-${hip}`, hip, name, catalogName: `HIP ${hip}`, designation: designation(row),
    aliases: sources.aliases[String(hip)] || [], raHours, declinationDegrees, apparentMagnitude,
    distanceLightYears, spectralType, description, source: 'HYG v4.1 (Hipparcos)',
    sourceUrl: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=HIP%20${hip}` };
}
const figureStars = new Set();
for (const group of groups) {
  const figure = culture.constellations.find(c => c.id === `CON modern ${group.abbreviation}`);
  if (!figure) throw new Error(`No reference figure for ${group.id}`);
  const hips = [...new Set([...figure.lines.flat(), ...(sources.extraHipIds[group.abbreviation] || [])])];
  if (!hips.every(Number.isInteger)) throw new Error(`Unsupported identifier in ${group.id}`);
  group.stars = hips.map(hip => makeStar(hip, group));
  hips.forEach(hip => figureStars.add(hip));
  const indices = new Map(hips.map((hip, index) => [hip, index]));
  const edges = new Map();
  for (const chain of figure.lines) for (let i = 1; i < chain.length; i++) {
    const pair = [indices.get(chain[i - 1]), indices.get(chain[i])];
    if (pair[0] === pair[1]) throw new Error(`Zero-length edge in ${group.id}`);
    edges.set([...pair].sort((a, b) => a - b).join('-'), pair);
  }
  group.lines = [...edges.values()];
  group.figureSource = { name: 'Stellarium Modern', revision: sources.figures.revision, license: 'CC BY-SA 4.0' };
  group.visibilityNote = Math.min(...group.stars.map(s => s.declinationDegrees)) < -32
    ? 'Eestist on nähtav ainult osa tähtkujust; lõunapoolsed tähed jäävad horisondi alla.'
    : 'Eesti laiuskraadidel; täpne nähtavus sõltub vaatlusajast ja horisondist.';
}
const backgroundStars = rows.filter(s => s.hip && Number(s.mag) <= sources.backgroundMagnitudeLimit && !figureStars.has(Number(s.hip)))
  .map(s => makeStar(Number(s.hip), null));
const catalog = { epoch: 'J2000', generatedAt: new Date().toISOString(), representation: 'Angular celestial sphere; distances are not radial positions',
  backgroundMagnitudeLimit: sources.backgroundMagnitudeLimit,
  sources, checksums: { hyg: createHash('sha256').update(csv).digest('hex'), figures: createHash('sha256').update(cultureText).digest('hex'), names: createHash('sha256').update(namesHtml).digest('hex') },
  backgroundStars };
for (const group of groups) {
  if (new Set(group.stars.map(s => s.id)).size !== group.stars.length) throw new Error(`Duplicate stars in ${group.id}`);
  for (const [a, b] of group.lines) if (!group.stars[a] || !group.stars[b]) throw new Error(`Invalid line in ${group.id}`);
}
await writeFile(new URL('constellations.json', root), JSON.stringify(groups, null, 2) + '\n');
await writeFile(new URL('data/sky-catalog.json', root), JSON.stringify(catalog) + '\n');
console.log(`${groups.length} constellations, ${figureStars.size} foreground stars, ${backgroundStars.length} real background stars.`);
