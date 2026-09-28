import directory from './clubs.json';

export const clubs = directory.clubs;
export type Club = typeof clubs[number];
export const directorySource = directory.source;
export const directoryDate = directory.retrieved;
export const themes = ['All clubs', 'Business', 'Tech & science', 'Arts & culture', 'Sports & outdoors', 'Community'];

// Fictional examples for UI review. Never presented as scraped or scheduled events.
export const events = [
  { id: 'creative-evening', title: 'A little less scrolling. A little more creating.', shortTitle: 'The creative social', category: 'Arts & culture', day: '25', month: 'SEP', weekday: 'Friday', time: '6:00 PM', place: 'Campus studio', cost: 'Free', art: 'flower', color: '#E9E3F0', description: 'An easygoing evening of sketching, making, and meeting someone new. Bring your curiosity; leave the pressure at the door.', host: 'Campus community', note: 'Materials, music, and a good excuse to get creative.' },
  { id: 'coffee-connections', title: 'Good coffee. Better conversations.', shortTitle: 'Coffee & connections', category: 'Community', day: '26', month: 'SEP', weekday: 'Saturday', time: '11:00 AM', place: 'Campus café', cost: 'Free entry', art: 'coffee', color: '#ECEEE1', description: 'Find a seat, grab your favourite drink, and meet a few people outside your usual circle. Come with a friend or come on your own.', host: 'Student community', note: 'A relaxed meetup for every program and year.' },
  { id: 'after-hours', title: 'Your Friday deserves a soundtrack.', shortTitle: 'After hours: vinyl night', category: 'Nightlife', day: '25', month: 'SEP', weekday: 'Friday', time: '9:00 PM', place: 'Uptown Waterloo', cost: 'Cover TBC', art: 'vinyl', color: '#382B47', description: 'A listening-party concept for a night of favourite records and new discoveries. This is a design example, not an advertised venue event.', host: 'Uptown nights', note: '19+ event concept. No tickets are being sold.' },
  { id: 'study-together', title: 'A fresh page. A little company.', shortTitle: 'The Sunday study session', category: 'Academic', day: '27', month: 'SEP', weekday: 'Sunday', time: '2:00 PM', place: 'Campus library', cost: 'Free', art: 'grid', color: '#F4E9D2', description: 'Settle in for a focused afternoon with a shared study table and room to take a break. A sample event to explore the app design.', host: 'Study circle', note: 'Bring a notebook and one thing you want to finish.' },
];
export type CampusEvent = typeof events[number];
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
export const people = [
  { id: 'alex', name: 'Alex R.', initials: 'AR', program: 'Computer Science', year: 'Third year', interests: ['Tech', 'Coffee', 'Side projects'], color: '#E9E1F0', looking: 'A new project crew', bio: 'Always up for turning a small idea into something useful. Usually found debugging with a coffee nearby.' },
  { id: 'sam', name: 'Sam T.', initials: 'ST', program: 'Business Administration', year: 'Second year', interests: ['Business', 'Design', 'Music'], color: '#F4E5D1', looking: 'People with big ideas', bio: 'Into creative businesses, thoughtful design, and conversations that turn into plans.' },
  { id: 'jordan', name: 'Jordan M.', initials: 'JM', program: 'Psychology', year: 'Fourth year', interests: ['Arts', 'Outdoors', 'Coffee'], color: '#DFE9E3', looking: 'A few new connections', bio: 'A trail walk, a good book, and a new perspective. Happy to meet people from any program.' },
];
export type Person = typeof people[number];
export const initials = (name: string) => name.replace(/\([^)]*\)/g, '').split(/\s+/).filter(w => !['Laurier', 'Wilfrid', 'WLU', 'of', 'and', 'the', 'for'].includes(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const themeColors: Record<string, string> = { Business: '#F5EBD8', 'Tech & science': '#EAE4F3', 'Arts & culture': '#F4E2E0', 'Sports & outdoors': '#E3EEE8', Community: '#E4EAF1' };
