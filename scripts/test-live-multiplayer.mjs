import assert from 'node:assert/strict';
import { config, roomCode } from '../dist/multiplayer.js';
if (process.env.MULTIPLAYER_LIVE_TEST !== '1') throw Error('Set MULTIPLAYER_LIVE_TEST=1 to test isolated disposable rooms on the configured project.');
const accounts=[]; const code=roomCode(); let checks=0;
async function identity(method, body) {
 const res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${config.apiKey}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json(); if(!res.ok) throw Error(`Identity operation ${method}: ${data.error?.message}`); return data;
}
async function request(account,path='',method='GET',body) {
 const url=new URL(`${config.databaseURL}/rooms/${code}${path}.json`);
 if(account) url.searchParams.set('auth',account.idToken);
 const res=await fetch(url,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {ok:res.ok,status:res.status,data:await res.json()};
}
function expect(result,allowed,label) { assert.equal(result.ok,allowed,`${label}: HTTP ${result.status}`); checks++; console.log('PASS '+label); }
try {
 accounts.push(await identity('signUp',{returnSecureToken:true}));
 accounts.push(await identity('signUp',{returnSecureToken:true}));
 assert.equal((await request(accounts[0])).data,null,'Test room must be unused');
} catch(error) {
 await Promise.all(accounts.map(a=>identity('delete',{idToken:a.idToken}).catch(()=>{})));
 throw error;
}
const [a,b]=accounts;
try {
 expect(await request(null),false,'unauthenticated room reads denied');
 const rootURL=new URL(config.databaseURL+'/rooms.json');rootURL.searchParams.set('auth',a.idToken);
 expect({ok:(await fetch(rootURL)).ok,status:0},false,'room directory enumeration denied');
 expect(await request(a,'/meta','PUT',{owner:a.localId,seed:37,biome:'alpine',weather:'rain',mode:'race',createdAt:{'.sv':'timestamp'},expiresAt:Date.now()+300000}),true,'authenticated room creation');
 const player=(account,name)=>({uid:account.localId,name,color:'#efb46e',x:12,y:20,z:-30,h:0,p:0,r:0,steer:0,spin:0,u:0,w0:-.32,w1:-.32,w2:-.32,w3:-.32,t:{'.sv':'timestamp'}});
 expect(await request(a,'/players/0','PUT',player(a,'Test Alpha')),true,'first player joins');
 expect(await request(b,'/players/1','PUT',player(b,'Test Beta')),true,'second identity joins');
 assert.equal(Object.keys((await request(b,'/players')).data).length,2);checks++;console.log('PASS shared room sees both players');
 expect(await request(b,'/players/0','PATCH',{x:33}),false,'cannot move another driver');
 expect(await request(b,'/players/0','DELETE'),false,'cannot delete another driver');
 expect(await request(b,'/players/2','PUT',player(a,'Forged')),false,'cannot impersonate another driver');
 expect(await request(a,'/players/0','PATCH',{x:999999}),false,'out-of-range positions rejected');
 expect(await request(a,'/players/0','PATCH',{name:'x'.repeat(80)}),false,'oversized names rejected');
 expect(await request(a,'/players/0','PATCH',{arbitrary:'unvalidated data'}),false,'unexpected fields rejected');
 expect(await request(b,'/meta','PATCH',{seed:999}),false,'shared route cannot be hijacked');
 const raceAt=Date.now()+5000;
 expect(await request(b,'/race','PUT',{startedAt:raceAt}),false,'guest cannot start race');
 expect(await request(a,'/race','PUT',{startedAt:Date.now()-1000}),false,'past race starts rejected');
 expect(await request(a,'/race','PUT',{startedAt:Date.now()+50000}),false,'distant race starts rejected');
 expect(await request(a,'/race','PUT',{startedAt:raceAt,extra:true}),false,'unexpected race fields rejected');
 expect(await request(a,'/race','PUT',{startedAt:raceAt}),true,'host starts synchronized countdown');
 expect(await request(b,'/players/1','PATCH',{raceId:raceAt,finish:0}),true,'driver joins current race');
 expect(await request(b,'/players/1','PATCH',{raceId:123}),false,'invalid race identifiers rejected');
 expect(await request(b,'/players/1','PATCH',{finish:Date.now()+60000}),false,'future finish rejected');
 expect(await request(b,'/players/1','PATCH',{raceId:0,finish:0}),true,'driver can ghost or abandon race');
 expect(await request(a,'/players/0','PATCH',{x:15,u:-4,t:{'.sv':'timestamp'}}),true,'own movement and reverse accepted');
 assert.equal((await request(b,'/players/0')).data.x,15);checks++;console.log('PASS movement visible to second identity');
 for(let slot=2;slot<8;slot++) expect(await request(a,`/players/${slot}`,'PUT',player(a,'Test Slot '+slot)),true,'allowed seat '+slot);
 expect(await request(a,'/players/8','PUT',player(a,'Ninth')),false,'ninth seat rejected');
 console.log(JSON.stringify({checks,project:config.projectId,result:'passed'}));
} finally {
 if(a) { for(let i=0;i<8;i++) await request(i===1?b:a,`/players/${i}`,'DELETE').catch(()=>{}); await request(a,'','DELETE').catch(()=>{}); }
 await Promise.all(accounts.map(account=>identity('delete',{idToken:account.idToken}).catch(()=>{})));
}
