import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const entries = [];
const knownBuildings = new Set();
for (const file of ['indoors.json', 'new-indoors.json']) {
  const buildings = JSON.parse(await readFile(new URL(`indoor-campus-map/src/data/${file}`, root), 'utf8'));
  for (const building of buildings) {
    knownBuildings.add(building.id);
    entries.push({ title: building.name, building: building.id, buildingName: building.name, floor: building.defaultFloor ?? building.floors[0].level, room: '', kind: 'building' });
    for (const floor of building.floors) for (const room of floor.rooms) {
      if (room.routeable === false || /unverified|uncertain/i.test(`${room.id} ${room.name}`)) continue;
      entries.push({ title: room.name, building: building.id, buildingName: building.name, floor: floor.level, room: room.id, kind: room.kind });
    }
  }
}
const campus = JSON.parse(await readFile(new URL('indoor-campus-map/src/data/campus.json', root), 'utf8'));
for (const place of campus.places) {
  if (knownBuildings.has(place.id)) continue;
  entries.push({ title: place.name, building: place.id, buildingName: place.name, floor: 0, room: '', kind: 'place' });
}
await writeFile(new URL('src/data/map-search.json', root), JSON.stringify(entries, null, 2) + '\n');
console.log(`Campus search: ${entries.length} building and room destinations; uncertain labels excluded.`);
