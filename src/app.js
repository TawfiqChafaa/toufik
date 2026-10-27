
import { normalizeTasks, dayKey, priority, selectTasks } from "./domain.js";
import { taskRepository } from "./repository.js";
let tasks=[];let filter="all";let unreadableStorage=false;
const $=id=>document.getElementById(id);
try { tasks=taskRepository.load(); } catch { unreadableStorage=true; $("notice").textContent="Impossible de lire les données enregistrées. Elles n’ont pas été effacées. Tu peux importer une sauvegarde JSON."; }
const today=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
function commit(next,replaceCorrupt=false) {
 if(unreadableStorage&&!replaceCorrupt) { $("notice").textContent="Les données existantes sont illisibles. Exporte-les avant de les remplacer par un import valide."; render(); return false; }
 try { taskRepository.save(next); tasks=next; unreadableStorage=false; $("notice").textContent="Modifications enregistrées sur cet appareil."; render(); return true; }
 catch { $("notice").textContent="Sauvegarde impossible : stockage bloqué ou plein. Tes modifications n’ont pas été enregistrées. Exporte une sauvegarde avant de continuer."; render(); return false; }
}
function render(){
 $("date").textContent=today();
 const pending=tasks.filter(t=>!t.done);const completed=tasks.length-pending.length;
 $("progressText").textContent=completed+" tâche(s) terminée(s) sur "+tasks.length;
 $("progress").value=tasks.length?Math.round(completed/tasks.length*100):0;
 const top=pending.find(t=>t.urgent&&t.important)||pending.find(t=>t.important)||pending[0];
 $("coach").textContent=top?"Tu peux avancer maintenant : « "+top.title+" ». Commence par 5 minutes, puis continue si tu peux.":"Bravo ! Ajoute une tâche importante pour avancer sur tes objectifs.";
 document.querySelectorAll("[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.filter===filter)));
 const list=selectTasks(tasks,filter);
 $("tasks").replaceChildren();
 if(!list.length){const p=document.createElement("p");p.className="muted";p.textContent="Aucune tâche dans cette catégorie."; $("tasks").append(p)}
 for(const t of list){
  const row=document.createElement("div");row.className="task"+(t.done?" done":"");
  const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!t.done;cb.setAttribute("aria-label","Terminer "+t.title);cb.addEventListener("change",()=>{commit(tasks.map(x=>x.id===t.id?{...x,done:cb.checked}:x))});
  const detail=document.createElement("div");detail.className="details";const strong=document.createElement("strong");strong.textContent=t.title;const meta=document.createElement("div");meta.className="muted";meta.textContent=t.area+" · "+priority(t)+(t.due?" · "+new Date(t.due).toLocaleString("fr-FR"):"")+" · "+t.duration+" min";detail.append(strong,meta);
  const del=document.createElement("button");del.className="danger";del.textContent="Supprimer";del.addEventListener("click",()=>{if(confirm("Supprimer cette tâche ?")){commit(tasks.filter(x=>x.id!==t.id))}});
  row.append(cb,detail,del);$("tasks").append(row);
 }
}
$("taskForm").addEventListener("submit",e=>{e.preventDefault();const title=$("title").value.trim();if(!title)return;const next=[...tasks,{id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),title,area:$("area").value,due:$("due").value,urgent:$("urgent").checked,important:$("important").checked,duration:Number($("duration").value)||25,done:false}];if(!commit(next))return;$("taskForm").reset();$("title").focus()});
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;render()}));
$("voice").addEventListener("click",()=>{const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){$("voiceStatus").textContent="Dictée indisponible dans ce navigateur. Utilise le clavier vocal Huawei ou la saisie écrite.";return}const r=new Recognition();r.lang="fr-FR";r.interimResults=false;$("voiceStatus").textContent="Écoute en cours…";r.onresult=e=>{$("title").value=e.results[0][0].transcript;$("voiceStatus").textContent="Vérifie le texte, la date et la priorité avant d'ajouter la tâche."};r.onerror=()=>{$("voiceStatus").textContent="La dictée a échoué ou l'accès au microphone a été refusé."};try { r.start(); } catch { $("voiceStatus").textContent="Impossible de démarrer la dictée. Utilise le clavier vocal ou réessaie."; }});
$("export").addEventListener("click",()=>{const blob=new Blob([unreadableStorage?localStorage.getItem("cap.tasks.v1"):JSON.stringify(tasks,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cap-taches.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error("Fichier trop volumineux");const data=JSON.parse(await file.text());const validated=normalizeTasks(data);if(!confirm("Remplacer les tâches actuelles par celles du fichier ?"))return;commit(validated,true);}catch{alert("Fichier invalide.")}e.target.value=""});
render();
