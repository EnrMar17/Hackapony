// Agrega paradas (12 a 15 por ruta) a src/data/stops.json para las rutas de routes.json que aún
// no tienen. Las reparte a lo largo del trazado y las nombra con geocodificación inversa de
// OpenStreetMap (Nominatim, ~1 consulta por segundo). Luz, rampa y techo son DATOS DE DEMO.
// Uso: node scripts/build-stops.mjs [archivo_cache.json]   (la caché permite reanudar)
import { readFile, writeFile } from 'node:fs/promises';

const STOPS = 'src/data/stops.json';
const ROUTES = 'src/data/routes.json';
const cachePath = process.argv[2] ?? null;
const MIN_GAP_M = 300;
const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cache = new Map();
if (cachePath) {
  try {
    for (const [k, v] of Object.entries(JSON.parse(await readFile(cachePath, 'utf8')))) cache.set(k, v);
  } catch {
    /* sin caché todavía */
  }
}

async function nameAt([lng, lat]) {
  const key = `${r5(lng)},${r5(lat)}`;
  if (cache.has(key)) return cache.get(key);
  await sleep(1200);
  let name = 'Parada';
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lon=${lng}&lat=${lat}`, {
      headers: { 'User-Agent': 'route-research-script/1.0' },
    });
    const a = (await res.json()).address ?? {};
    name = [a.road ?? a.pedestrian ?? '', a.neighbourhood ?? a.suburb ?? a.quarter ?? ''].filter(Boolean).join(' · ') || 'Parada';
  } catch {
    /* se queda "Parada" */
  }
  cache.set(key, name);
  if (cachePath) await writeFile(cachePath, JSON.stringify(Object.fromEntries(cache)));
  return name;
}

function pointAt(line, acc, t) {
  let i = acc.findIndex((v) => v >= t);
  if (i <= 0) return line[0];
  const f = (t - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
  return [line[i - 1][0] + f * (line[i][0] - line[i - 1][0]), line[i - 1][1] + f * (line[i][1] - line[i - 1][1])];
}

const routes = JSON.parse(await readFile(ROUTES, 'utf8')).features;
const stops = JSON.parse(await readFile(STOPS, 'utf8'));
const have = new Set(stops.map((s) => s.route_id));

for (const f of routes) {
  const id = f.properties.id;
  if (have.has(id)) continue;
  const line = f.geometry.coordinates;
  const acc = [0];
  for (let i = 1; i < line.length; i++) acc.push(acc[i - 1] + dist(line[i - 1], line[i]));
  const total = acc.at(-1);
  const n = Math.min(15, Math.max(12, Math.round(total / 1000 / 2.5)));
  const chosen = [];
  const names = new Set();
  for (let k = 0; k < n; k++) {
    const base = (total * (k + 0.5)) / n;
    for (let tries = 0; tries < 4; tries++) {
      const p = pointAt(line, acc, Math.min(total, base + tries * 200));
      if (chosen.some((c) => dist(c.p, p) < MIN_GAP_M)) continue;
      const name = await nameAt(p);
      if (names.has(name) && tries < 3) continue;
      names.add(name);
      chosen.push({ p, name, at: base + tries * 200 });
      break;
    }
  }
  chosen.sort((a, b) => a.at - b.at);
  chosen.forEach((c, k) => {
    stops.push({
      id: `${id.toLowerCase()}-${String(k + 1).padStart(2, '0')}`,
      route_id: id,
      name: c.name,
      lng: r5(c.p[0]),
      lat: r5(c.p[1]),
      has_light: !(k % 5 === 2 || k % 7 === 4),
      has_ramp: !(k % 4 === 1 || k % 7 === 4),
      has_roof: k % 3 !== 1,
    });
  });
  await writeFile(STOPS, JSON.stringify(stops, null, 2) + '\n');
  console.log(`${id}: ${chosen.length} paradas`);
}
console.log(`Total de paradas: ${stops.length}`);
