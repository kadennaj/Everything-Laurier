import directory from './clubs.json';

export const clubs = directory.clubs;
export type Club = typeof clubs[number];
export const directorySource = directory.source;
export const directoryDate = directory.retrieved;
export const themes = ['All clubs', 'Business', 'Tech & science', 'Arts & culture', 'Sports & outdoors', 'Community'];

// Add only verified event listings with an actual date and source before publication.
export type CampusEvent = { id: string; title: string; shortTitle: string; category: string; day: string; month: string; weekday: string; time: string; place: string; cost: string; art: string; color: string; description: string; host: string; note: string };
export const events: CampusEvent[] = [];
export const buildings = [
  { id: 'LH', name: 'Lazaridis Hall', aliases: ['LH'], kind: 'Academic', address: '64 University Avenue West', x: 26, y: 22 },
  { id: 'BA', name: 'Bricker Academic', aliases: ['BAB', 'BA'], kind: 'Academic', address: 'Laurier Waterloo campus', x: 61, y: 35 },
  { id: 'FNCC', name: 'Fred Nichols Campus Centre', aliases: ['FNCC'], kind: 'Student life', address: '75 University Avenue West', x: 40, y: 56 },
  { id: 'P', name: 'Frank C. Peters Building', aliases: ['PETERS', 'P'], kind: 'Academic', address: 'Laurier Waterloo campus', x: 67, y: 64 },
  { id: 'SB', name: 'Schlegel Building', aliases: ['SB'], kind: 'Academic', address: 'Laurier Waterloo campus', x: 73, y: 83 },
  { id: 'AC', name: 'Athletic Complex', aliases: ['AC'], kind: 'Athletics', address: '75 University Avenue West', x: 23, y: 80 },
  { id: 'N', name: 'Science Building', aliases: ['N'], kind: 'Academic', address: 'Laurier Waterloo campus', x: 74, y: 16 },
];
export type Building = typeof buildings[number];
export function findBuilding(query: string) {
  const normalized = query.toUpperCase().replace(/[\s-]/g, '');
  return buildings.flatMap(b => b.aliases.map(alias => ({ alias, building: b })))
    .sort((a, b) => b.alias.length - a.alias.length)
    .find(({ alias }) => normalized === alias || (normalized.startsWith(alias) && /^\d/.test(normalized.slice(alias.length))))?.building;
}
export const resources = [
  { id: 'math', title: 'Math & statistics support', subtitle: 'Make the numbers make sense.', description: 'Find drop-in support, course help, and current schedules directly from Laurier.', icon: 'hash', color: '#EDE7F3', url: 'https://students.wlu.ca/academics/support-and-advising/student-success/assets/resources/math/drop-in-help.html', tag: 'Course support' },
  { id: 'writing', title: 'Writing support', subtitle: 'From first draft to final thought.', description: 'Explore writing appointments, resources, and support for building your academic voice.', icon: 'edit-3', color: '#F7EADD', url: 'https://students.wlu.ca/academics/support-and-advising/writing-support/index.html', tag: 'Essays & assignments' },
  { id: 'accessible', title: 'Accessible Learning', subtitle: 'Support that meets you where you are.', description: 'Find information about academic accommodations and available accessibility services.', icon: 'heart', color: '#E8EFE9', url: 'https://students.wlu.ca/academics/support-and-advising/accessible-learning/index.html', tag: 'Accessibility' },
];
export const initials = (name: string) => name.replace(/\([^)]*\)/g, '').split(/\s+/).filter(w => !['Laurier', 'Wilfrid', 'WLU', 'of', 'and', 'the', 'for'].includes(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const themeColors: Record<string, string> = { Business: '#F5EBD8', 'Tech & science': '#EAE4F3', 'Arts & culture': '#F4E2E0', 'Sports & outdoors': '#E3EEE8', Community: '#E4EAF1' };
