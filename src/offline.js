const message=document.getElementById("offlineStatus");
function update(){message.hidden=navigator.onLine;message.textContent="Hors connexion · travaille localement et attends la confirmation d’enregistrement.";}
window.addEventListener("online",update);window.addEventListener("offline",update);update();
if("serviceWorker" in navigator && window.isSecureContext) {
 navigator.serviceWorker.register("./sw.js").catch(()=>{
  message.hidden=false;message.textContent="Chargement hors ligne non préparé. Les sauvegardes locales restent disponibles tant que CAP est ouvert.";
 });
}
