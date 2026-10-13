import { test } from "node:test";
import assert from "node:assert/strict";
import { WeatherCycle, weatherNames } from "../dist/weather.js";
import { closeGround } from "../dist/world.js";
test("weather evolves reproducibly at bounded intervals without repeats", () => {
 const a = new WeatherCycle(72), b = new WeatherCycle(72); let changes = 0, previous = a.current;
 for (let i=0;i<3600;i++) {
  const changed=a.step(1); b.step(1);
  assert.equal(a.current,b.current); assert.ok(a.duration>=120 && a.duration<=240);
  if(changed) { assert.notEqual(a.current,previous); previous=a.current; changes++; }
  assert.ok(weatherNames.includes(a.current)); assert.ok(a.wetness>=0 && a.wetness<=1);
 }
 assert.ok(changes>12);
});
test("manual weather stays selected and wet road dries gradually", () => {
 const c=new WeatherCycle(1,"rain");
 for(let i=0;i<1000;i++) c.step(1,false);
 assert.equal(c.current,"rain"); const wet=c.wetness;
 c.select("day"); c.step(1,false); assert.ok(c.wetness>wet*.9);
 for(let i=0;i<800;i++) c.step(1,false);
 assert.ok(c.wetness<.01); assert.equal(c.elapsed,0);
});
test("terrain volume is closed with every mesh edge shared by two triangles", () => {
 const p=[0,2,0,1,2,0,0,3,-1,1,3,-1], c=new Array(12).fill(1), idx=[0,1,2,1,3,2];
 closeGround(p,c,idx,2,1);
 const edges=new Map();
 for(let i=0;i<idx.length;i+=3) for(let j=0;j<3;j++) {
  const a=idx[i+j],b=idx[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(":");
  edges.set(key,(edges.get(key)||0)+1);
 }
 for(const count of edges.values()) assert.equal(count,2);
 assert.equal(p.length,c.length);
});
