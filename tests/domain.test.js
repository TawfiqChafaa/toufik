import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTasks,selectTasks,priority,dayKey } from "../src/domain.js";
import { createTaskRepository } from "../src/repository.js";
const task={id:"a",title:"Appeler le fournisseur",area:"Travail",due:"2026-10-27T09:00",duration:25,urgent:true,important:true,done:false};
test("import et sauvegarde conservent les champs existants",()=>assert.deepEqual(normalizeTasks([task]),[task]));
test("imports malformés refusés sans coercition des booléens",()=>{
 for(const data of [{},[null],[{...task,title:" "}],[{...task,due:"demain"}],[{...task,duration:-1}],[{...task,done:"false"}],[task,task]]) assert.throws(()=>normalizeTasks(data));
});
test("filtres et progression utilisent les tâches actives",()=>{
 const done={...task,id:"b",done:true};
 const later={...task,id:"c",due:"2026-10-28T10:00",urgent:false};
 const list=[done,later,task];
 assert.deepEqual(selectTasks(list,"today",new Date(2026,9,27)).map(t=>t.id),["a"]);
 assert.deepEqual(selectTasks(list,"urgent").map(t=>t.id),["a"]);
 assert.deepEqual(selectTasks(list,"done").map(t=>t.id),["b"]);
 assert.equal(selectTasks(list,"all").at(-1).id,"b");
 assert.equal(list[0],done);
 assert.equal(priority(task),"Urgent et important");
 assert.equal(dayKey("invalide"),"");
});
test("stockage conserve la clé historique et recharge les données",()=>{
 const memory=new Map();const repo=createTaskRepository({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});
 assert.deepEqual(repo.load(),[]);repo.save([task]);assert.ok(memory.has("cap.tasks.v1"));assert.deepEqual(repo.load(),[task]);
});
test("les échecs et données corrompues ne sont pas masqués",()=>{
 const repo=createTaskRepository({getItem:()=>"{",setItem:()=>{throw Error("quota")}});
 assert.throws(()=>repo.load());assert.throws(()=>repo.save([task]));
});
