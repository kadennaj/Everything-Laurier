import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type State = { saved: string[]; ready: boolean; toggleSave: (id: string) => void; toast: string; notify: (message: string) => void; clearSaved: () => void; };
const Context = createContext<State | null>(null);
const KEY = 'everything-laurier:saved:v1';
export function LocalState({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const notify = useCallback((message: string) => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 2800); }, []);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(value => {
      if (!active || !value) return;
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) setSaved(parsed);
    }).catch(() => { if (active) notify('Saved items could not be restored on this device.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timer.current); };
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(saved))).catch(() => notify('Your changes could not be saved to this device.'));
  }, [saved, ready, notify]);
  const toggleSave = (id: string) => { if (!ready) return; const exists = saved.includes(id); setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); notify(exists ? 'Removed from your saved list' : 'Saved for another day'); };
  return <Context.Provider value={{ saved, ready, toggleSave, toast, notify, clearSaved: () => { setSaved([]); notify('Your saved list is cleared'); } }}>{children}</Context.Provider>;
}
export function useLocal() { const state = useContext(Context); if (!state) throw new Error('LocalState is missing'); return state; }
