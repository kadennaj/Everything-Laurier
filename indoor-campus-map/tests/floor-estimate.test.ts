import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FloorEstimator} from '../src/floor-estimate.ts';
const levels=[1,2,3,4,5,6,7];
function samples(estimator: FloorEstimator, height: number, start: number, count=6, session=1) {
 let result;
 for(let i=0;i<count;i++) result=estimator.update({metres:height+(i%2)*.05,timestamp:start+i*1000,session},start+i*1000);
 return result!;
}
test('calibrated relative height estimates up and down, without assigning a room',()=>{
 const e=new FloorEstimator(2,levels,3.5,0);
 assert.equal(samples(e,25,0).floor,2);
 assert.equal(samples(e,28.5,6000).floor,3);
 assert.equal(samples(e,21.5,12000).floor,1);
 assert.deepEqual(Object.keys(samples(e,25,18000)).sort(),['delta','floor','status']);
});
test('motion, pressure spikes, and between-floor readings remain uncertain',()=>{
 const e=new FloorEstimator(2,levels,3.5,0);samples(e,0,0);
 assert.equal(e.update({metres:9,timestamp:6000,session:1},6000).floor,null);
 assert.equal(samples(e,1.8,7000).floor,null);
});
test('calibration requires stable readings and rejects absent floor coverage',()=>{
 const e=new FloorEstimator(1,[1,2],3.5,0);
 assert.equal(e.update({metres:0,timestamp:0,session:1},0).status,'calibrating');
 samples(e,0,1000);
 assert.equal(samples(e,7,7000).floor,null);
});
test('a restarted sensor, stale readings, and expired calibration cannot provide a floor',()=>{
 const e=new FloorEstimator(2,levels,3.5,0);samples(e,0,0);
 assert.equal(e.update({metres:3.5,timestamp:6000,session:2},6000).status,'expired');
 assert.equal(e.update({metres:3.5,timestamp:6000,session:1},13000).floor,null);
 assert.equal(e.update({metres:3.5,timestamp:601000,session:1},601000).status,'expired');
});
test('bad values, non-monotonic timestamps and invalid height assumptions fail closed',()=>{
 const e=new FloorEstimator(2,levels,3.5,0);samples(e,0,0);
 assert.equal(e.update({metres:NaN,timestamp:6000,session:1},6000).floor,null);
 assert.equal(e.update({metres:0,timestamp:4000,session:1},6000).floor,null);
 assert.equal(new FloorEstimator(2,levels,0,0).update({metres:0,timestamp:0,session:1},0).floor,null);
});
