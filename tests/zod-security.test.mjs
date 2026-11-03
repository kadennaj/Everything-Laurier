import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliPath = expoRequire.resolve('@expo/cli');
const cliRequire = createRequire(cliPath);
const hooksRequire = createRequire(require.resolve('eslint-plugin-react-hooks'));
const { z } = cliRequire('zod');
const server = join(dirname(expoRequire.resolve('@expo/cli/package.json')), 'build/src/start/server');
const { PluginSchema, DevToolsPluginOutputSchema } = require(join(server, 'DevToolsPlugin.schema.js'));
const { createMCPDevToolsExtensionSchema } = require(join(server, 'createMCPDevToolsExtensionSchema.js'));
const plugin = { packageName: 'test-plugin', packageRoot: '/test', cliExtensions: {
 description: 'Schema compatibility fixture', entryPoint: './commands.js', commands: [
  { name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'], parameters: [
   { name: 'count', type: 'number' }, { name: 'confirm', type: 'confirm' }, { name: 'query', type: 'text' },
  ] },
 ] },
};
test('Expo and React Hooks linting resolve the fixed Zod release', () => {
 assert.equal(cliRequire('zod/package.json').version, '4.6.7');
 assert.equal(hooksRequire('zod/package.json').version, '4.6.7');
 assert.equal(cliRequire.resolve('zod'), require.resolve('zod'));
 assert.equal(hooksRequire.resolve('zod/v4'), require.resolve('zod/v4'));
});
test('oversized constrained arrays, sets and maps fail before visiting elements', () => {
 for (const type of ['array', 'set', 'map']) {
  let visited = 0;
  const value = z.string().superRefine((_input, context) => { visited++; context.addIssue({ code: 'custom', message: 'Invalid fixture' }); });
  const input = Array.from({ length: 10000 }, (_, i) => String(i));
  const schema = type === 'array' ? z.array(value).max(2) : type === 'set' ? z.set(value).max(2) : z.map(z.string(), value).max(2);
  const data = type === 'array' ? input : type === 'set' ? new Set(input) : new Map(input.map(item => [item, item]));
  const result = schema.safeParse(data);
  assert.equal(result.success, false);
  assert.equal(visited, 0, `${type} must reject oversized input before element validation`);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, 'too_big');
 }
});
test('Expo plugin descriptors and MCP command arguments keep their validation', () => {
 const parsed = PluginSchema.parse(plugin);
 assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
 assert.equal(PluginSchema.safeParse({ ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }).success, false);
 const schema = createMCPDevToolsExtensionSchema(parsed);
 assert.deepEqual(schema.parse({ command: 'inspect', count: 2, confirm: true, query: 'campus' }), { command: 'inspect', count: 2, confirm: true, query: 'campus' });
 for (const invalid of [{ command: 'unknown' }, { command: 'inspect', count: 'two' }, { command: 'inspect', confirm: 'yes' }, { command: 'inspect', injected: true }]) assert.equal(schema.safeParse(invalid).success, false);
});
test('Expo developer-tool output accepts supported content and rejects invalid data', () => {
 const output = [{ type: 'text', text: 'Ready', level: 'info' }, { type: 'image', url: 'https://example.invalid/image.png' }, { type: 'audio', url: 'https://example.invalid/audio.mp3' }];
 assert.deepEqual(DevToolsPluginOutputSchema.parse(output), output);
 assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'audio', url: 'invalid' }]).success, false);
 assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'Ready', level: 'unknown' }]).success, false);
});
