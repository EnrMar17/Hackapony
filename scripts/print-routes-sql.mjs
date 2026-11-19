// Imprime el INSERT de `routes` para supabase/seed.sql a partir de src/data/routeCatalog.ts.
// Las paradas no viven en la base (reports.stop_id es texto libre). Uso:
//   node scripts/print-routes-sql.mjs > salida.sql
import { readFile } from 'node:fs/promises';

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const catalog = await readFile('src/data/routeCatalog.ts', 'utf8');
const rows = [...catalog.matchAll(/id: "([^"]+)", name: "([^"]+)", color: "(#[0-9a-f]{6})"/g)];
console.log('insert into routes (id, name, color) values');
console.log(rows.map(([, id, name, color]) => `  (${q(id)}, ${q(name)}, ${q(color)})`).join(',\n'));
console.log('on conflict (id) do nothing;');
