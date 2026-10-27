import {createAccountStore} from "./local-store.js";
import {createSyncWorkspace} from "./sync.js";
const CONFIG_KEY="cap.cloud.config.v1";
const LAST_OWNER="cap.cloud.last-owner.v1";
let provider,workspace,initialization,recovery=false,stop=()=>{};
export const passwordRecoveryPending=()=>recovery;
export const getCloudConfig=()=>JSON.parse(localStorage.getItem(CONFIG_KEY)||"null");
export async function configureCloud(config) {
 // Chargement du SDK seulement après action explicite ou activation préalable.
 const {validateConfig}=await import("../../dist/supabase.js");
 const clean=validateConfig(config);localStorage.removeItem(LAST_OWNER);localStorage.setItem(CONFIG_KEY,JSON.stringify(clean));
}
export async function initializeCloud() {
 if(initialization)return initialization;
 initialization=(async()=>{
  const config=getCloudConfig();if(!config)return null;
  const {createSupabase}=await import("../../dist/supabase.js");
  provider=createSupabase(config);
  provider.auth.onAuthStateChange(event=>{
   if(event==="PASSWORD_RECOVERY"){recovery=true;window.dispatchEvent(new Event("cap:password-recovery"));}
  });
  let user;
  if(navigator.onLine===false) {
   user=JSON.parse(localStorage.getItem(LAST_OWNER)||"null");
  } else {
   const {data,error}=await provider.auth.getSession();
   if(error)throw error;
   user=data.session?.user;
   if(user)localStorage.setItem(LAST_OWNER,JSON.stringify({id:user.id,email:user.email}));
   else localStorage.removeItem(LAST_OWNER);
  }
  if(user) {
   workspace=createSyncWorkspace({owner:user.id,store:createAccountStore(),remote:provider.remote,
    onChange:()=>window.dispatchEvent(new Event("cap:cloud-change")),
    onStatus:status=>{
     window.dispatchEvent(new CustomEvent("cap:cloud-status",{detail:status}));
     if(status.startsWith("Enregistré"))setTimeout(()=>void run(),0);
    }
   });
   workspace.accountEmail=user.email;
   let delay=15000,timer,stopped=false;
   const run=async()=>{
    if(stopped)return;
    clearTimeout(timer);
    if(navigator.onLine===false){
     window.dispatchEvent(new CustomEvent("cap:cloud-status",{detail:"Hors connexion · compte local conservé"}));
     timer=setTimeout(run,10000);return;
    }
    provider.auth.startAutoRefresh();
    try {await workspace.sync();delay=15000;}catch{delay=Math.min(delay*2,120000);}
    if(!stopped)timer=setTimeout(run,delay);
   };
   const wake=()=>{if(!document.hidden)void run();};
   window.addEventListener("online",wake);document.addEventListener("visibilitychange",wake);
   stop=()=>{stopped=true;clearTimeout(timer);window.removeEventListener("online",wake);document.removeEventListener("visibilitychange",wake);workspace.close();provider.auth.stopAutoRefresh();};
   // Vérifier tout changement de compte, y compris dans un autre onglet.
   provider.auth.onAuthStateChange((event,session)=>{
    if((!session&&event==="SIGNED_OUT")||(session&&session.user.id!==user.id)){
     localStorage.removeItem(LAST_OWNER);
     stop();document.body.replaceChildren(Object.assign(document.createElement("p"),{textContent:"Session changée. Recharge CAP pour continuer."}));
    }
   });
   // Ne pas empêcher l'usage local si le serveur est indisponible.
   setTimeout(()=>void run(),0);
  }
  return workspace||null;
 })();
 return initialization;
}
export const cloudProvider=()=>provider;
export const activeWorkspace=()=>workspace;
export async function disconnect({allowPending=false}={}) {
 if(!provider)return;
 if(workspace) {
  const backup=await workspace.backup();
  if(backup.state.queue.length&&!allowPending)throw Error("Des changements ne sont pas envoyés. Exporte le compte avant de te déconnecter.");
 }
 // Déconnexion locale explicite, même si le service est indisponible.
 stop();localStorage.removeItem(LAST_OWNER);await provider.auth.signOut({scope:"local"});location.reload();
}
