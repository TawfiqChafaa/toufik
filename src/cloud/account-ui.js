import {initializeCloud,cloudProvider,activeWorkspace,configureCloud,disconnect,getCloudConfig,passwordRecoveryPending} from "./runtime.js";
import {createIdeasRepository} from "../ideas-repository.js";
import {normalizeTasks} from "../domain.js";
import {encodeIdeasBackup,decodeIdeasBackup} from "../ideas-domain.js";
const $=id=>document.getElementById(id);
const message=text=>{$("accountNotice").textContent=text;};
const download=(data,name)=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$("accountOpen").onclick=()=>{$("accountDialog").showModal();};
$("accountClose").onclick=()=>{$("accountDialog").close();};
window.addEventListener("cap:cloud-status",e=>{$("syncStatus").textContent=e.detail;});
async function update() {
 const ws=activeWorkspace(),configured=getCloudConfig();
 $("cloudConfigPanel").hidden=!!ws;
 if(configured&&!ws){$("supabaseUrl").value=configured.url;$("supabasePublicKey").value=configured.publishableKey;}
 $("authPanel").hidden=!configured||!!ws;
 $("signedPanel").hidden=!ws;
 $("storageExplanation").textContent=ws?"Données de ce compte : enregistrées sur cet appareil et synchronisées lorsque le service est disponible. Exporte régulièrement une sauvegarde.":"Sans compte : les données restent dans le navigateur de cet appareil et ne sont pas synchronisées entre téléphones.";
 $("ideasExplanation").textContent=ws?"Idées de ce compte. La date de révision ne déclenche aucune notification. Vérifie l’état de synchronisation et conserve des exports.":"Idées sur cet appareil uniquement. Exporte-les régulièrement ; effacer les données du navigateur peut les supprimer. Aucune notification automatique.";
 $("syncStatus").textContent=ws?"Compte connecté · vérification en cours":configured?"Compte non connecté · données locales":"Mode local · aucun service connecté";
 if(ws) {
  $("connectedUser").textContent="Compte : "+(ws.accountEmail||ws.owner);
  await showConflicts();
 }
}
async function showConflicts() {
 const ws=activeWorkspace();if(!ws)return;
 const list=$("cloudConflicts");list.replaceChildren();
 for(const record of await ws.conflicts()) {
  const div=document.createElement("div");div.className="coach";
  const title=document.createElement("p");title.textContent="Conflit : "+(record.data.title||record.data.text);
  const local=document.createElement("pre");local.textContent="Cet appareil : "+JSON.stringify({data:record.data,deleted:record.deleted},null,2);
  const remote=document.createElement("pre");remote.textContent="Autre appareil : "+JSON.stringify(record.conflict.remote,null,2);
  div.append(title,local,remote);
  for(const [choice,label] of [["local","Garder cette version"],["remote","Garder la version distante"],["both","Conserver les deux"]]) {
   if(choice==="both"&&record.deleted)continue;
   const b=document.createElement("button");b.type="button";b.textContent=label;b.className="secondary";
   b.onclick=async()=>{
    if(!confirm("Confirmer ce choix ? Exporte le compte avant de remplacer une variante."))return;
    try{await ws.resolve(record.kind,record.id,choice);await showConflicts();await ws.sync();}catch{message("Résolution non terminée. Tes données locales restent disponibles.");}
   };div.append(b);
  }
  list.append(div);
 }
}
$("cloudConfigForm").onsubmit=async e=>{
 e.preventDefault();
 if(!confirm("Activer la connexion à TON projet Supabase ? Les tâches et idées locales ne seront pas envoyées sans migration confirmée."))return;
 try {
  await configureCloud({url:$("supabaseUrl").value.trim(),publishableKey:$("supabasePublicKey").value.trim()});
  location.reload();
 }catch(error){message(error.message);}
};
$("authForm").onsubmit=async e=>{
 e.preventDefault();
 try {
  const {error}=await cloudProvider().auth.signInWithPassword({email:$("accountEmail").value.trim(),password:$("accountPassword").value});
  $("accountPassword").value="";
  if(error)throw error;
  location.reload();
 }catch{message("Connexion impossible. Vérifie tes identifiants et ta connexion.");}
};
$("registerAccount").onclick=async()=>{
 if(!$("authForm").reportValidity())return;
 try{
  const {error}=await cloudProvider().auth.signUp({email:$("accountEmail").value.trim(),password:$("accountPassword").value,
   options:{emailRedirectTo:location.origin+location.pathname}});
  $("accountPassword").value="";if(error)throw error;
  message("Si l’inscription est possible, consulte ton e-mail pour confirmer ton adresse, puis connecte-toi.");
 }catch{message("Inscription non terminée. Vérifie la configuration des e-mails et réessaie plus tard.");}
};
$("resetPassword").onclick=async()=>{
 const email=$("accountEmail");if(!email.reportValidity())return;
 try{await cloudProvider().auth.resetPasswordForEmail(email.value.trim(),{redirectTo:location.origin+location.pathname});
 message("Si cette adresse est associée à un compte, un e-mail de récupération sera envoyé.");}
 catch{message("Demande non terminée. Réessaie lorsque le service est disponible.");}
};
$("newPasswordForm").onsubmit=async e=>{
 e.preventDefault();
 try {
  const {error}=await cloudProvider().auth.updateUser({password:$("newPassword").value});
  $("newPassword").value="";if(error)throw error;
  $("newPasswordForm").hidden=true;message("Mot de passe mis à jour.");
 }catch{message("Modification impossible. Demande un nouveau lien de récupération.");}
};
$("syncNow").onclick=async()=>{
 try{await activeWorkspace().sync();await showConflicts();}catch{message("Synchronisation non terminée. Aucun changement local effacé.");}
};
$("exportAccount").onclick=async()=>{
 try{download(await activeWorkspace().backup(),"cap-compte-sauvegarde.json");message("Sauvegarde de compte exportée, sans mot de passe ni jeton. Conserve-la en privé.");}
 catch{message("Impossible d’exporter le compte. Ne ferme pas CAP avant résolution.");}
};
$("migrateLocal").onclick=async()=>{
 try {
  const tasks=normalizeTasks(JSON.parse(localStorage.getItem("cap.tasks.v1")||"[]"));
  const ideas=await createIdeasRepository().list();
  if(!confirm("Migrer "+tasks.length+" tâche(s) et "+ideas.length+" idée(s) vers CE compte ? Une sauvegarde locale sera téléchargée d’abord. Les originaux seront conservés."))return;
  download({format:"cap.migration.sources",schemaVersion:1,tasks,ideas:encodeIdeasBackup(ideas)}, "cap-avant-migration.json");
  const added=await activeWorkspace().importLegacy({tasks,ideas},true);
  message(added+" élément(s) ajouté(s) au compte local. Vérification distante et essai sur un second appareil encore nécessaires.");
  await activeWorkspace().sync();
 }catch(error){message("Migration non terminée : "+error.message+" Les sources originales restent intactes.");}
};
$("restoreAccount").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try {
  if(file.size>10*1024*1024)throw Error("Sauvegarde trop volumineuse.");
  const backup=JSON.parse(await file.text());
  if(!confirm("Restaurer dans CE compte sans remplacer les éléments existants ? Tout conflit annule la restauration."))return;
  const count=backup.format==="cap.migration.sources"&&backup.schemaVersion===1
   ? await activeWorkspace().importLegacy({tasks:backup.tasks,ideas:decodeIdeasBackup(backup.ideas)},true)
   : await activeWorkspace().restoreBackup(backup);
  message(count+" élément(s) restauré(s) localement. Lance la synchronisation puis vérifie sur un autre appareil.");
 }catch(error){message("Restauration non terminée : "+error.message);}
 finally{e.target.value="";}
};
$("signOut").onclick=async()=>{
 if(!confirm("Se déconnecter ? Les copies locales de ce compte seront masquées, pas effacées. Utilise un appareil personnel protégé."))return;
 try{
  const ws=activeWorkspace(),backup=ws?await ws.backup():null;
  const pending=backup?.state.queue.length||0;
  if(pending){
   download(backup,"cap-compte-avant-deconnexion.json");
   if(!confirm("Il reste "+pending+" changement(s) non envoyé(s). Une sauvegarde vient d’être téléchargée. Après vérification du fichier, confirmer la déconnexion ? La file restera liée à ce compte sur cet appareil."))return;
  }
  await disconnect({allowPending:!!pending});
 }catch(error){message(error.message);}
};
try {
 await initializeCloud();await update();
 const recover=()=>{
  $("newPasswordForm").hidden=false;
  if(!$("accountDialog").open)$("accountDialog").showModal();
 };
 if(passwordRecoveryPending())recover();
 window.addEventListener("cap:password-recovery",recover);
}catch{message("Configuration ou session illisible. Aucun envoi de tâches ou d’idées. Les stockages historiques n’ont pas été effacés.");}
window.addEventListener("cap:cloud-change",()=>void showConflicts());
