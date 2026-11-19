// Traza las rutas como circuito cerrado con OSRM y las guarda como GeoJSON.
// Uso: node scripts/fetch-osrm-routes.mjs [entrada.json] [salida.json] [ID ...]
// Entrada: { "GRIS-1": { "waypoints": [[lng, lat], ...] }, "NARANJA-1": { "path": [[lng, lat] | null, ...] } }
//   waypoints: pocos puntos; OSRM traza el camino entre ellos.
//   path: polilínea densa (p. ej. de OSM). Un `null` marca un hueco que se une con OSRM;
//         los saltos de más de GAP_M sin marcar también se unen.
// Con IDs al final solo se vuelven a trazar esas rutas; las demás se conservan de la salida actual.
// Salida:  FeatureCollection con un LineString cerrado por ruta (properties.id).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const NEAREST = 'https://router.project-osrm.org/nearest/v1/driving';
const SPUR_MAX_M = 150; // espigón: ida y vuelta corta sobre el mismo punto
const SPUR_NEAR_M = 12;
const GAP_M = 500; // salto sin marcar que se une con OSRM (los tramos rectos de OSM pueden medir 100-300 m)
const SIMPLIFY_M = 4; // tolerancia al simplificar la línea final
const CALL_DELAY_MS = 120; // cortesía con el servidor público de OSRM
const input = process.argv[2] ?? 'scripts/waypoints.json';
const output = process.argv[3] ?? 'src/data/routes.json';
const only = process.argv.slice(4);

const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  await sleep(CALL_DELAY_MS);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`OSRM no respondió: ${url.slice(0, 80)}`);
}

// Pega cada punto a la calle más cercana para evitar desvíos a calles laterales.
async function snap([lng, lat]) {
  const data = await getJson(`${NEAREST}/${lng},${lat}?number=1`);
  return data.code === 'Ok' ? data.waypoints[0].location : [lng, lat];
}

// Quita espigones: tramos cortos que regresan por donde ya pasaron.
function dropSpurs(line) {
  const out = [];
  for (const p of line) {
    let cut = -1;
    let acc = 0;
    for (let j = out.length - 1; j > 0 && acc < SPUR_MAX_M; j--) {
      acc += dist(out[j], out[j - 1]);
      if (dist(out[j - 1], p) < SPUR_NEAR_M) cut = j - 1;
    }
    if (cut >= 0) out.length = cut + 1;
    out.push(p);
  }
  return out;
}

// Douglas-Peucker iterativo (en metros) para que routes.json pese poco.
function simplify(line, tolM) {
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0;
    let idx = -1;
    const [ax, ay] = line[a];
    const [bx, by] = line[b];
    const sx = (bx - ax) * 104500;
    const sy = (by - ay) * 111000;
    const len = Math.hypot(sx, sy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const wx = (line[i][0] - ax) * 104500;
      const wy = (line[i][1] - ay) * 111000;
      const t = Math.max(0, Math.min(1, (wx * sx + wy * sy) / (len * len)));
      const d = Math.hypot(wx - t * sx, wy - t * sy);
      if (d > worst) {
        worst = d;
        idx = i;
      }
    }
    if (idx > 0 && worst > tolM) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

function close(points) {
  const real = points.filter(Boolean);
  const [a, b] = [real[0], real.at(-1)];
  return a[0] === b[0] && a[1] === b[1] ? points : [...points, null, a];
}

async function osrmLine(id, pts) {
  const coords = pts.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const data = await getJson(`${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`);
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(`${id}: OSRM no encontró ruta (${data.code})`);
  return data.routes[0].geometry.coordinates;
}

async function joinGap(id, from, to) {
  try {
    return await osrmLine(id, [await snap(from), await snap(to)]);
  } catch {
    console.warn(`  aviso ${id}: hueco de ${Math.round(dist(from, to))} m sin ruta, queda en línea recta`);
    return [];
  }
}

async function bridge(id, path) {
  const out = [];
  let gap = false;
  for (const p of path) {
    if (p === null) {
      gap = true;
      continue;
    }
    if (out.length && (gap || dist(out.at(-1), p) > GAP_M)) out.push(...(await joinGap(id, out.at(-1), p)));
    gap = false;
    out.push(p);
  }
  return out;
}

const bearingDeg = (a, b) => ((Math.atan2((b[0] - a[0]) * 104500, (b[1] - a[1]) * 111000) * 180) / Math.PI + 360) % 360;

// Regreso "espejo" para líneas con un solo sentido en OSM: waypoints cada `step` m sobre la ida al
// revés, con el rumbo de regreso, para que OSRM tome la misma calle o su paralela en sentido contrario.
// Validado contra las 11 líneas con ida y vuelta en OSM: coincide ~75% (mediana) con el regreso real y
// su longitud queda en ~1.0x; el camino más corto solo coincidía ~15%.
// Se arma tramo por tramo (puntos cada MIRROR_STEP_M) con el rumbo contrario: OSRM respeta los sentidos
// de OSM, así que en calles de un solo sentido toma la paralela o la otra calzada. Si un tramo da un
// rodeo (más de DETOUR_RATIO veces lo que mide la ida entre esos puntos), se descarta ese punto y se
// une con el siguiente: así no quedan ganchos ni espigones por un punto que cayó en la calle equivocada.
const MIRROR_STEP_M = 500;
const MIRROR_RADIUS_M = 90;
const MIRROR_TOL = 45;
const DETOUR_RATIO = 1.6;
const DETOUR_SLACK_M = 250;
const HINT_MAX_M = 400;

async function mirrorLeg([a, ba], [b, bb], forwardM) {
  const url =
    `${OSRM}/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson&steps=false&continue_straight=true` +
    `&bearings=${Math.round(ba)},${MIRROR_TOL};${Math.round(bb)},${MIRROR_TOL}&radiuses=${MIRROR_RADIUS_M};${MIRROR_RADIUS_M}`;
  try {
    const data = await getJson(url);
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const r = data.routes[0];
    return { coords: r.geometry.coordinates, ok: r.distance <= forwardM * DETOUR_RATIO + DETOUR_SLACK_M, distance: r.distance };
  } catch {
    return null;
  }
}

async function mirrorReturn(id, forward, hint) {
  const back = [...forward].reverse();
  const acc = [0];
  for (let i = 1; i < back.length; i++) acc.push(acc[i - 1] + dist(back[i - 1], back[i]));
  const wp = [];
  let last = -Infinity;
  for (let i = 0; i < back.length - 1; i++) {
    if (acc[i] - last >= MIRROR_STEP_M) {
      wp.push({ p: back[i], b: bearingDeg(back[i], back[Math.min(back.length - 1, i + 3)]), at: acc[i] });
      last = acc[i];
    }
  }
  wp.push({ p: back.at(-1), b: bearingDeg(back.at(-2), back.at(-1)), at: acc.at(-1) });
  // Con guía (calles del regreso según una relación antigua), cada punto intermedio se mueve a ella.
  if (hint.length) {
    for (let k = 1; k < wp.length - 1; k++) {
      let best = wp[k].p;
      let bestD = HINT_MAX_M;
      for (const h of hint) {
        const dd = dist(wp[k].p, h);
        if (dd < bestD) {
          bestD = dd;
          best = h;
        }
      }
      wp[k].p = best;
    }
  }
  const out = [];
  let skipped = 0;
  for (let i = 0; i < wp.length - 1; ) {
    let leg = null;
    let j = i + 1;
    // Probar el siguiente punto; si da rodeo, saltarlo (hasta 3) y unir con el que sigue.
    for (; j < Math.min(wp.length, i + 4); j++) {
      const r = await mirrorLeg([wp[i].p, wp[i].b], [wp[j].p, wp[j].b], wp[j].at - wp[i].at);
      if (r && (r.ok || !leg || r.distance < leg.distance)) leg = r;
      if (r?.ok) break;
      skipped++;
    }
    if (j >= Math.min(wp.length, i + 4)) j = Math.min(wp.length - 1, i + 3);
    if (leg) out.push(...leg.coords);
    else out.push(...(await joinGap(id, wp[i].p, wp[j].p)));
    i = j;
  }
  if (skipped) console.log(`  ${id}: regreso espejo, ${skipped} punto(s) descartado(s) por rodeo`);
  return out;
}

async function trace(id, entry) {
  let raw;
  if (entry.path && entry.returnReverse) {
    raw = await bridge(id, close(entry.path));
  } else if (entry.path && entry.returnMirror) {
    const forward = await bridge(id, entry.path);
    raw = [...forward, ...(await mirrorReturn(id, forward, entry.returnHint ?? []))];
  } else if (entry.path) {
    raw = await bridge(id, close(entry.path));
  } else {
    if (!Array.isArray(entry.waypoints) || entry.waypoints.length < 3) {
      throw new Error(`${id}: se necesitan al menos 3 waypoints`);
    }
    const snapped = [];
    for (const w of entry.waypoints) snapped.push(await snap(w));
    raw = await osrmLine(id, close(snapped));
  }
  let cleaned = dropSpurs(raw);
  cleaned[cleaned.length - 1] = cleaned[0]; // garantiza circuito cerrado exacto
  if (entry.returnReverse) {
    // Ida y vuelta por las mismas calles: la vuelta es la ida al revés. Va después de quitar
    // espigones, porque un regreso exacto sobre la ida se vería como un espigón gigante.
    cleaned = [...cleaned, ...[...cleaned].reverse().slice(1)];
  }
  const line = simplify(cleaned, SIMPLIFY_M).map(([x, y]) => [r5(x), r5(y)]);
  line[line.length - 1] = line[0];
  return {
    type: 'Feature',
    properties: { id, lengthM: Math.round(line.slice(1).reduce((s, p, i) => s + dist(line[i], p), 0)) },
    geometry: { type: 'LineString', coordinates: line },
  };
}

const config = JSON.parse(await readFile(input, 'utf8'));
let previous = [];
try {
  previous = JSON.parse(await readFile(output, 'utf8')).features;
} catch {
  previous = [];
}
const ids = only.length ? only : Object.keys(config);
const traced = new Map(previous.map((f) => [f.properties.id, f]));
for (const id of ids) {
  if (!config[id]) throw new Error(`Falta ${id} en ${input}`);
  const feature = await trace(id, config[id]);
  traced.set(id, feature);
  console.log(`${id}: ${feature.geometry.coordinates.length} puntos, ${(feature.properties.lengthM / 1000).toFixed(1)} km`);
}
const order = Object.keys(config);
const features = [...traced.values()].sort((a, b) => order.indexOf(a.properties.id) - order.indexOf(b.properties.id));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Guardado en ${output}`);
