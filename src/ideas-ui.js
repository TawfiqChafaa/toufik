import {IDEA_CATEGORIES,IDEA_STATUSES,filterIdeas,encodeIdeasBackup,decodeIdeasBackup} from "./ideas-domain.js";
import {createIdeasRepository} from "./ideas-repository.js";
const $=id=>document.getElementById(id);
const repo=createIdeasRepository();
let ideas=[], current=null, dirty=false, timer, saving=null, recognition=null;
const fields=["ideaText","ideaCategory","ideaStatus","ideaReview"];
const message=text=>{$("ideasNotice").textContent=text;};
const status=text=>{$("ideaSaveStatus").textContent=text;};
const format=value=>new Date(value).toLocaleString("fr-FR");
for(const [id,options] of [["ideaCategory",IDEA_CATEGORIES],["ideaStatus",IDEA_STATUSES],["ideaFilter",IDEA_STATUSES]]) {
  for(const text of options) {const option=document.createElement("option");option.value=text;option.textContent=text;$(id).append(option);}
}
function snapshot() {
  return {text:$("ideaText").value,category:$("ideaCategory").value,status:$("ideaStatus").value,reviewAt:$("ideaReview").value};
}
function download(data,name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function refresh() {ideas=await repo.list();render();}
function render() {
  $("ideasCount").textContent=ideas.length+" idée"+(ideas.length===1?"":"s");
  const list=$("ideasList");list.replaceChildren();
  const visible=filterIdeas(ideas,$("ideaSearch").value,$("ideaFilter").value);
  if(!visible.length) {const p=document.createElement("p");p.className="muted";p.textContent=ideas.length?"Aucune idée ne correspond à cette recherche.":"Ta prochaine idée commence ici. Appuie sur « + Idée ».";list.append(p);}
  for(const idea of visible) {
    const article=document.createElement("article");article.className="idea-item";
    const meta=document.createElement("div");meta.className="idea-meta";
    for(const text of [idea.status,idea.category]) {const span=document.createElement("span");span.className="pill";span.textContent=text;meta.append(span);}
    const body=document.createElement("p");body.className="idea-preview";body.textContent=idea.text;
    const date=document.createElement("p");date.className="muted small";date.textContent="Créée le "+format(idea.createdAt)+(idea.reviewAt?" · À revoir le "+format(idea.reviewAt):"");
    const actions=document.createElement("div");actions.className="actions";
    const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Ouvrir / modifier";edit.onclick=()=>openEditor(idea);
    const remove=document.createElement("button");remove.type="button";remove.className="danger";remove.textContent="Supprimer l’idée";
    remove.onclick=async()=>{
      if(!confirm("Supprimer définitivement cette idée ? Exporte-la auparavant si tu souhaites la conserver."))return;
      try {await repo.remove(idea.id,idea.version);await refresh();message("Idée supprimée de cet appareil.");}
      catch(error){message(error.message+" Aucune suppression confirmée.");}
    };
    actions.append(edit,remove);article.append(meta,body,date,actions);list.append(article);
  }
}
function openEditor(idea=null) {
  current=idea?{...idea}:null;dirty=false;clearTimeout(timer);
  $("ideaEditorHeading").textContent=idea?"Ton idée":"Une nouvelle idée";
  $("ideaText").value=idea?.text||"";
  $("ideaCategory").value=idea?.category||"Non classée";
  $("ideaStatus").value=idea?.status||"À explorer";
  $("ideaReview").value=idea?.reviewAt||"";
  $("ideaCreated").textContent=idea?"Créée le "+format(idea.createdAt):"";
  $("ideaVoice").textContent="Vérifie toujours le texte dicté. Aucun audio conservé.";
  $("ideaAiStatus").textContent="Assistant IA à venir — aucune discussion ni transmission de données n’est activée.";
  status(idea?"Enregistrée sur cet appareil.":"Commence à écrire : la sauvegarde est automatique.");
  $("ideaDialog").showModal();$("ideaText").focus();
}
async function flush() {
  clearTimeout(timer);
  if(saving) return saving;
  saving=(async()=>{
    while(dirty) {
      const value=snapshot();
      if(!value.text.trim()) {status("Écris une idée avant de l’enregistrer. Le contenu précédemment sauvegardé reste intact.");return false;}
      if(!$("ideaReview").checkValidity()) {status("Vérifie la date avant de continuer.");return false;}
      dirty=false;status("Enregistrement…");
      const now=new Date().toISOString();
      const next={...value,id:current?.id||(globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random()),
        createdAt:current?.createdAt||now,updatedAt:now,version:(current?.version||0)+1};
      try {
        current=await repo.save(next);
        $("ideaCreated").textContent="Créée le "+format(current.createdAt);
        status(dirty?"Enregistrement…":"Enregistrée sur cet appareil.");
        await refresh();
      } catch(error) {
        dirty=true;
        status("Sauvegarde impossible. "+error.message+" Le texte reste ici ; exporte le brouillon avant de quitter.");
        return false;
      }
    }
    return true;
  })();
  try {return await saving;} finally {saving=null;}
}
function changed() {dirty=true;status("Enregistrement en attente…");clearTimeout(timer);timer=setTimeout(()=>{void flush();},350);}
for(const id of fields) {$(id).addEventListener("input",changed);$(id).addEventListener("change",changed);}
$("newIdea").onclick=()=>openEditor();
async function closeEditor() {
  if(!await flush())return;
  if(recognition) recognition.abort();
  $("ideaDialog").close();
}
$("closeIdea").onclick=()=>{void closeEditor();};
$("ideaForm").onsubmit=e=>{e.preventDefault();void closeEditor();};
$("ideaDialog").addEventListener("cancel",e=>{e.preventDefault();void closeEditor();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&dirty)void flush();});
window.addEventListener("beforeunload",e=>{if(dirty||saving){e.preventDefault();e.returnValue="";}});
$("ideaSearch").oninput=render;$("ideaFilter").onchange=render;
$("exportDraft").onclick=()=>{
  // Même en cas d'erreur de stockage : exporter le texte non sauvegardé sans le perdre.
  download({format:"cap.ideas.draft",schemaVersion:1,exportedAt:new Date().toISOString(),idea:{...current,...snapshot()}}, "cap-brouillon-idee.json");
  status("Brouillon exporté. Ce fichier de secours n’est pas une sauvegarde importable : son texte peut être recopié.");
};
$("discussIdea").onclick=()=>{
  $("ideaAiStatus").textContent="Cette fonction n’est pas encore disponible. Ton idée reste privée sur cet appareil ; aucun assistant IA n’est connecté.";
};
$("exportIdeas").onclick=async()=>{
  try {download(encodeIdeasBackup(await repo.list()),"cap-idees.json");message("Export préparé. Conserve ce fichier dans un emplacement personnel protégé.");}
  catch(error){message("Export impossible : "+error.message+" Les données n’ont pas été effacées.");}
};
$("importIdeas").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>5*1024*1024) throw Error("Fichier trop volumineux (5 Mo maximum).");
    const imported=decodeIdeasBackup(JSON.parse(await file.text()));
    if(!confirm("Ajouter les "+imported.length+" idées du fichier ? Les idées identiques sont ignorées. Un conflit annule tout l’import ; aucune idée existante n’est remplacée."))return;
    const added=await repo.merge(imported);await refresh();message(added+" idée(s) ajoutée(s). Les tâches restent inchangées.");
  }catch(error){message("Import impossible : "+error.message);}
  finally {e.target.value="";}
};
$("dictateIdea").onclick=()=>{
  if(recognition){recognition.stop();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){$("ideaVoice").textContent="Dictée indisponible. Utilise le clavier vocal Huawei ou écris ton idée.";return;}
  const session=new Recognition();recognition=session;
  session.lang="fr-FR";session.interimResults=false;
  $("dictateIdea").textContent="Arrêter la dictée";
  $("ideaVoice").textContent="Écoute en cours… Le navigateur peut utiliser un service de reconnaissance distant.";
  session.onresult=e=>{
    if (!$("ideaDialog").open || recognition!==session) return;
    const text=e.results[0][0].transcript;
    $("ideaText").value=($("ideaText").value+($("ideaText").value?" ":"")+text).slice(0,10000);
    changed();$("ideaVoice").textContent="Texte ajouté. Vérifie la transcription ; sauvegarde automatique en cours.";
  };
  session.onerror=()=>{$("ideaVoice").textContent="Dictée interrompue ou microphone refusé. Tu peux continuer par écrit.";};
  session.onend=()=>{if(recognition===session)recognition=null;$("dictateIdea").textContent="Dicter mon idée";};
  try {session.start();} catch {session.onend();$("ideaVoice").textContent="Impossible de démarrer la dictée. Utilise ton clavier vocal.";}
};
refresh().catch(error=>message("Stockage des idées indisponible : "+error.message+" Aucune donnée effacée. La saisie et l’export du brouillon restent disponibles."));
