// Revisa y corrige los trazados contra la secuencia de calles con parada de Moovit
// (scripts/moovit-streets.json, copiada de las páginas públicas de cada línea).
//   - Para cada calle de Moovit busca en OSM las vías con ese nombre y mide si la ruta pasa a ≤ SERVE_M.
//   - Las calles seguidas que faltan a más de MIN_DETOUR_M forman un "tramo faltante": se inserta un
//     desvío con OSRM entre la calle anterior y la siguiente que sí están, pasando por las que faltan.
//   - Un desvío solo se acepta si sube la cobertura y no deja fuera ninguna calle que ya estaba.
// Uso: node scripts/moovit-detours.mjs <cache_calles_osm.json> [--fix] [--base X=Y] [--rebuild ID] [ID ...]
//   Sin --fix solo informa. Con --fix reescribe src/data/routes.json.
//
// Secuencia completa para regenerar las rutas (GRIS-1 y NARANJA-1 vienen de waypoints.json):
//   node scripts/build-osm-paths.mjs
//   node scripts/fetch-osrm-routes.mjs scripts/waypoints.json src/data/routes.json <IDs de osm-relations.json>
//   node scripts/moovit-detours.mjs <cache> --fix
//   node scripts/moovit-detours.mjs <cache> --fix --base NARANJA-2-SANTA-FE=NARANJA-2 NARANJA-2-SANTA-FE
//     (en OSM "Naranja 2 Santa Fe" cruza de oeste a este; en Moovit comparte el recorrido de Naranja 2)
//   node scripts/build-stops.mjs  (borrando antes las paradas de las rutas que cambiaron)
//   node scripts/check-stops.mjs
import { readFile, writeFile } from 'node:fs/promises';

const ROUTES = 'src/data/routes.json';
const SERVE_M = 35;
const NEAR_M = 1500;
const MIN_DETOUR_M = 120;
const KX = 104500;
const KY = 111000;
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const NEAREST = 'https://router.project-osrm.org/nearest/v1/driving';
const STOP = new Set(['calle', 'avenida', 'av', 'calzada', 'clz', 'boulevard', 'blvd', 'privada', 'de', 'la', 'del', 'los', 'las', 'el', 'y', '1ra', 'retorno', 'andador', 'lic', 'licenciado', 'profesor', 'prof', 'doctor', 'dr', 'general', 'gral', 'sin', 'referencia', 'sector']);
// Duración del recorrido completo según Moovit (min, suma de sentidos). Con la velocidad media de las
// combis (~23 km/h, medida en las rutas ya verificadas) da la longitud esperada: ningún desvío puede
// dejar la ruta más larga que MAX_LEN_RATIO veces eso.
const MOOVIT_MINUTES = {
  'GRIS-1': 136, 'GRIS-2': 164, 'GRIS-3-FURAMO': 140, 'GRIS-3-OXXO': 131, 'GRIS-4': 139, 'NARANJA-1': 53,
  'NARANJA-1-SOLEDAD': 60, 'NARANJA-2': 70, 'NARANJA-2-SANTA-FE': 71, 'NARANJA-3-CENTRO': 84,
  'NARANJA-3-ERANDENI': 102, 'NARANJA-3-METROPOLIS': 91, 'ROJA-1': 72, 'ROJA-1-PUNHUATO': 71, 'ROJA-2-OKEN': 62,
  'ROJA-2-VILLAS-DEL-SOL': 53, 'ROJA-3': 76, 'ROJA-3A': 85, 'ROJA-3B': 72, 'ROJA-4-TINIJARO': 74, 'ROJA-4A': 76,
  'ROJA-4M': 71,
};
const KM_PER_MIN = 23 / 60;
// Rutas comparadas a mano con un mapa de referencia: no se les insertan desvíos.
const NO_DETOURS = new Set(['GRIS-4']);
const MAX_LEN_RATIO = 1.15;
const MAX_DETOUR_ADD_M = 6000;
const lengthOf = (l) => l.slice(1).reduce((s, p, k) => s + dist(l[k], p), 0);

const args = process.argv.slice(2);
const cachePath = args[0];
const fix = args.includes('--fix');
const rebuildIds = args.filter((a, i) => args[i - 1] === '--rebuild');
// --base X=Y: antes de corregir X, parte de la geometría de Y (cuando OSM trae otra cosa para X y
// según Moovit X comparte casi todo el recorrido con Y).
const bases = Object.fromEntries(args.filter((a, i) => args[i - 1] === '--base').map((a) => a.split('=')));
const flagArg = (a, i, arr) => ['--fix', '--rebuild', '--base'].includes(a) || ['--rebuild', '--base'].includes(arr[i - 1]);
const only = args.slice(1).filter((a, i) => !flagArg(a, i + 1, args));
if (rebuildIds.length && !only.length) only.push(...rebuildIds);

const dist = (a, b) => Math.hypot((a[0] - b[0]) * KX, (a[1] - b[1]) * KY);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
function segDist([px, py], [ax, ay], [bx, by]) {
  const sx = (bx - ax) * KX;
  const sy = (by - ay) * KY;
  const wx = (px - ax) * KX;
  const wy = (py - ay) * KY;
  const l2 = sx * sx + sy * sy;
  const t = l2 ? Math.max(0, Math.min(1, (wx * sx + wy * sy) / l2)) : 0;
  return Math.hypot(wx - t * sx, wy - t * sy);
}
const toLine = (p, line) => {
  let best = Infinity;
  for (let j = 1; j < line.length; j++) best = Math.min(best, segDist(p, line[j - 1], line[j]));
  return best;
};

// ───── Calles con nombre de OSM (caché local para no repetir la consulta) ─────
async function loadStreets(bbox) {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8')).elements;
  } catch {
    const q = `[out:json][timeout:250];way["highway"]["name"](${bbox.join(',')});out tags geom;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'User-Agent': 'route-research-script/1.0', Accept: 'application/json' },
      body: new URLSearchParams({ data: q }),
    });
    const json = await res.json();
    await writeFile(cachePath, JSON.stringify(json));
    return json.elements;
  }
}

/** Vértices densificados (~20 m) de las vías cuyo nombre coincide con `name`. */
function streetPoints(ways, name) {
  const t = norm(name);
  if (!t.length) return [];
  const pts = [];
  for (const w of ways) {
    // Nombres de una sola palabra ("Sol", "Roble") deben coincidir exactos; los largos pueden traer
    // prefijos de más en OSM ("Circuito Periférico Paseo de la República").
    const same = w.tok.length === t.length && t.every((x) => w.tok.includes(x));
    const ok = same || (t.length >= 2 && t.every((x) => w.tok.includes(x)) && w.tok.length <= t.length + 2);
    if (!ok) continue;
    for (let i = 0; i < w.g.length; i++) {
      if (i === 0) pts.push(w.g[0]);
      else {
        const a = w.g[i - 1];
        const b = w.g[i];
        const n = Math.max(1, Math.ceil(dist(a, b) / 20));
        for (let k = 1; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
      }
    }
  }
  return pts;
}

/** Estado de cada calle de la secuencia: ok (la ruta pasa), falta (a más de SERVE_M) o desconocida (no está en OSM cerca). */
function evaluate(line, seq, pointsOf) {
  return seq.map((s) => {
    const near = pointsOf(s).filter((p) => toLine(p, line) < NEAR_M);
    if (!near.length) return { s, status: 'desconocida', d: null, pts: [] };
    let d = Infinity;
    for (const p of near) {
      d = Math.min(d, toLine(p, line));
      if (d <= SERVE_M) break;
    }
    return { s, status: d <= SERVE_M ? 'ok' : 'falta', d, pts: near };
  });
}
const score = (ev) => {
  const uniq = new Map();
  for (const e of ev) if (e.status !== 'desconocida') uniq.set(e.s, (uniq.get(e.s) ?? false) || e.status === 'ok');
  return { ok: [...uniq.values()].filter(Boolean).length, known: uniq.size, okSet: new Set([...uniq].filter(([, v]) => v).map(([k]) => k)) };
};

async function getJson(url) {
  await sleep(150);
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await sleep(1500 * (i + 1));
  }
  return null;
}
async function snap([lng, lat]) {
  const d = await getJson(`${NEAREST}/${lng},${lat}?number=1`);
  return d?.code === 'Ok' ? d.waypoints[0].location : [lng, lat];
}
async function osrm(pts) {
  const snapped = [];
  for (const p of pts) snapped.push(await snap(p));
  const d = await getJson(`${OSRM}/${snapped.map((p) => p.join(',')).join(';')}?overview=full&geometries=geojson`);
  return d?.code === 'Ok' ? d.routes[0].geometry.coordinates : null;
}

const nearestOf = (pts, ref) => pts.reduce((b, p) => (dist(p, ref) < dist(b, ref) ? p : b), pts[0]);
const nearestIndex = (line, p) => line.reduce((b, q, i) => (dist(q, p) < dist(line[b], p) ? i : b), 0);

/** Arma un desvío para un tramo faltante y lo inserta en la línea. Devuelve la línea nueva o null. */
async function detour(line, ev, from, to) {
  const before = ev[(from - 1 + ev.length) % ev.length];
  const after = ev[(to + 1) % ev.length];
  if (before.status !== 'ok' || after.status !== 'ok') return null;
  const run = ev.slice(from, to + 1).filter((e) => e.status === 'falta');
  // Cadena voraz: de la calle anterior, por cada calle que falta, a la calle siguiente.
  let cur = nearestOf(before.pts, nearestOf(run[0].pts, before.pts[0]));
  const start = cur;
  const wps = [];
  for (const e of run) {
    cur = nearestOf(e.pts, cur);
    wps.push(cur);
  }
  const end = nearestOf(after.pts, cur);
  let a = nearestIndex(line, start);
  let b = nearestIndex(line, end);
  let mid = wps;
  if (b < a) {
    [a, b] = [b, a];
    mid = [...wps].reverse();
  }
  const total = line.length;
  if (b - a > total * 0.4) b = a; // el tramo cruza el inicio del circuito: se inserta como lazo
  const piece = await osrm([line[a], ...mid, line[b]]);
  if (!piece) return null;
  return [...line.slice(0, a), ...piece, ...line.slice(b + 1)];
}

/**
 * Reconstrucción completa (--rebuild ID): encadena en orden un punto de cada calle de Moovit
 * (el más cercano al anterior, solo en vías cerca de la ruta actual) y traza con OSRM.
 */
async function rebuild(line, seq) {
  const pts = [];
  let cur = line[0];
  for (const s of seq) {
    const cand = pointsOf(s).filter((p) => toLine(p, line) < NEAR_M);
    if (!cand.length) continue;
    cur = nearestOf(cand, cur);
    if (!pts.length || dist(pts.at(-1), cur) > 60) pts.push(cur);
  }
  pts.push(pts[0]);
  return osrm(pts);
}

function finish(line) {
  const out = [];
  for (const p of line) {
    const q = [r5(p[0]), r5(p[1])];
    const last = out.at(-1);
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  out[out.length - 1] = out[0];
  return out;
}

const routesDoc = JSON.parse(await readFile(ROUTES, 'utf8'));
const moovit = JSON.parse(await readFile('scripts/moovit-streets.json', 'utf8'));
const all = routesDoc.features.flatMap((f) => f.geometry.coordinates);
const bbox = [
  Math.min(...all.map((p) => p[1])) - 0.02,
  Math.min(...all.map((p) => p[0])) - 0.02,
  Math.max(...all.map((p) => p[1])) + 0.02,
  Math.max(...all.map((p) => p[0])) + 0.02,
].map((v) => v.toFixed(3));
const ways = (await loadStreets(bbox)).map((w) => ({ tok: norm(w.tags.name), g: w.geometry.map((p) => [p.lon, p.lat]) }));
const cache = new Map();
const pointsOf = (s) => {
  if (!cache.has(s)) cache.set(s, streetPoints(ways, s));
  return cache.get(s);
};

for (const f of routesDoc.features) {
  const id = f.properties.id;
  if (only.length && !only.includes(id)) continue;
  if (fix && NO_DETOURS.has(id)) {
    console.log(`${id}: verificada con mapa de referencia, sin desvíos`);
    continue;
  }
  if (!moovit[id]) {
    console.log(`${id}: sin datos de Moovit`);
    continue;
  }
  let line = f.geometry.coordinates;
  if (bases[id]) {
    const src = routesDoc.features.find((x) => x.properties.id === bases[id]);
    if (src) {
      line = src.geometry.coordinates.map((p) => [...p]);
      console.log(`  ${id}: parte de la geometría de ${bases[id]}`);
    }
  }
  const seqs = moovit[id];
  const evalAll = (l) => seqs.flatMap((seq) => evaluate(l, seq, pointsOf));
  let base = score(evalAll(line));
  const before = base;
  if (rebuildIds.includes(id)) {
    const candidate = await rebuild(line, seqs[0]);
    const next = candidate ? score(evalAll(candidate)) : null;
    const cap = (MOOVIT_MINUTES[id] ?? Infinity) * KM_PER_MIN * 1000 * MAX_LEN_RATIO;
    if (next && next.ok > base.ok && lengthOf(candidate) <= cap) {
      console.log(`  ${id}: reconstruida con la secuencia de Moovit (${base.ok} -> ${next.ok} calles)`);
      line = candidate;
      base = next;
    } else {
      const km = candidate ? (lengthOf(candidate) / 1000).toFixed(1) : '-';
      console.log(`  ${id}: la reconstrucción no sirve (${next ? next.ok : 'sin ruta'} calles, ${km} km), se conserva`);
    }
  }
  if (fix) {
    for (const raw of seqs) {
      // La lista es un circuito: se rota para empezar en una calle por la que la ruta sí pasa,
      // así un tramo faltante en la terminal (inicio y fin de la lista) queda completo.
      const first = evaluate(line, raw, pointsOf).findIndex((e) => e.status === 'ok');
      const seq = first > 0 ? [...raw.slice(first), ...raw.slice(0, first)] : raw;
      let ev = evaluate(line, seq, pointsOf);
      for (let i = 0; i < ev.length; i++) {
        if (ev[i].status !== 'falta' || ev[i].d < MIN_DETOUR_M) continue;
        let j = i;
        while (j + 1 < ev.length && (ev[j + 1].status === 'falta' || ev[j + 1].status === 'desconocida')) j++;
        while (ev[j].status !== 'falta') j--;
        const candidate = await detour(line, ev, i, j);
        const expectedM = (MOOVIT_MINUTES[id] ?? Infinity) * KM_PER_MIN * 1000;
        const fits =
          candidate &&
          lengthOf(candidate) - lengthOf(line) <= MAX_DETOUR_ADD_M &&
          lengthOf(candidate) <= Math.max(lengthOf(line), expectedM * MAX_LEN_RATIO);
        if (fits) {
          const next = score(evalAll(candidate));
          const lost = [...base.okSet].filter((s) => !next.okSet.has(s));
          if (next.ok > base.ok && lost.length === 0) {
            line = candidate;
            base = next;
            ev = evaluate(line, seq, pointsOf);
            console.log(`  ${id}: desvío por ${ev.slice(i, j + 1).map((e) => e.s).join(', ')}`);
          }
        }
        i = j;
      }
    }
    f.geometry.coordinates = finish(line);
    const c = f.geometry.coordinates;
    f.properties.lengthM = Math.round(c.slice(1).reduce((s, p, k) => s + dist(c[k], p), 0));
  }
  const missing = [...new Set(evalAll(f.geometry.coordinates).filter((e) => e.status === 'falta').map((e) => `${e.s} (${Math.round(e.d)} m)`))];
  console.log(
    `${id.padEnd(22)} ${(f.properties.lengthM / 1000).toFixed(1).padStart(5)} km  Moovit ${before.ok}/${before.known}` +
      (fix ? ` -> ${base.ok}/${base.known}` : '') +
      (missing.length ? `\n      faltan: ${missing.join('; ')}` : ''),
  );
}
if (fix) {
  await writeFile(ROUTES, JSON.stringify(routesDoc));
  console.log(`Guardado en ${ROUTES}`);
}
