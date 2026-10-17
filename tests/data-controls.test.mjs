import assert from 'node:assert/strict';
import test from 'node:test';
import {buildDataExport} from '../src/lib/data-export.ts';
test('data copies do not serialize auth sessions or arbitrary browser storage',()=>{
 const value=JSON.parse(buildDataExport({account:{email:'test@example.invalid'},profile:{display_name:'Test'},access_token:'must-not-leak',session:{refresh_token:'must-not-leak'},localStorage:{password:'must-not-leak'}},{saved:['club:1'],hiddenSources:[],hiddenPosts:[],nightlifeAgeConfirmed:false,externalMediaEnabled:false}));
 assert.equal(value.account.email,'test@example.invalid');assert.equal(value.device_preferences.externalMediaEnabled,false);assert.deepEqual(value.device_preferences.saved,['club:1']);assert.ok(!JSON.stringify(value).includes('must-not-leak'));
});
