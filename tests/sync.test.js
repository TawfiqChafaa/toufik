import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {createSyncWorkspace} from "../src/cloud/sync.js";
import {validateConfig} from "../dist/supabase.js";
globalThis.crypto ||= webcrypto;
function memoryStore(){
 const states=new Map();
 return {
  async read(owner){return structuredClone(states.get(owner)||{owner,cursor:0,records:{},queue:[],migrations:[]});},
  async update(owner,fn){
   const state=await this.read(owner);
   const result=fn(state);states.set(owner,structuredClone(state));return result;
  }
 };
}
function server(){
 const users=new Map();let online=true,loseResponse=false;
 return {
  offline:()=>{online=false;},online:()=>{online=true;},loseNext:()=>{loseResponse=true;},
  remote(owner){
   if(!users.has(owner))users.set(owner,{records:new Map(),ops:new Map(),changes:[]});
   const s=users.get(owner);
   return {
    async apply(op){
     if(!online)throw Error("offline");
     if(s.ops.has(op.operationId))return structuredClone(s.ops.get(op.operationId));
     const previous=s.records.get(op.key);
     if((previous?.version||0)!==op.expected)return {conflict:true,record:structuredClone(previous||null)};
     const record={kind:op.kind,id:op.id,data:op.data,deleted:op.deleted,version:op.expected+1,seq:s.changes.length+1};
     s.records.set(op.key,record);s.changes.push({seq:record.seq,record});
     const result={conflict:false,record};s.ops.set(op.operationId,structuredClone(result));
     if(loseResponse){loseResponse=false;throw Error("réponse perdue");}
     return structuredClone(result);
    },
    async pull(cursor){if(!online)throw Error("offline");return structuredClone(s.changes.filter(c=>c.seq>cursor).slice(0,100));}
   };
  }
 };
}
const task={id:"task-legacy",title:"Rappeler Nadia",area:"Moi",duration:25,due:"",urgent:false,important:true,done:false};
const idea={id:"idea-legacy",text:"Un atelier",category:"Moi",status:"À explorer",reviewAt:"",createdAt:"2026-10-27T12:00:00Z",updatedAt:"2026-10-27T12:00:00Z",version:1};
const ws=(owner,store,remote)=>createSyncWorkspace({owner,store,remote});
test("migration confirmée, idempotente, tâches ET idées préservées sur deux appareils",async()=>{
 const cloud=server(),a=ws("A",memoryStore(),cloud.remote("A")),b=ws("A",memoryStore(),cloud.remote("A"));
 await assert.rejects(()=>a.importLegacy({tasks:[task],ideas:[idea]},false));
 assert.equal(await a.importLegacy({tasks:[task],ideas:[idea]},true),2);
 assert.equal(await a.importLegacy({tasks:[task],ideas:[idea]},true),0);
 await a.sync();await b.sync();
 assert.deepEqual(await b.tasks.load(),[task]);
 const [restored]=await b.ideas.list();assert.equal(restored.text,idea.text);assert.equal(restored.createdAt,idea.createdAt);
});
test("coupure réseau et réponse perdue : reprise sans doublon",async()=>{
 const cloud=server(),store=memoryStore(),a=ws("A",store,cloud.remote("A"));
 await a.tasks.load();await a.tasks.save([task]);cloud.offline();await assert.rejects(()=>a.sync());
 assert.equal((await store.read("A")).queue.length,1);
 cloud.online();cloud.loseNext();await assert.rejects(()=>a.sync());
 assert.equal((await store.read("A")).queue.length,1);
 await a.sync();assert.equal((await store.read("A")).queue.length,0);
 assert.equal((await cloud.remote("A").pull(0)).length,1);
});
test("modifications simultanées conservent les deux variantes et résolution explicite",async()=>{
 const cloud=server(),a=ws("A",memoryStore(),cloud.remote("A")),b=ws("A",memoryStore(),cloud.remote("A"));
 await a.importLegacy({tasks:[task],ideas:[]},true);await a.sync();await b.sync();
 await a.tasks.load();await b.tasks.load();
 await a.tasks.save([{...task,title:"Sur Windows"}]);await b.tasks.save([{...task,title:"Sur Huawei"}]);
 await a.sync();await b.sync();
 const [conflict]=await b.conflicts();
 assert.equal(conflict.data.title,"Sur Huawei");assert.equal(conflict.conflict.remote.data.title,"Sur Windows");
 await b.resolve("task",task.id,"both");await b.sync();await a.sync();
 assert.deepEqual((await a.tasks.load()).map(t=>t.title).sort(),["Sur Huawei","Sur Windows"]);
});
test("une suppression distante ne ressuscite pas après un changement hors ligne",async()=>{
 const cloud=server(),a=ws("A",memoryStore(),cloud.remote("A")),b=ws("A",memoryStore(),cloud.remote("A"));
 await a.importLegacy({tasks:[task],ideas:[]},true);await a.sync();await b.sync();
 await a.tasks.load();await b.tasks.load();await a.tasks.save([]);await b.tasks.save([{...task,done:true}]);
 await a.sync();await b.sync();assert.equal((await b.conflicts())[0].conflict.remote.deleted,true);
 await b.resolve("task",task.id,"remote");assert.deepEqual(await b.tasks.load(),[]);
});
test("cache, file et restauration sont séparés par utilisateur",async()=>{
 const store=memoryStore(),a=ws("A",store),b=ws("B",store);
 await a.importLegacy({tasks:[task],ideas:[idea]},true);
 assert.deepEqual(await b.tasks.load(),[]);
 const backup=await a.backup();
 await assert.rejects(()=>b.restoreBackup(backup));
 const restored=ws("A",memoryStore());assert.equal(await restored.restoreBackup(backup),2);
 assert.deepEqual(await restored.tasks.load(),[task]);assert.equal((await restored.ideas.list())[0].text,idea.text);
 assert.equal(await restored.restoreBackup(backup),0);
});
test("un import ou une restauration en conflit est atomique",async()=>{
 const store=memoryStore(),a=ws("A",store);
 await a.importLegacy({tasks:[task],ideas:[]},true);
 await assert.rejects(()=>a.importLegacy({tasks:[{...task,id:"nouveau"},{...task,title:"Conflit"}],ideas:[]},true));
 assert.deepEqual(await a.tasks.load(),[task]);assert.equal((await store.read("A")).queue.length,1);
 const backup=await a.backup();backup.state.records[JSON.stringify(["task",task.id])].data.title="Conflit";
 await assert.rejects(()=>a.restoreBackup(backup));assert.deepEqual(await a.tasks.load(),[task]);
});
test("un formulaire périmé ne supprime pas une nouvelle tâche d'un autre onglet",async()=>{
 const store=memoryStore(),a=ws("A",store),b=ws("A",store);
 await a.tasks.load();await b.tasks.load();
 await a.tasks.save([task]);await b.tasks.save([{...task,id:"autre"}]);
 assert.equal((await a.tasks.load()).length,2);
});
test("le changement de compte bloque la fin d'un envoi sans effacer sa file",async()=>{
 let release;const store=memoryStore();
 const a=ws("A",store,{apply:()=>new Promise(resolve=>{release=resolve;}),pull:async()=>[]});
 await a.importLegacy({tasks:[task],ideas:[]},true);const sync=a.sync();
 while(!release)await new Promise(resolve=>setImmediate(resolve));
 a.close();release({conflict:false,record:{kind:"task",id:task.id,data:task,version:1,seq:1,deleted:false}});
 await assert.rejects(()=>sync);
 assert.equal((await store.read("A")).queue.length,1);
 await assert.rejects(()=>a.tasks.load());
});
test("configuration : seules URL du projet et clés publiques sont acceptées",()=>{
 assert.equal(validateConfig({url:"https://exemple.supabase.co",publishableKey:"sb_publishable_exemple"}).url,"https://exemple.supabase.co");
 for(const config of [
  {url:"http://exemple.supabase.co",publishableKey:"sb_publishable_exemple"},
  {url:"https://exemple.supabase.co.evil.test",publishableKey:"sb_publishable_exemple"},
  {url:"https://exemple.supabase.co",publishableKey:"sb_secret_EXEMPLE_NON_UTILISABLE"},
  {url:"https://exemple.supabase.co",publishableKey:"x."+btoa(JSON.stringify({role:"service_role"}))+".x"}
 ])assert.throws(()=>validateConfig(config));
});
