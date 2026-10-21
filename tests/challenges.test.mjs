import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Challenge } from '../dist/challenges.js';
const car = { z: -100, u: 15, offroad: false, impact: 0 };
function run(c, seconds, pose = car) { for(let i=0;i<Math.round(seconds*120);i++) c.step(1/120,pose); }
test('countdown holds scoring and forward progress cannot be farmed by reversing', () => {
  const c = new Challenge('sprint', 100); run(c,3); assert.equal(c.elapsed,0);
  run(c,1,{...car,z:-300}); assert.equal(c.progress,200);
  run(c,1,{...car,z:-50}); assert.equal(c.progress,200);
  run(c,1,{...car,z:-850}); assert.equal(c.done,true); assert.equal(c.won,true);
  const time=c.elapsed; run(c,5); assert.equal(c.elapsed,time);
});
test('sprint times out and clean cruise completes with scoring only on clean road', () => {
  const sprint=new Challenge('sprint',100); run(sprint,94); assert.equal(sprint.done,true); assert.equal(sprint.won,false);
  const c=new Challenge('cruise',100); run(c,14); assert.ok(c.score>100);
  const score=c.score; run(c,2,{...car,offroad:true}); assert.equal(c.score,score); assert.equal(c.streak,0);
  run(c,2,{...car,impact:1}); assert.equal(c.score,score);
  run(c,2,{...car,u:-10}); assert.equal(c.score,score);
  run(c,50); assert.equal(c.done,true); assert.equal(c.elapsed,60); assert.ok(c.bestStreak>10);
});

test('drift scoring requires a controlled on-road slide and resets on impact',()=>{
 const c=new Challenge('drift',0);run(c,3);
 run(c,2,{...car,v:3});assert.ok(c.score>0);
 const score=c.score;run(c,2,{...car,v:20});assert.equal(c.score,score);
 run(c,2,{...car,v:3,impact:.5});assert.equal(c.score,score);
});
const {RoadRace}=await import('../dist/challenges.js');
test('shared race countdown, finish and timeout follow server time, not frames',()=>{
 const r=new RoadRace(10000);r.tick(7000,{z:0});assert.equal(r.countdown,3);
 r.step(100,{z:-2000});assert.equal(r.done,false);
 r.tick(30000,{z:-1501});assert.equal(r.won,true);assert.equal(r.elapsed,20);
 const timeout=new RoadRace(10000);timeout.tick(140000,{z:-100});assert.equal(timeout.done,true);assert.equal(timeout.won,false);
});

const {SharedChallenge}=await import('../dist/challenges.js');
test('shared mini-games synchronize countdown and expire while menus are paused',()=>{
 for(const kind of ['sprint','cruise','drift','race']) {
  const c=new SharedChallenge(kind,10000);
  c.tick(7000,car);run(c,1,{...car,v:3});assert.equal(c.score,0);assert.equal(c.countdown,3);
  c.tick(12000,{...car,z:-100});run(c,.5,{...car,v:3});
  assert.equal(c.elapsed,2);assert.ok(c.score>0);
  const score=c.score;c.tick(200000,{...car,z:-100});
  assert.equal(c.done,true);assert.equal(c.score,score);
  assert.equal(c.won,['cruise','drift'].includes(kind));
 }
});
test('shared sprint and race require the correct distance before the deadline',()=>{
 for(const [kind,distance] of [['sprint',750],['race',1500]]) {
  const c=new SharedChallenge(kind,10000);c.tick(12000,{z:-(distance-1)});assert.equal(c.done,false);
  c.tick(13000,{z:-distance});assert.equal(c.won,true);assert.equal(c.elapsed,3);
  const late=new SharedChallenge(kind,10000);late.tick(200000,{z:-distance});assert.equal(late.won,false);
 }
});
