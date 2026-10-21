import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const braces = require(process.env.LAURIER_TEST_BRACES_PATH || 'braces');
const forge = require(process.env.LAURIER_TEST_FORGE_PATH || 'node-forge');

test('Expo and micromatch resolve the patched dependencies', () => {
  const expoRequire = createRequire(import.meta.resolve('@expo/cli'));
  const micromatchRequire = createRequire(import.meta.resolve('micromatch'));
  assert.equal(expoRequire.resolve('node-forge'), fileURLToPath(import.meta.resolve('node-forge')));
  assert.equal(micromatchRequire('braces/package.json').everythingLaurierSecurityPatch, '2026-10-21.1');
  assert.equal(expoRequire('node-forge/package.json').everythingLaurierSecurityPatch, '2026-10-21.1');
});

test('braces rejects deeply nested braces, parentheses, mixed and unclosed patterns safely', () => {
  for (const pattern of ['{'.repeat(3000)+'a,b'+'}'.repeat(3000), '('.repeat(3000)+'a'+')'.repeat(3000), '{('.repeat(1500)+'a,b'+')}'.repeat(1500), '{'.repeat(3000)+'a,b']) {
    for (const method of ['parse', 'compile', 'expand', 'stringify']) {
      assert.throws(() => braces[method](pattern), error => error instanceof SyntaxError && /limit exceeded/.test(error.message));
    }
  }
  assert.deepEqual(braces.expand('src/{app,lib}/file{1..3}.ts'), ['src/app/file1.ts','src/app/file2.ts','src/app/file3.ts','src/lib/file1.ts','src/lib/file2.ts','src/lib/file3.ts']);
  assert.deepEqual(braces.expand('a/{b,{c,d}}/e'), ['a/b/e','a/c/e','a/d/e']);
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d');
});

test('braces guards custom ASTs and cyclic ASTs before recursive walkers', () => {
  let ast = { type: 'text', value: 'x' };
  for (let i=0; i<10000; i++) ast = { type:'root', nodes:[ast] };
  const cyclic = { type:'root', nodes:[] }; cyclic.nodes.push(cyclic);
  for (const method of ['compile', 'expand', 'stringify']) for (const input of [ast, cyclic]) {
    assert.throws(() => braces[method](input), error => error instanceof SyntaxError && /limit exceeded/.test(error.message));
  }
});

test('RSA verification rejects unconsumed nested DigestAlgorithm elements, with or without NULL', () => {
  const { privateKey: pem } = generateKeyPairSync('rsa', {modulusLength:2048, publicExponent:3, privateKeyEncoding:{type:'pkcs1',format:'pem'}, publicKeyEncoding:{type:'pkcs1',format:'pem'}});
  const key = forge.pki.privateKeyFromPem(pem);
  const pub = forge.pki.setRsaPublicKey(key.n, key.e);
  const md = () => forge.md.sha256.create().update('Everything Laurier regression fixture');
  const digest = md().digest().getBytes();
  const { asn1 } = forge;
  const node = (type, constructed, value) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  function signature(includeNull, extras) {
    const algorithm = [node(asn1.Type.OID,false,asn1.oidToDer(forge.oids.sha256).getBytes())];
    if(includeNull) algorithm.push(node(asn1.Type.NULL,false,''));
    algorithm.push(...extras);
    const der = asn1.toDer(node(asn1.Type.SEQUENCE,true,[node(asn1.Type.SEQUENCE,true,algorithm), node(asn1.Type.OCTETSTRING,false,digest)])).getBytes();
    const blockLength = Math.ceil(key.n.bitLength()/8);
    return key.sign(md(), { encode: () => '\x00\x01'+'\xff'.repeat(blockLength-der.length-3)+'\x00'+der });
  }
  for (const includeNull of [false,true]) {
    assert.equal(pub.verify(digest, signature(includeNull,[])), true);
    for(const extra of [node(asn1.Type.OCTETSTRING,false,'garbage'), ...(includeNull ? [node(asn1.Type.NULL,false,'')] : [])]) {
      assert.throws(() => pub.verify(digest, signature(includeNull,[extra])), /valid RSASSA/);
    }
  }
  assert.equal(pub.verify(digest, key.sign(md())), true);
  const changed = forge.md.sha256.create().update('Changed message').digest().getBytes();
  assert.equal(pub.verify(changed,key.sign(md())), false);
});
