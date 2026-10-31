import {normalizeTasks} from "../domain.js";
import {validateIdea} from "../ideas-domain.js";
const keyOf=(kind,id)=>JSON.stringify([kind,id]);
export const uid=()=>globalThis.crypto.randomUUID();
export function cleanData(kind,data) {
 if(kind==="task")return normalizeTasks([data])[0];
 if(kind==="idea")return validateIdea({...data,version:1});
 throw Error("Type inconnu.");
}
export function createSyncWorkspace({owner,store,remote,onChange=()=>{},onStatus=()=>{}}) {
 let active=true,running,taskBaseline=[];
 const notify=()=>{if(active)onChange();};
 const guard=()=>{if(!active)throw Error("Session fermée.");};
 function enqueue(s,kind,id,data,deleted=false) {
  const key=keyOf(kind,id),previous=s.records[key];
  if(previous?.conflict)throw Error("Résous le conflit avant de modifier cet élément.");
  const waiting=s.queue.filter(o=>o.key===key).length;
  const base=previous?.serverVersion||0;
  s.queue.push({operationId:uid(),key,kind,id,data,deleted,expected:base+waiting});
  s.records[key]={...previous,kind,id,data,deleted,serverVersion:base,
   seq:previous?.seq||0,revision:(previous?.revision||0)+1};
 }
 async function read(kind) {
  guard();const s=await store.read(owner);
  return Object.values(s.records).filter(r=>r.kind===kind&&!r.deleted)
   .map(r=>kind==="idea"?{...r.data,version:r.revision}:r.data);
 }
 function receive(s,record) {
  if(!record||!Number.isSafeInteger(record.version)||record.version<1||!Number.isSafeInteger(record.seq)||record.seq<1||typeof record.deleted!=="boolean")throw Error("Réponse serveur invalide.");
  const incoming=cleanData(record.kind,record.data);
  if(incoming.id!==record.id)throw Error("Identifiant serveur incohérent.");
  const key=keyOf(record.kind,record.id),local=s.records[key];
  if(local && record.seq<=local.seq)return;
  const pending=s.queue.some(o=>o.key===key);
  const data=pending?local.data:incoming;
  const deleted=pending?local.deleted:record.deleted;
  // Une confirmation serveur sans changement de contenu n'invalide pas l'éditeur.
  const changed=!local||local.deleted!==deleted||JSON.stringify(local.data)!==JSON.stringify(data);
  s.records[key]={...local,kind:record.kind,id:record.id,serverVersion:record.version,seq:record.seq,
   data,deleted,revision:(local?.revision||0)+(changed?1:0)};
 }
 async function sync() {
  guard();if(!remote)return;
  if(running)return running;
  running=(async()=>{
   onStatus("Synchronisation…");
   try {
    // Envois avant rattrapage : le serveur détecte les changements concurrents.
    while(active) {
     const s=await store.read(owner);
     const op=s.queue.find(o=>!s.records[o.key]?.conflict);
     if(!op)break;
     const result=await remote.apply(op);guard();
     await store.update(owner,state=>{
      if(result.conflict) {
       state.records[op.key].conflict={remote:result.record};
      } else {
       state.queue=state.queue.filter(o=>o.operationId!==op.operationId);
       receive(state,result.record);
      }
     });notify();
    }
    while(active) {
     const s=await store.read(owner),changes=await remote.pull(s.cursor);guard();
     if(!changes.length)break;
     await store.update(owner,state=>{
      for(const change of changes){receive(state,change.record);state.cursor=Math.max(state.cursor,change.seq);}
     });notify();
     if(changes.length<100)break;
    }
    const s=await store.read(owner);
    onStatus(Object.values(s.records).some(r=>r.conflict)?"Conflit à résoudre":s.queue.length?"En attente d’envoi":"Synchronisé");
   }catch(error) {
    if(active)onStatus(error.code==="AUTH"?"Connexion à renouveler":"Hors connexion ou service indisponible : changements conservés.");
    throw error;
   }
  })();
  try {return await running;} finally {running=null;}
 }
 async function change(fn) {guard();const value=await store.update(owner,fn);notify();onStatus("Enregistré sur cet appareil · en attente d’envoi");return value;}
 return {
  owner,read,sync,
  tasks:{
   load:async()=>{taskBaseline=await read("task");return structuredClone(taskBaseline);},
   save:async tasks=>{
    const clean=normalizeTasks(tasks);
    await change(s=>{
     const before=new Map(taskBaseline.map(t=>[t.id,t]));
     const after=new Map(clean.map(t=>[t.id,t]));
     for(const id of new Set([...before.keys(),...after.keys()])) {
      const original=before.get(id),data=after.get(id);
      if(JSON.stringify(original)===JSON.stringify(data))continue;
      const current=s.records[keyOf("task",id)];
      if((original&&(!current||current.deleted||JSON.stringify(current.data)!==JSON.stringify(original)))||
         (!original&&current))throw Error("Une tâche a changé dans un autre onglet. Actualise avant de réessayer.");
      enqueue(s,"task",id,data||original,!data);
     }
    });
    taskBaseline=structuredClone(clean);
   }
  },
  ideas:{
   list:()=>read("idea"),
   save:async idea=>{
    const clean=validateIdea(idea);
    return change(s=>{
     const prior=s.records[keyOf("idea",idea.id)];
     if((prior&&prior.revision!==idea.version-1)||(!prior&&idea.version!==1))throw Error("Idée modifiée ailleurs. Recharge avant de continuer.");
     enqueue(s,"idea",idea.id,cleanData("idea",clean));
     return {...clean,version:s.records[keyOf("idea",idea.id)].revision};
    });
   },
   remove:async(id,version)=>change(s=>{
    const r=s.records[keyOf("idea",id)];
    if(!r||r.revision!==version)throw Error("Idée modifiée ailleurs.");
    enqueue(s,"idea",id,r.data,true);
   }),
   merge:async ideas=>change(s=>{
    let count=0;
    for(const raw of ideas){
     const data=cleanData("idea",raw),r=s.records[keyOf("idea",data.id)];
     if(r&&JSON.stringify(r.data)!==JSON.stringify(data))throw Error("Conflit d’import. Aucun remplacement effectué.");
     if(!r){enqueue(s,"idea",data.id,data);count++;}
    }
    return count;
   })
  },
  backup:async()=>({format:"cap.account",schemaVersion:1,exportedAt:new Date().toISOString(),state:await store.read(owner)}),
  restoreBackup:async backup=>{
   if(backup?.format!=="cap.account"||backup.schemaVersion!==1||backup.state?.owner!==owner||!backup.state.records)throw Error("Sauvegarde incompatible ou compte différent.");
   const records=Object.values(backup.state.records).map(r=>{
    if(r.kind!=="task"&&r.kind!=="idea")throw Error("Objet invalide.");
    const data=cleanData(r.kind,r.data);
    if(data.id!==r.id||typeof r.deleted!=="boolean")throw Error("Objet invalide.");
    return {...r,data};
   });
   return change(s=>{
    let count=0;
    for(const r of records) {
     const existing=s.records[keyOf(r.kind,r.id)];
     if(existing) {
      if(JSON.stringify(existing.data)!==JSON.stringify(r.data)||existing.deleted!==r.deleted)throw Error("Conflit de restauration. Aucun remplacement effectué.");
     }else{enqueue(s,r.kind,r.id,r.data,r.deleted);count++;}
    }
    return count;
   });
  },
  importLegacy:async({tasks,ideas},confirmed)=>{
   if(!confirmed)throw Error("Confirmation de migration requise.");
   const records=[...normalizeTasks(tasks).map(data=>({kind:"task",data})),...ideas.map(raw=>({kind:"idea",data:cleanData("idea",raw)}))];
   return change(s=>{
    let count=0;
    for(const {kind,data} of records){
     const existing=s.records[keyOf(kind,data.id)];
     if(existing&&(existing.deleted||JSON.stringify(existing.data)!==JSON.stringify(data)))throw Error("Versions différentes : exporte les deux variantes avant de migrer.");
     if(!existing){enqueue(s,kind,data.id,data);count++;}
    }
    s.migrations.push({at:new Date().toISOString(),count});
    return count;
   });
  },
  conflicts:async()=>Object.values((await store.read(owner)).records).filter(r=>r.conflict),
  resolve:async(kind,id,choice)=>change(s=>{
   const key=keyOf(kind,id),r=s.records[key];if(!r?.conflict)throw Error("Conflit absent.");
   const remote=r.conflict.remote,local={...r};
   s.queue=s.queue.filter(o=>o.key!==key);
   s.records[key]={kind,id,data:remote?.data||r.data,deleted:remote?.deleted??true,
    serverVersion:remote?.version||0,seq:remote?.seq||0,revision:r.revision+1};
   if(choice==="local")enqueue(s,kind,id,local.data,local.deleted);
   else if(choice==="both") {
    if(local.deleted)throw Error("Une suppression ne peut pas être dupliquée.");
    const duplicate=uid();enqueue(s,kind,duplicate,{...local.data,id:duplicate});
   } else if(choice!=="remote")throw Error("Choix invalide.");
  }),
  close:()=>{active=false;}
 };
}
