export type MapSearchEntry = { title: string; building: string; buildingName: string; floor: number; room: string; kind: string };
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findMapPlaces(query: string, entries: MapSearchEntry[]) {
  const key = normalize(query);
  if (!key) return [];
  const words = query.trim().toLowerCase().split(/\s+/).map(normalize).filter(Boolean);
  return entries.map(entry => {
    const name = normalize(entry.title), code = normalize(entry.room), building = normalize(entry.building);
    const haystack = normalize(`${entry.title} ${entry.room} ${entry.building} ${entry.buildingName}`);
    if (!words.every(word => haystack.includes(word)) && !haystack.includes(key)) return null;
    const isBuilding = entry.kind === 'building' || entry.kind === 'place';
    const score = name === key || code === key || (isBuilding && building === key) ? 100 : name.startsWith(key) ? 70 : name.includes(key) ? 50 : 10;
    return { entry, score: score + (isBuilding ? 5 : 0) };
  }).filter((item): item is { entry: MapSearchEntry; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map(item => item.entry);
}

export function mapDestination(entry: MapSearchEntry) {
  if (entry.kind === 'place') return { pathname: '/map' as const, params: { place: entry.building } };
  const params: Record<string, string> = { building: entry.building, floor: String(entry.floor) };
  if (entry.room) params.room = entry.room;
  return { pathname: '/map' as const, params };
}
