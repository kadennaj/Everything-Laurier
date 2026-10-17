import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type State = { externalMediaEnabled: boolean; setExternalMediaEnabled: (value: boolean) => void; nightlifeAgeConfirmed: boolean; confirmNightlifeAge: () => void; resetNightlifeAge: () => void; hiddenSources: string[]; hideSource: (source: string) => void; unhideSource: (source: string) => void; unhideSources: () => void; hiddenPosts: string[]; hidePost: (id: string) => void; unhidePosts: () => void; saved: string[]; ready: boolean; toggleSave: (id: string) => void; toast: string; notify: (message: string) => void; clearSaved: () => void; purgeSaved: () => Promise<void>; };
const Context = createContext<State | null>(null);
const KEY = 'everything-laurier:saved:v1';
const AGE_KEY = 'everything-laurier:nightlife-age:v1';
const SOURCES_KEY = 'everything-laurier:hidden-sources:v1';
const MEDIA_KEY = 'everything-laurier:external-media:v1';
const POSTS_KEY = 'everything-laurier:hidden-posts:v1';
export function LocalState({ children }: { children: React.ReactNode }) {
  const [externalMediaEnabled, setExternalMediaEnabled] = useState(false);
  const [nightlifeAgeConfirmed, setNightlifeAgeConfirmed] = useState(false);
  const [hiddenSources, setHiddenSources] = useState<string[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const generation = useRef(0);
  const notify = useCallback((message: string) => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 2800); }, []);
  useEffect(() => {
    let active = true;
    const restoredGeneration = generation.current;
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SOURCES_KEY), AsyncStorage.getItem(AGE_KEY), AsyncStorage.getItem(POSTS_KEY), AsyncStorage.getItem(MEDIA_KEY)]).then(values => {
      if (!active || restoredGeneration !== generation.current) return;
      const readList = (value: string | null): string[] => {
        const parsed: unknown = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) && parsed.every(id => typeof id === 'string') ? parsed : [];
      };
      setSaved(readList(values[0])); setHiddenSources(readList(values[1])); setNightlifeAgeConfirmed(values[2] === '19+');
      setHiddenPosts(readList(values[3])); setExternalMediaEnabled(values[4] === 'enabled');
    }).catch(() => { if (active) notify('Preferences could not be restored on this device.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timer.current); };
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.then(async () => { await AsyncStorage.setItem(KEY, JSON.stringify(saved)); await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(hiddenSources)); await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(hiddenPosts)); await AsyncStorage.setItem(MEDIA_KEY, externalMediaEnabled ? 'enabled' : 'disabled'); await AsyncStorage.setItem(AGE_KEY, nightlifeAgeConfirmed ? '19+' : 'unconfirmed'); }).catch(() => notify('Your changes could not be saved to this device.'));
  }, [saved, hiddenSources, hiddenPosts, nightlifeAgeConfirmed, externalMediaEnabled, ready, notify]);
  const toggleSave = (id: string) => { if (!ready) return; const exists = saved.includes(id); setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); notify(exists ? 'Removed from your saved list' : 'Saved for another day'); };
  const purgeSaved = async () => {
    generation.current++;
    setSaved([]); setHiddenSources([]); setHiddenPosts([]); setNightlifeAgeConfirmed(false); setExternalMediaEnabled(false);
    // Queue removal after outstanding writes so old bookmarks cannot reappear.
    const removal = writes.current.then(async () => { await AsyncStorage.removeItem(KEY); await AsyncStorage.removeItem(SOURCES_KEY); await AsyncStorage.removeItem(POSTS_KEY); await AsyncStorage.removeItem(AGE_KEY); await AsyncStorage.removeItem(MEDIA_KEY); });
    writes.current = removal.catch(() => {});
    await removal;
  };
  return <Context.Provider value={{ externalMediaEnabled, setExternalMediaEnabled: value => { if (ready) setExternalMediaEnabled(value); }, nightlifeAgeConfirmed, confirmNightlifeAge: () => { if (ready) setNightlifeAgeConfirmed(true); }, resetNightlifeAge: () => setNightlifeAgeConfirmed(false), hiddenSources, hideSource: source => { if (!ready) return; setHiddenSources(current => current.includes(source) ? current : [...current, source]); notify('Source hidden. Manage this in Community.'); }, unhideSource: source => { if (!ready) return; setHiddenSources(current => current.filter(item => item !== source)); notify('Source is visible again'); }, unhideSources: () => { if (!ready) return; setHiddenSources([]); notify('Feed sources are visible again'); }, hiddenPosts, hidePost: id => { if (!ready) return; setHiddenPosts(current => current.includes(id) ? current : [...current, id]); notify('Post hidden. Manage this in Community.'); }, unhidePosts: () => { if (!ready) return; setHiddenPosts([]); notify('Hidden posts are visible again'); }, saved, ready, toggleSave, toast, notify, purgeSaved, clearSaved: () => { setSaved([]); notify('Your saved list is cleared'); } }}>{children}</Context.Provider>;
}
export function useLocal() { const state = useContext(Context); if (!state) throw new Error('LocalState is missing'); return state; }
