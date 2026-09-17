import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../constellations.json', import.meta.url);
const constellations = JSON.parse(await readFile(fileUrl, 'utf8'));
const tasks = constellations.flatMap(constellation => constellation.stars.map((star, index) => ({ constellation, star, index })));

const decodeXml = value => value
  ?.replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .trim() || null;

const tag = (xml, name) => decodeXml(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1]?.replace(/<[^>]+>/g, ''));
const numberTag = (xml, name) => {
  const value = Number(tag(xml, name));
  return Number.isFinite(value) ? value : null;
};

async function fetchByCoordinates(raHours, decDegrees) {
  const raDegrees = raHours * 15;
  const query = `select top 1 main_id,ra,dec,plx_value,sp_type,DISTANCE(POINT('ICRS',ra,dec),POINT('ICRS',${raDegrees},${decDegrees})) as separation from basic where sp_type is not null and CONTAINS(POINT('ICRS',ra,dec),CIRCLE('ICRS',${raDegrees},${decDegrees},0.35))=1 order by separation asc`;
  const url = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) return null;
  const payload = await response.json();
  const row = payload.data?.[0];
  if (!row) return null;
  const [catalogName, raDegreesResult, declinationDegrees, parallaxMas, spectralType] = row;
  return { catalogName, raDegrees: raDegreesResult, declinationDegrees, parallaxMas, spectralType };
}

function stellarDescription(name, constellationName, spectralType, magnitude, distance) {
  const genitives = { Jäär: 'Jäära', Sõnn: 'Sõnni', Kaksikud: 'Kaksikute', Vähk: 'Vähi', Lõvi: 'Lõvi', Neitsi: 'Neitsi', Kaalud: 'Kaalude', Skorpion: 'Skorpioni', Ambur: 'Amburi', Kaljukits: 'Kaljukitse', Veevalaja: 'Veevalaja', Kalad: 'Kalade' };
  const classLetter = spectralType?.match(/[OBAFGKM]/i)?.[0]?.toUpperCase();
  const colors = { O: 'sinine', B: 'sinakasvalge', A: 'valge', F: 'kollakasvalge', G: 'kollane', K: 'oranžikas', M: 'punakas' };
  let stage = 'täht';
  if (/I[a|b]?\b/.test(spectralType || '')) stage = 'ülisuur täht';
  else if (/III/.test(spectralType || '')) stage = 'hiidtäht';
  else if (/IV/.test(spectralType || '')) stage = 'allhiid';
  else if (/V/.test(spectralType || '')) stage = 'peajada täht';
  const kind = colors[classLetter] ? `${colors[classLetter]} ${stage}` : stage;
  const distanceText = distance ? ` ja see asub ligikaudu ${distance.toLocaleString('et-EE')} valgusaasta kaugusel` : '';
  return `${name} on ${genitives[constellationName] || constellationName} tähtkuju joonisesse kuuluv ${kind}. Tähe näiv tähesuurus on ${magnitude.toFixed(2).replace('.', ',')}${distanceText}.`;
}

async function fetchStar(task) {
  if (!Array.isArray(task.star)) {
    return {
      ...task.star,
      description: stellarDescription(task.star.name, task.constellation.name, task.star.spectralType, task.star.apparentMagnitude, task.star.distanceLightYears)
    };
  }
  const [name, fallbackRa, fallbackDec, magnitude] = task.star;
  const url = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(name)}`;
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) break;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  if (!response?.ok) throw new Error(`${name}: HTTP ${response?.status || 'unknown'}`);
  const xml = await response.text();
  const resolver = xml.match(/<Resolver name="[^"]*Simbad[^"]*">([\s\S]*?)<\/Resolver>/i)?.[1];
  const resolvedRa = resolver ? numberTag(resolver, 'jradeg') : null;
  const resolvedDec = resolver ? numberTag(resolver, 'jdedeg') : null;
  const deltaRa = resolvedRa === null ? Infinity : Math.abs(resolvedRa - fallbackRa * 15) * Math.cos(fallbackDec * Math.PI / 180);
  const separation = Math.hypot(deltaRa, (resolvedDec ?? Infinity) - fallbackDec);
  const fallback = !resolver || separation > 1 ? await fetchByCoordinates(fallbackRa, fallbackDec) : null;
  if (!resolver && !fallback) throw new Error(`${name}: SIMBAD kirjet ei leitud`);

  const parallaxBlock = resolver?.match(/<plx>([\s\S]*?)<\/plx>/)?.[1] || '';
  const parallaxMas = fallback?.parallaxMas ?? numberTag(parallaxBlock, 'v');
  const distanceLightYears = parallaxMas && parallaxMas > 0 ? Math.round(3261.56 / parallaxMas) : null;
  const spectralType = fallback?.spectralType ?? tag(resolver || '', 'spType');
  const raDegrees = fallback?.raDegrees ?? resolvedRa;
  const decDegrees = fallback?.declinationDegrees ?? resolvedDec;
  const raHours = raDegrees === null ? fallbackRa : raDegrees / 15;

  return {
    id: `${task.constellation.id}-${task.index + 1}`,
    name,
    catalogName: fallback?.catalogName ?? tag(resolver || '', 'oname'),
    raHours: Number(raHours.toFixed(6)),
    declinationDegrees: Number((decDegrees ?? fallbackDec).toFixed(6)),
    apparentMagnitude: magnitude,
    distanceLightYears,
    spectralType,
    description: stellarDescription(name, task.constellation.name, spectralType, magnitude, distanceLightYears),
    source: 'SIMBAD'
  };
}

const results = new Array(tasks.length);
let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const current = cursor++;
    results[current] = await fetchStar(tasks[current]);
    process.stdout.write(`\rSIMBAD ${current + 1}/${tasks.length}`);
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
let resultIndex = 0;
for (const constellation of constellations) {
  constellation.stars = constellation.stars.map(() => results[resultIndex++]);
}

await writeFile(fileUrl, `${JSON.stringify(constellations, null, 2)}\n`, 'utf8');
console.log(`\nUuendatud ${results.length} tähe andmed.`);
