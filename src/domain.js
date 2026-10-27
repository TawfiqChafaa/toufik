export const areas = ["Moi","Famille","Maison","Travail","Administratif","Finances","Santé","Autres","Mes ambitions"];
export function dayKey(d) {
 const x=new Date(d);
 return Number.isNaN(x.getTime())?"":x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
}
export const priority=t=>t.urgent&&t.important?"Urgent et important":t.important?"Important":t.urgent?"Urgent, peu important":"À planifier";
export function normalizeTasks(data) {
 if(!Array.isArray(data)||data.length>10000) throw Error("Liste invalide");
 const ids=new Set();
 return data.map(t=>{
  if(!t||typeof t.id!=="string"||!t.id.trim()||ids.has(t.id)||typeof t.title!=="string"||!t.title.trim()||t.title.length>180) throw Error("Tâche invalide ou identifiant dupliqué");
  ids.add(t.id);
  const duration=t.duration===undefined?25:Number(t.duration);
  if(!Number.isFinite(duration)||duration<5||duration>1440) throw Error("Durée invalide");
  const due=t.due||"";
  if(typeof due!=="string"||(due&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(due)||!dayKey(due)))) throw Error("Date invalide");
  for(const key of ["urgent","important","done"]) if(t[key]!==undefined&&typeof t[key]!=="boolean") throw Error("État invalide");
  return {id:t.id,title:t.title.trim(),area:areas.includes(t.area)?t.area:"Autres",due,duration,urgent:!!t.urgent,important:!!t.important,done:!!t.done};
 });
}
export function selectTasks(tasks,filter,now=new Date()) {
 return tasks.filter(t=>filter==="all"||filter==="done"&&t.done||filter==="urgent"&&!t.done&&t.urgent&&t.important||filter==="important"&&!t.done&&t.important||filter==="today"&&!t.done&&t.due&&dayKey(t.due)===dayKey(now))
 .sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||"9999").localeCompare(b.due||"9999"));
}
