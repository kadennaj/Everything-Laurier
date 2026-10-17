export function buildDataExport(server: Record<string, unknown>, device: { saved: string[]; hiddenSources: string[]; hiddenPosts: string[]; nightlifeAgeConfirmed: boolean; externalMediaEnabled: boolean }) {
 // Deliberate allowlist: never serialize an Auth session or browser storage dump.
 const allowed = ['exported_at', 'account', 'consent', 'profile', 'applications', 'line_reports', 'content_reports', 'blocks', 'limits'];
 return JSON.stringify({ service: 'Everything Laurier', ...Object.fromEntries(allowed.filter(key => key in server).map(key => [key, server[key]])), device_preferences: device }, null, 2);
}
