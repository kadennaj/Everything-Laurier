import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/lib/state.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;

// Exercise the real provider with a minimal hook lifecycle and asynchronous storage.
// This verifies persistence and deletion ordering; it is not native UI coverage.
function mount(storage) {
  const hooks = []; let cursor = 0; let dirty = true; let value; const effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: {} }), createElement: (_type, props) => props,
    useState(initial) {
      const i = cursor++; if (!hooks[i]) hooks[i] = { value: initial };
      return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: initial }); },
    useCallback(callback, deps) {
      const i = cursor++; if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { deps, callback };
      return hooks[i].callback;
    },
    useEffect(callback, deps) {
      const i = cursor++; if (!hooks[i] || !same(hooks[i].deps, deps)) effects.push(() => {
        hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: callback() };
      });
    },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    exports: module.exports, module,
    require: name => name === 'react' ? { __esModule: true, default: react, ...react }
      : name === '@react-native-async-storage/async-storage' ? { __esModule: true, default: storage } : require(name),
    setTimeout: () => 1, clearTimeout: () => {},
  });
  return {
    get value() { return value; },
    async settle() {
      for (let i = 0; i < 12; i++) {
        if (dirty) { cursor = 0; dirty = false; value = module.exports.LocalState({ children: null }).value; }
        while (effects.length) effects.shift()();
        await new Promise(resolve => setImmediate(resolve));
      }
    },
    unmount() { hooks.forEach(hook => hook?.cleanup?.()); },
  };
}

test('hidden posts and venues survive relaunch and restore independently', async () => {
  const data = new Map();
  const storage = { getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); } };
  const first = mount(storage); await first.settle();
  assert.equal(first.value.ready, true);
  first.value.hidePost('POST_A'); first.value.hideSource('thepubonking'); await first.settle(); first.unmount();
  const second = mount(storage); await second.settle();
  assert.equal(second.value.hiddenPosts.join(','), 'POST_A');
  assert.equal(second.value.hiddenSources.join(','), 'thepubonking');
  second.value.unhidePosts(); await second.settle();
  assert.equal(second.value.hiddenPosts.length, 0);
  assert.equal(second.value.hiddenSources.join(','), 'thepubonking');
  second.value.unhideSource('thepubonking'); await second.settle();
  assert.equal(second.value.hiddenSources.length, 0); second.unmount();
});

test('account cleanup waits for outstanding writes and cannot restore old hidden posts', async () => {
  const data = new Map(); let gate;
  const storage = { getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { if (gate) await gate; data.set(key, value); }, removeItem: async key => { data.delete(key); } };
  const session = mount(storage); await session.settle();
  let release; gate = new Promise(resolve => { release = resolve; });
  session.value.hidePost('OLD_POST'); session.value.hideSource('rarenightclub'); await session.settle();
  const cleanup = session.value.purgeSaved(); await session.settle();
  gate = undefined; release(); await cleanup; await session.settle(); session.unmount();
  const next = mount(storage); await next.settle();
  assert.equal(next.value.hiddenPosts.length, 0); assert.equal(next.value.hiddenSources.length, 0);
  assert.equal(next.value.nightlifeAgeConfirmed, false); next.unmount();
});
