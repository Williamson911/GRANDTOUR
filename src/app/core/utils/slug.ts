export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateEventId(
  name: string,
  city: string,
  date: Date,
  existingIds: ReadonlySet<string>,
): string {
  const yearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const base = `${slugify(name)}-${slugify(city)}-${yearMonth}`;
  if (!existingIds.has(base)) return base;

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}
