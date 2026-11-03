export const pushSupported = false;
export async function pushToken(_requestPermission: boolean): Promise<{ token: string; platform: 'ios' | 'android' } | null> { return null; }
export function listenForPush(_open: (data: unknown) => void, _refresh: () => void): () => void { return () => {}; }
