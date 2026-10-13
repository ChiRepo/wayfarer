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
