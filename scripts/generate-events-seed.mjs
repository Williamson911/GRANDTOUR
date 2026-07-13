import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventsPath = join(__dirname, '..', 'src', 'assets', 'data', 'events.json');
const outPath = join(__dirname, '..', 'docs', 'supabase-events-seed.sql');

const events = JSON.parse(readFileSync(eventsPath, 'utf-8'));

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

const lines = events.map((e) => {
  const registerLink = e.registerLink ? sqlString(e.registerLink) : 'null';
  return (
    'insert into events (id, name, type, date, city, country, venue, lat, lng, register_link) values (' +
    `${sqlString(e.id)}, ${sqlString(e.name)}, ${sqlString(e.type)}, ${sqlString(e.date)}, ` +
    `${sqlString(e.location.city)}, ${sqlString(e.location.country)}, ${sqlString(e.location.venue)}, ` +
    `${e.location.lat}, ${e.location.lng}, ${registerLink});`
  );
});

writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`Wrote ${lines.length} insert statements to ${outPath}`);
