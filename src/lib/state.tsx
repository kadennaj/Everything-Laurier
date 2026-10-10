import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type State = { nightlifeAgeConfirmed: boolean; confirmNightlifeAge: () => void; resetNightlifeAge: () => void; hiddenSources: string[]; hideSource: (source: string) => void; unhideSources: () => void; saved: string[]; ready: boolean; toggleSave: (id: string) => void; toast: string; notify: (message: string) => void; clearSaved: () => void; purgeSaved: () => Promise<void>; };
const Context = createContext<State | null>(null);
const KEY = 'everything-laurier:saved:v1';
const AGE_KEY = 'everything-laurier:nightlife-age:v1';
const SOURCES_KEY = 'everything-laurier:hidden-sources:v1';
export function LocalState({ children }: { children: React.ReactNode }) {
  const [nightlifeAgeConfirmed, setNightlifeAgeConfirmed] = useState(false);
  const [hiddenSources, setHiddenSources] = useState<string[]>([]);
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
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SOURCES_KEY), AsyncStorage.getItem(AGE_KEY)]).then(values => {
      if (!active || restoredGeneration !== generation.current) return;
      const readList = (value: string | null): string[] => {
        const parsed: unknown = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) && parsed.every(id => typeof id === 'string') ? parsed : [];
      };
      setSaved(readList(values[0])); setHiddenSources(readList(values[1])); setNightlifeAgeConfirmed(values[2] === '19+');
    }).catch(() => { if (active) notify('Preferences could not be restored on this device.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timer.current); };
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.then(async () => { await AsyncStorage.setItem(KEY, JSON.stringify(saved)); await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(hiddenSources)); await AsyncStorage.setItem(AGE_KEY, nightlifeAgeConfirmed ? '19+' : 'unconfirmed'); }).catch(() => notify('Your changes could not be saved to this device.'));
  }, [saved, hiddenSources, nightlifeAgeConfirmed, ready, notify]);
  const toggleSave = (id: string) => { if (!ready) return; const exists = saved.includes(id); setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); notify(exists ? 'Removed from your saved list' : 'Saved for another day'); };
  const purgeSaved = async () => {
    generation.current++;
    setSaved([]); setHiddenSources([]); setNightlifeAgeConfirmed(false);
    // Queue removal after outstanding writes so old bookmarks cannot reappear.
    const removal = writes.current.then(async () => { await AsyncStorage.removeItem(KEY); await AsyncStorage.removeItem(SOURCES_KEY); await AsyncStorage.removeItem(AGE_KEY); });
    writes.current = removal.catch(() => {});
    await removal;
  };
  return <Context.Provider value={{ nightlifeAgeConfirmed, confirmNightlifeAge: () => { if (ready) setNightlifeAgeConfirmed(true); }, resetNightlifeAge: () => setNightlifeAgeConfirmed(false), hiddenSources, hideSource: source => { if (!ready) return; setHiddenSources(current => current.includes(source) ? current : [...current, source]); notify('Source hidden. Manage this in Community.'); }, unhideSources: () => { setHiddenSources([]); notify('Feed sources are visible again'); }, saved, ready, toggleSave, toast, notify, purgeSaved, clearSaved: () => { setSaved([]); notify('Your saved list is cleared'); } }}>{children}</Context.Provider>;
}
export function useLocal() { const state = useContext(Context); if (!state) throw new Error('LocalState is missing'); return state; }
