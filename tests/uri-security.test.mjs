import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url);
const query=require('query-string');
const decoder=createRequire(require.resolve('query-string'))('decode-uri-component');
test('patched decoder keeps spaced campus links and valid Unicode compatible',()=>{
 assert.equal(query.parse('building=LIB&floor=2&room=LIB2-207').room,'LIB2-207');
 assert.equal(query.parse('q=Library%202-207').q,'Library 2-207');
 assert.equal(decoder('%E2%9C%93'),'✓');assert.equal(decoder('hello%20world'),'hello world');
});
test('malformed percent sequences are bounded and do not recurse exponentially',()=>{
 const input='%FF'.repeat(20000)+'%E2%9C%93';const start=performance.now();
 assert.ok(decoder(input).endsWith('✓'));assert.ok(performance.now()-start<1000);
 assert.equal(decoder('%'),'%');assert.equal(decoder('%G1'),'%G1');
});
