// Transaction atomique par espace utilisateur ; aucun accès aux anciennes bases.
export function createAccountStore(factory=globalThis.indexedDB) {
 let connection;
 const open=()=>connection ||= new Promise((resolve,reject)=>{
  const r=factory.open("cap.accounts.v1",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("accounts",{keyPath:"owner"});
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>{connection=null;reject(r.error);};
  r.onblocked=()=>reject(Error("Ferme les autres onglets CAP pour ouvrir le stockage."));
 });
 async function mutate(owner,fn,readonly=false) {
  if(!owner)throw Error("Compte requis.");
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction("accounts",readonly?"readonly":"readwrite"),store=tx.objectStore("accounts");
   let result,failure;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure||tx.error||Error("Transaction interrompue."));
   tx.onerror=()=>{};
   store.get(owner).onsuccess=e=>{
    try {
     const state=e.target.result||{owner,cursor:0,records:{},queue:[],migrations:[]};
     result=fn(state);
     if(!readonly)store.put(state);
    }catch(error){failure=error;tx.abort();}
   };
  });
 }
 return {read:owner=>mutate(owner,s=>s,true),update:mutate};
}
