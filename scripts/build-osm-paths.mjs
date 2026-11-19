// Baja de OpenStreetMap (Overpass) las relaciones de scripts/osm-relations.json y agrega su
// polilínea a scripts/waypoints.json como "path". Los huecos entre tramos van como `null`
// (fetch-osrm-routes.mjs los une con OSRM). No toca GRIS-1 ni NARANJA-1 (ya están hechas).
// Uso: node scripts/build-osm-paths.mjs
import { readFile, writeFile } from 'node:fs/promises';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const WAYPOINTS = 'scripts/waypoints.json';
const GAP_M = 8; // distancia entre tramos que se considera hueco
const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);
const r5 = (n) => Math.round(n * 1e5) / 1e5;

async function fetchRelations(ids) {
  const body = `[out:json][timeout:120];relation(id:${ids.join(',')});out geom;`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': 'route-research-script/1.0', Accept: 'application/json' },
      body: new URLSearchParams({ data: body }),
    });
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return (await res.json()).elements;
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error('Overpass no respondió');
}

/** Encadena los tramos de una relación en orden de viaje. Devuelve puntos y `null` en los huecos. */
function chain(relation) {
  const ways = relation.members.filter((m) => m.type === 'way' && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  if (ways.length === 0) return [];
  const near = (p, w) => Math.min(dist(p, w[0]), dist(p, w.at(-1)));
  let out = ways.length > 1 && near(ways[0][0], ways[1]) < near(ways[0].at(-1), ways[1]) ? [...ways[0]].reverse() : [...ways[0]];
  for (const w of ways.slice(1)) {
    const end = out.at(-1);
    const fwd = dist(end, w[0]);
    const bwd = dist(end, w.at(-1));
    if (Math.min(fwd, bwd) > GAP_M) out.push(null);
    out.push(...(fwd <= bwd ? w : [...w].reverse()));
  }
  return out;
}

const ends = (points) => {
  const real = points.filter(Boolean);
  return { start: real[0], end: real.at(-1) };
};

const config = JSON.parse(await readFile('scripts/osm-relations.json', 'utf8'));
const waypoints = JSON.parse(await readFile(WAYPOINTS, 'utf8'));
const all = await fetchRelations([...new Set(Object.values(config).flat())]);
const byId = new Map(all.map((r) => [r.id, r]));

for (const [routeId, relIds] of Object.entries(config)) {
  const parts = relIds.map((id) => {
    const rel = byId.get(id);
    if (!rel) throw new Error(`${routeId}: falta la relación ${id}`);
    return chain(rel);
  });
  let ordered = parts;
  if (parts.length === 2) {
    const [a, b] = parts.map(ends);
    const ab = dist(a.end, b.start) + dist(b.end, a.start);
    const ba = dist(b.end, a.start) + dist(a.end, b.start);
    ordered = ab <= ba ? parts : [parts[1], parts[0]];
  }
  const path = [];
  for (const part of ordered) {
    const first = part.find(Boolean);
    const last = path.filter(Boolean).at(-1);
    if (last && dist(last, first) > GAP_M) path.push(null);
    path.push(...part);
  }
  const real = path.filter(Boolean);
  if (dist(real.at(-1), real[0]) > GAP_M) path.push(null, real[0]);
  waypoints[routeId] = { path: path.map((p) => (p ? [r5(p[0]), r5(p[1])] : null)) };
  console.log(`${routeId}: ${real.length} puntos, ${path.filter((p) => p === null).length} huecos`);
}
await writeFile(WAYPOINTS, JSON.stringify(waypoints));
console.log(`Guardado en ${WAYPOINTS}`);
