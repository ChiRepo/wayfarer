import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, cleanCode, validCode, roomCode, pose, Multiplayer } from '../dist/multiplayer.js';
import { roomWeather } from '../dist/weather.js';
import { Vehicle, makeRoad } from '../dist/physics.js';
test('room codes and player names are bounded and safe for shared UI',()=>{
 for(let i=0;i<100;i++) assert.ok(validCode(roomCode()));
 assert.equal(cleanCode(' abcd-ef2345 '),'ABCDEF2345');
 assert.equal(validCode('../../rooms'),false);
 assert.ok(cleanName('<script> name').length<=20);
 assert.equal(cleanName(''), 'Wanderer');
});
test('network pose includes finite independent wheel state and bounded rotation',()=>{
 const v=new Vehicle(makeRoad());v.wheelSpin=123456;
 const p=pose(v,'#efb46e','Driver','uid',123);
 for(const k of ['x','y','z','h','p','r','u','w0','w1','w2','w3']) assert.ok(Number.isFinite(p[k]));
 assert.ok(Math.abs(p.spin)<=Math.PI*2);assert.equal(p.uid,'uid');
});
test('late arrivals derive the same weather without replaying a running client',()=>{
 for(const time of [0,170,350,3600,72000,86400]) {
  const a=roomWeather(57,'rain',time), b=roomWeather(57,'rain',time);
  assert.equal(a.current,b.current);assert.equal(a.wetness,b.wetness);assert.equal(a.rain,b.rain);
  assert.ok(a.wetness>=0 && a.wetness<=1);
 }
 const moods=new Set();for(let t=0;t<3600;t+=60)moods.add(roomWeather(57,'golden',t).current);
 assert.ok(moods.size>=4);
});
test('cancelling during initialization never claims a room afterwards',async()=>{
 let release;const initialized=new Promise(resolve=>release=resolve);
 const client=new Multiplayer({status(){},change(){},peers(){},room(){assert.fail('Cancelled join became active');}});
 client.initialize=()=>initialized;
 const joining=client.connect({create:true,name:'Test',seed:7,biome:'alpine',weather:'golden',color:'#efb46e'});
 await client.leave();release();await joining;
 assert.equal(client.active,false);assert.equal(client.pending,false);
});
test('paused racers ghost but finished results retain their race identifier',async()=>{
 const sent=[];
 const client=new Multiplayer({status(){}});
 client.sdk={set:async(ref,payload)=>sent.push(payload)};
 client.raceId=10000;client.isPaused=true;
 client.publish({x:0});await Promise.resolve();assert.equal(sent.at(-1).raceId,0);
 client.finish=30000;client.publish({x:0});await Promise.resolve();
 assert.equal(sent.at(-1).raceId,10000);assert.equal(sent.at(-1).finish,30000);
 client.finish=0;client.race={kind:'cruise',startedAt:10000};client.score=42;
 client.publish({x:0});await Promise.resolve();assert.equal(sent.at(-1).raceId,10000);assert.equal(sent.at(-1).score,42);
});

test('host switches activities in the same room while guests cannot write session control',async()=>{
 const writes=[];const c=new Multiplayer({status(){}});
 c.active=true;c.connected=true;c.uid='host';c.code='ABCDEFGH23';c.slot=0;
 c.meta={owner:'host',seed:7,biome:'alpine',weather:'day'};
 c.sdk={ref:(db,path)=>path,runTransaction:async(path,update)=>{
  const value=update(c.race);writes.push({path,value});c.race=value;return {committed:true};
 }};
 for(const kind of ['sprint','cruise','drift','drive','race']) await c.startRound(kind,{seed:25,biome:'coast',weather:'rain',weatherCycle:false});
 assert.equal(c.code,'ABCDEFGH23');assert.equal(c.slot,0);assert.equal(c.active,true);
 assert.equal(writes.length,5);assert.ok(writes.every(w=>w.path==='rooms/ABCDEFGH23/race'));
 assert.equal(c.route.biome,'coast');assert.equal(c.meta.biome,'alpine');
 assert.ok(writes.every((w,i)=>!i || w.value.startedAt>writes[i-1].value.startedAt));
 c.uid='guest';await assert.rejects(c.startRound('drive'));assert.equal(writes.length,5);
 c.peers=[{id:'old',routeId:1},{id:'new',routeId:c.race.startedAt}];
 assert.deepEqual(c.visiblePeers.map(p=>p.id),['new']);
});

test('an old pose rejected during a scenario switch does not ask players to rejoin',async()=>{
 let reject;const statuses=[];const c=new Multiplayer({status:s=>statuses.push(s)});
 c.sdk={set:()=>new Promise((resolve,fail)=>reject=fail)};
 c.race={startedAt:10000};c.publish({x:0});
 c.race={startedAt:20000};reject(Error('permission_denied'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(statuses,[]);assert.equal(c.sending,false);
});
