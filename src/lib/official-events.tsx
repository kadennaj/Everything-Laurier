import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { CampusEvent } from '../data/content';
import { CachedOfficialEvent, formatOfficialEvent } from './event-format';
import { supabase } from './supabase';

type FeedState = { events: CampusEvent[]; syncedAt: string | null; loading: boolean; error: string | null };
const Context = createContext<FeedState & { now: number; refresh: () => Promise<void> }>({ events: [], syncedAt: null, loading: true, error: null, now: 0, refresh: async () => {} });
export function OfficialEventsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FeedState>({ events: [], syncedAt: null, loading: true, error: null });
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef<Promise<void> | null>(null), mounted = useRef(false), lastRead = useRef(0);
  const refresh = useCallback((): Promise<void> => {
    if (pending.current) return pending.current;
    lastRead.current = Date.now();
    const request = (async () => {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        if (!supabase) throw Error('Calendar unavailable');
        const { data, error } = await supabase.rpc('official_event_feed').abortSignal(controller.signal);
        if (error || !data || !Array.isArray(data.events) || !data.syncedAt) throw Error('Calendar unavailable');
        const events = (data.events as CachedOfficialEvent[]).map(formatOfficialEvent);
        if (mounted.current) setState({ events, syncedAt: data.syncedAt, loading: false, error: null });
      } catch {
        if (mounted.current) setState(previous => ({ ...previous, loading: false, error: 'Couldn’t update the calendar. Please try again.' }));
      } finally { clearTimeout(timeout); }
    })();
    pending.current = request;
    void request.finally(() => { pending.current = null; });
    return request;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    // These reads only fetch the shared database cache, never Laurier's upstream feed.
    const updateIfNeeded = () => { if (Date.now() - lastRead.current > 15 * 60000) void refresh(); };
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') { setNow(Date.now()); updateIfNeeded(); } });
    const timer = setInterval(() => { if (AppState.currentState === 'active') { setNow(Date.now()); updateIfNeeded(); } }, 60000);
    return () => { mounted.current = false; subscription.remove(); clearInterval(timer); };
  }, [refresh]);
  return <Context.Provider value={{ ...state, now, refresh }}>{children}</Context.Provider>;
}
export const useOfficialEvents = () => useContext(Context);
