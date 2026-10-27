import {validateIdea} from "./ideas-domain.js";
export function createIdeasRepository(factory=globalThis.indexedDB) {
  let connection;
  function open() {
    if (!factory) return Promise.reject(Error("Stockage indisponible dans ce navigateur."));
    if (!connection) connection=new Promise((resolve,reject)=>{
      const request=factory.open("cap.ideas",1);
      request.onupgradeneeded=()=>request.result.createObjectStore("ideas",{keyPath:"id"});
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
      request.onerror=()=>{connection=null;reject(request.error);};
      request.onblocked=()=>{connection=null;reject(Error("Ferme les autres onglets CAP puis réessaie."));};
    });
    return connection;
  }
  async function transaction(mode,operation) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("ideas",mode), store=tx.objectStore("ideas");
      let result, failure;
      const fail=error=>{failure=error;tx.abort();};
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(failure||tx.error||Error("Sauvegarde interrompue."));
      tx.onerror=()=>{};
      try {operation(store,value=>{result=value;},fail);} catch(error) {fail(error);}
    });
  }
  return {
    list:()=>transaction("readonly",(store,done,fail)=>{
      store.getAll().onsuccess=e=>{try {done(e.target.result.map(validateIdea));}catch(error){fail(error);}};
    }),
    save:idea=>{
      const clean=validateIdea(idea);
      return transaction("readwrite",(store,done,fail)=>{
        store.get(clean.id).onsuccess=e=>{
          const previous=e.target.result;
          if ((previous && previous.version!==clean.version-1) || (!previous && clean.version!==1)) {
            fail(Error("Cette idée a changé dans un autre onglet. Exporte ton brouillon puis recharge avant de réessayer."));return;
          }
          try {store.put(clean);done(clean);} catch(error) {fail(error);}
        };
      });
    },
    remove:(id,version)=>transaction("readwrite",(store,done,fail)=>{
      store.get(id).onsuccess=e=>{
        if (e.target.result && e.target.result.version!==version) {fail(Error("Idée modifiée ailleurs. Recharge avant de supprimer."));return;}
        store.delete(id);done();
      };
    }),
    merge:ideas=>transaction("readwrite",(store,done,fail)=>{
      const clean=ideas.map(validateIdea);
      let added=0;
      if (!clean.length) {done(0);return;}
      for(const idea of clean) store.get(idea.id).onsuccess=e=>{
        const existing=e.target.result;
        if(existing && JSON.stringify(validateIdea(existing))!==JSON.stringify(idea)) {
          fail(Error("Une idée du fichier diffère de sa version locale. Aucun import effectué. Conserve les deux exports avant de résoudre ce conflit."));return;
        }
        try {if(!existing) {store.put(idea);added++;} done(added);}
        catch(error) {fail(error);}
      };
    })
  };
}
