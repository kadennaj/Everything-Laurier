import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { formatOfficialEvent } from '../src/lib/event-format.ts';

const code = ts.transpileModule(readFileSync(new URL('../src/lib/official-events.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const row = { id: 'a'.repeat(32), title: 'Meetup', category: 'Social', starts_at: '2026-10-11T14:00:00Z', ends_at: '2026-10-11T15:00:00Z', all_day: false, place: '', cost: '', description: '', host: '', source_url: 'https://events.wlu.ca/2026/oct/meetup.html' };
const snapshot = { events: [row], syncedAt: '2026-10-10T00:00:00Z' };
function mount(fetchSnapshot) {
  const hooks = []; const effects = []; let cursor = 0, dirty = true, value, calls = 0, timer, listener;
  let clock = Date.parse('2026-10-10T01:00:00Z');
  const same = (a, b) => a?.length === b?.length && a?.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: {} }), createElement: (_type, props) => props,
    useState(initial) { const i = cursor++; hooks[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; dirty = true; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = cursor++; if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { deps, callback }; return hooks[i].callback; },
    useEffect(callback, deps) { const i = cursor++; if (!hooks[i] || !same(hooks[i].deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: callback() }; }); },
  };
  const module = { exports: {} }; const appState = { currentState: 'active', addEventListener: (_event, callback) => { listener = callback; return { remove: () => { listener = null; } }; } };
  runInNewContext(code, { exports: module.exports, module, AbortController,
    Date: class extends Date { static now() { return clock; } },
    setTimeout: () => 1, clearTimeout() {}, setInterval: callback => { timer = callback; return 1; }, clearInterval: () => { timer = null; },
    require: name => name === 'react' ? { __esModule: true, default: react, ...react } : name === 'react-native' ? { AppState: appState }
      : name === './event-format' ? { formatOfficialEvent } : name === './supabase' ? { supabase: { rpc: name => { assert.equal(name, 'official_event_feed'); calls++; return { abortSignal: () => fetchSnapshot() }; } } } : (() => { throw Error(name); })(),
  });
  return {
    get value() { return value; }, get calls() { return calls; },
    async settle() { for (let i = 0; i < 10; i++) { if (dirty) { cursor = 0; dirty = false; value = module.exports.OfficialEventsProvider({ children: null }).value; } while (effects.length) effects.shift()(); await new Promise(resolve => setImmediate(resolve)); } },
    advance(ms) { clock += ms; timer?.(); }, activate() { listener?.('active'); },
    unmount() { hooks.forEach(h => h?.cleanup?.()); },
  };
}
test('simultaneous readers share one cache request and a failed refresh retains events and freshness', async () => {
  let release; let response = new Promise(resolve => { release = resolve; });
  const provider = mount(() => response); await provider.settle();
  assert.equal(provider.value.loading, true); const first = provider.value.refresh(), second = provider.value.refresh();
  assert.equal(first, second); assert.equal(provider.calls, 1);
  release({ data: snapshot, error: null }); await first; await provider.settle();
  assert.equal(provider.value.events[0].title, 'Meetup'); assert.equal(provider.value.loading, false);
  response = Promise.resolve({ data: null, error: { message: 'offline' } });
  await provider.value.refresh(); await provider.settle();
  assert.equal(provider.value.events.length, 1); assert.equal(provider.value.syncedAt, snapshot.syncedAt); assert.ok(provider.value.error);
  provider.unmount();
});
test('foregrounding and clock ticks do not refetch until the shared cache read is fifteen minutes old', async () => {
  const provider = mount(async () => ({ data: snapshot, error: null })); await provider.settle();
  provider.activate(); provider.advance(5 * 60000); await provider.settle(); assert.equal(provider.calls, 1);
  provider.advance(11 * 60000); await provider.settle(); assert.equal(provider.calls, 2); provider.unmount();
  provider.advance(20 * 60000); provider.activate(); await provider.settle(); assert.equal(provider.calls, 2);
});
