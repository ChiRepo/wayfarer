import { makeRoad } from './physics.js?v=20261021';
export const config = {
  apiKey: 'AIzaSyCtxRORRJxB6OTheahlRrBiCmGsXd22Jqo',
  authDomain: 'wavefinder-2da9d.firebaseapp.com',
  projectId: 'wavefinder-2da9d',
  databaseURL: 'https://wavefinder-2da9d-default-rtdb.asia-southeast1.firebasedatabase.app',
  appId: '1:789031451002:web:a7312ff3e5c6ed4e96bec3',
};
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const cleanName = name => String(name).replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0,20) || 'Wanderer';
export const cleanCode = code => String(code).trim().toUpperCase().replace(/[\s-]/g,'');
export const validCode = code => /^[A-Z2-9]{10}$/.test(code);
export function roomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), n => alphabet[n % alphabet.length]).join('');
}
export function pose(v, color, name, uid, timestamp) {
  const round = n => Math.round(n * 1000) / 1000;
  return {uid, name:cleanName(name), color, x:round(v.x), y:round(v.y), z:round(v.z),
    h:round(v.heading), p:round(v.pitch), r:round(v.roll), steer:round(v.steer),
    spin:round(v.wheelSpin % (Math.PI * 2)), u:round(v.u),
    ...Object.fromEntries(v.wheels.map((w,i)=>['w'+i,round(w.height)])),t:timestamp};
}
export class Multiplayer {
  constructor(callbacks) {
    this.callbacks = callbacks; this.active = false; this.connected = false;
    this.pending = false; this.peers = []; this.unsub = []; this.generation = 0;
    this.serverOffset = 0; this.sendTime = 0; this.sending = false;
  }
  get now() { return Date.now() + this.serverOffset; }
  status(message) { this.callbacks.status(message); }
  async initialize() {
    if (!this.sdk) {
      this.sdk = await import('./vendor/firebase.js');
      const f = this.sdk;
      this.app = f.getApps()[0] || f.initializeApp(config);
      this.auth = f.initializeAuth(this.app, {persistence: f.inMemoryPersistence});
      this.db = f.getDatabase(this.app);
    }
    this.sdk.goOnline(this.db);
    if (!this.auth.currentUser) await this.sdk.signInAnonymously(this.auth);
    this.uid = this.auth.currentUser.uid;
  }
  async connect({create, code, name, seed, biome, weather, color, mode = "drive"}) {
    if (this.pending || this.active) return;
    this.pending = true;
    const generation = ++this.generation;
    this.status('Finding your fellow wanderers…');
    let claimed, claimedSlot, claimedSpawn;
    let stage = 'sign-in';
    try {
      code = create ? roomCode() : cleanCode(code);
      if (!validCode(code)) throw Error('Enter a valid 10-character room code.');
      await this.initialize();
      const f = this.sdk;
      if (generation !== this.generation) return;
      stage = 'server-clock';
      this.serverOffset = await new Promise((resolve,reject) => f.onValue(f.ref(this.db,'.info/serverTimeOffset'),s=>resolve(s.val() || 0),reject,{onlyOnce:true}));
      stage = 'room';
      const roomRef = f.ref(this.db,'rooms/'+code), metaRef = f.ref(this.db,'rooms/'+code+'/meta');
      if (create) {
        const result = await f.runTransaction(metaRef, current => current ? undefined : {
          owner:this.uid, seed, biome, weather, mode, createdAt:f.serverTimestamp(), expiresAt:this.now+86300000,
        }, {applyLocally:false});
        if (!result.committed) throw Error('This code was just taken. Please create another room.');
      }
      const meta = (await f.get(metaRef)).val();
      if (!meta) throw Error('Room not found. Check the code or create a new drive.');
      if (meta.expiresAt < this.now) throw Error('This room has expired. Create a new drive.');
      const players = (await f.get(f.ref(this.db,'rooms/'+code+'/players'))).val() || {};
      const leader = Object.values(players).find(p => p.t > this.now-120000);
      const road = makeRoad(meta.seed,meta.biome);
      const spawnS = leader ? -leader.z-10 : 0;
      stage = 'seat';
      for (let i=0;i<8;i++) {
        const playerRef=f.ref(this.db,`rooms/${code}/players/${i}`);
        const startS=spawnS-Math.floor(i/2)*7;
        const x=road.center(startS)+(i%2 ? -1.85 : 1.85);
        const initial={uid:this.uid,name:cleanName(name),color,x,y:road.surface(x,startS)+0.67,z:-startS,
          h:road.heading(startS),p:0,r:0,steer:0,spin:0,u:0,w0:-.32,w1:-.32,w2:-.32,w3:-.32,t:f.serverTimestamp()};
        // Slot transactions enforce capacity even when several guests join at once.
        let result;
        try {
          result=await f.runTransaction(playerRef,current => current && current.t>this.now-120000 ? undefined : initial,{applyLocally:false});
        } catch(error) {
          if (String(error.code).includes('PERMISSION_DENIED') || String(error.code).includes('permission-denied')) continue;
          throw error;
        }
        if (result.committed) {
          claimed=playerRef; claimedSlot=i; claimedSpawn=startS;
          await f.onDisconnect(playerRef).remove();
          break;
        }
      }
      if (!claimed) throw Error('This drive has eight drivers already. Try another room.');
      if (generation !== this.generation) { await f.remove(claimed); return; }
      this.slot=claimedSlot; this.spawnS=claimedSpawn;
      this.playerRef=claimed; this.roomRef=roomRef; this.code=code; this.meta=meta;
      this.name=cleanName(name); this.active=true; this.connected=true;
      this.callbacks.room(meta,this.slot,this.spawnS);
      this.unsub.push(f.onValue(f.ref(this.db,`rooms/${code}/race`), snapshot=>{
        this.race=snapshot.val();
        this.callbacks.race?.(this.race);
      }));
      this.unsub.push(f.onValue(f.ref(this.db,`rooms/${code}/players`), snapshot => {
        const data=snapshot.val() || {};
        if (data[this.slot] && data[this.slot].uid !== this.uid) {
          this.status('Your place was taken while offline. Rejoin the room to continue.');
          void this.leave(); return;
        }
        this.peers=Object.entries(data).filter(([slot,p])=>Number(slot)!==this.slot && p.t>this.now-120000)
          .map(([slot,p])=>({...p,id:slot}));
        this.callbacks.peers(this.peers);
      },error => { this.status('Room connection interrupted. You can keep driving solo.'); void this.leave(); }));
      this.unsub.push(f.onValue(f.ref(this.db,'.info/serverTimeOffset'),s=>this.serverOffset=s.val() || 0));
      this.unsub.push(f.onValue(f.ref(this.db,'.info/connected'),snapshot=>{
        this.connected=!!snapshot.val();
        if (!this.active) return;
        if (this.connected) {
          f.onDisconnect(this.playerRef).remove().then(()=>{this.sendTime=0;this.status('Connected · enjoy the drive together.');})
            .catch(()=>this.status('Connection interrupted. Try rejoining the room.'));
        } else this.status('Reconnecting… your solo controls still work.');
      }));
      this.heartbeat = setInterval(() => {
        if (this.active && this.connected && !this.sending && this.lastPayload && this.now-this.lastSentAt > 4000)
          this.publish({...this.lastPayload,t:this.sdk.serverTimestamp()});
      },5000);
      this.status('Connected · enjoy the drive together.');
    } catch(error) {
      if (claimed) await this.sdk.remove(claimed).catch(()=>{});
      if(generation !== this.generation) return;
      const code=String(error.code || '');
      const cause = String(error.customData?.message || '').replace(/https?:\/\/\S+/g, '[request]').slice(0,160);
      console.warn(`Multiplayer connection failed at ${stage}: ${code || 'unknown'} ${cause}`);
      const message=code.includes('network') ? 'Unable to connect. Check your internet connection and try again.' :
        code.includes('permission') || code.includes('PERMISSION') ? 'Room access was denied. Try creating a new drive.' : error.message;
      this.status(message || 'Unable to join. Please try again.');
    } finally { if(generation===this.generation) { this.pending=false; this.callbacks.change(); } }
  }
  tick(dt, vehicle, color, paused) {
    if (!this.active) return;
    if (this.now > this.meta.expiresAt) { this.status('This room has ended. Create a new drive.'); void this.leave(); return; }
    this.isPaused=paused;
    this.sendTime+=dt;
    if (!this.connected || this.sending || this.sendTime < (paused ? 2 : 0.1)) return;
    this.sendTime=0;
    this.publish(pose(vehicle,color,this.name,this.uid,this.sdk.serverTimestamp()));
    const recent=this.peers.filter(p=>p.t>this.now-120000);
    if(recent.length!==this.peers.length) { this.peers=recent; this.callbacks.peers(recent); }
  }
  async startRace() {
    if(!this.active || this.meta.mode!=='race' || this.meta.owner!==this.uid) return;
    await this.sdk.set(this.sdk.ref(this.db,`rooms/${this.code}/race`),{startedAt:this.now+5000});
  }
  publish(payload) {
    payload={...payload,raceId:this.isPaused && !this.finish ? 0 : this.raceId || 0,finish:this.finish || 0};
    this.sending=true; this.lastPayload=payload; this.lastSentAt=this.now;
    const generation=this.generation;
    this.sdk.set(this.playerRef,payload).catch(()=>{
      if (generation===this.generation) this.status('Connection interrupted. Try rejoining the room.');
    }).finally(()=>{ if(generation===this.generation) this.sending=false; });
  }
  async leave() {
    ++this.generation;
    clearInterval(this.heartbeat); this.heartbeat=null; this.lastPayload=null;
    const f=this.sdk, player=this.playerRef, room=this.roomRef, code=this.code;
    this.active=false; this.connected=false; this.pending=false; this.race=null; this.raceId=0; this.finish=0;
    for(const off of this.unsub) off(); this.unsub=[];
    this.playerRef=null; this.roomRef=null; this.code=null; this.peers=[]; this.sending=false;
    this.callbacks.peers([]); this.callbacks.change();
    if (f && player) {
      try {
        await Promise.race([f.remove(player),new Promise(resolve=>setTimeout(resolve,2000))]);
        if(room) {
          const players=await Promise.race([f.get(f.ref(this.db,'rooms/'+code+'/players')),new Promise(resolve=>setTimeout(()=>resolve(null),1000))]);
          if(players && !players.exists()) await Promise.race([f.remove(room),new Promise(resolve=>setTimeout(resolve,1000))]);
        }
      } catch {}
    }
    if(f && !this.active && !this.pending) f.goOffline(this.db);
  }
}
