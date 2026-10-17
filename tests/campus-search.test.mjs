import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findMapPlaces, mapDestination } from '../src/lib/map-search.ts';
import { navigationSection, screenTitle } from '../src/lib/navigation.ts';
import { colors } from '../src/lib/theme.ts';
const entries = JSON.parse(await readFile(new URL('../src/data/map-search.json', import.meta.url)));

test('a spaced room number and a building-qualified room open the correct floor', () => {
  const spaced = findMapPlaces('LH 1001', entries)[0];
  assert.equal(spaced.title, 'LH 1001');
  assert.equal(spaced.building, 'LH');
  assert.equal(spaced.floor, 1);
  assert.equal(mapDestination(spaced).params.room, spaced.room);
  const library = findMapPlaces('Library 2-207', entries)[0];
  assert.equal(library.building, 'LIB');
  assert.equal(library.floor, 2);
  assert.match(library.title, /Learning Lab/);
});

test('building searches rank the building before its rooms; outdoor destinations use place links', () => {
  assert.equal(findMapPlaces('Library', entries)[0].kind, 'building');
  const outside = findMapPlaces('FNCC', entries)[0];
  assert.equal(outside.kind, 'place');
  assert.deepEqual(mapDestination(outside), { pathname: '/map', params: { place: 'FNCC' } });
  assert.deepEqual(findMapPlaces('  ', entries), []);
  assert.deepEqual(findMapPlaces('nonexistent-campus-room-99999', entries), []);
});

test('every indexed indoor room exists on that floor and uncertain rooms stay out of search', async () => {
  const buildings = (await Promise.all(['indoors.json', 'new-indoors.json'].map(file => readFile(new URL(`../indoor-campus-map/src/data/${file}`, import.meta.url), 'utf8').then(JSON.parse)))).flat();
  const keys = new Set();
  for (const entry of entries) {
    const key = `${entry.building}:${entry.floor}:${entry.room}`;
    assert.ok(!keys.has(key), `duplicate destination: ${key}`); keys.add(key);
    assert.doesNotMatch(entry.title, /unverified|uncertain/i);
    if (!entry.room) continue;
    const room = buildings.find(b => b.id === entry.building)?.floors.find(f => f.level === entry.floor)?.rooms.find(r => r.id === entry.room);
    assert.ok(room, key); assert.notEqual(room.routeable, false);
  }
});

test('detail screens keep their parent tab selected and have a useful screen title', () => {
  assert.equal(navigationSection('/club/laurier-computing-society-lcs'), 'Clubs');
  assert.equal(navigationSection('/venue/waterloo'), 'Nightlife');
  assert.equal(navigationSection('/owner'), 'You');
  assert.equal(navigationSection('/help'), 'Home');
  assert.equal(screenTitle('/student/example'), 'Student profile');
  assert.equal(screenTitle('/help'), 'Academic help');
});

function luminance(hex) {
  const [r,g,b] = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}
function contrast(a,b) { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05); }
test('shared small text and primary actions maintain at least 4.5:1 contrast', () => {
  for (const [foreground,background] of [[colors.ink,colors.surface],[colors.muted,colors.background],[colors.surface,colors.purple],[colors.purple,colors.lavender]]) assert.ok(contrast(foreground,background)>=4.5,`${foreground} on ${background}`);
});
