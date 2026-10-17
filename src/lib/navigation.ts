export const primaryNavigation = [
  { label: 'Home', path: '/', icon: 'home' },
  { label: 'Map', path: '/map', icon: 'map' },
  { label: 'Clubs', path: '/clubs', icon: 'users' },
  { label: 'Nightlife', path: '/nightlife', icon: 'moon' },
  { label: 'You', path: '/profile', icon: 'user' },
] as const;

export function navigationSection(pathname: string) {
  const direct = primaryNavigation.find(item => item.path === pathname);
  if (direct) return direct.label;
  if (pathname.startsWith('/night/') || pathname.startsWith('/venue/')) return 'Nightlife';
  if (pathname.startsWith('/club/')) return 'Clubs';
  if (['/login', '/account-setup', '/edit-profile', '/saved', '/privacy', '/community', '/owner'].includes(pathname)) return 'You';
  return 'Home';
}

export function screenTitle(pathname: string) {
  const titles: Record<string, string> = {
    '/': 'Home', '/map': 'Campus map', '/clubs': 'Clubs', '/nightlife': 'Nightlife',
    '/profile': 'Your space', '/more': 'Campus services', '/help': 'Academic help',
    '/people': 'People', '/search': 'Search', '/saved': 'Saved items', '/login': 'Sign in',
    '/privacy': 'Privacy', '/community': 'Community & support', '/owner': 'Owner dashboard',
    '/edit-profile': 'Edit profile', '/account-setup': 'Your profile',
  };
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/club/')) return 'Club details';
  if (pathname.startsWith('/event/')) return 'Campus event';
  if (pathname.startsWith('/student/') || pathname.startsWith('/person/')) return 'Student profile';
  if (pathname.startsWith('/venue/')) return 'Venue';
  if (pathname.startsWith('/night/')) return 'Night out';
  return 'Everything Laurier';
}
