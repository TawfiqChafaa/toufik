import { normalizeTasks } from "./domain.js";
// Interface de stockage à remplacer par un adaptateur synchronisé lorsque le serveur sera prêt.
export function createTaskRepository(storage) {
 const key="cap.tasks.v1";
 return {
  load:()=>normalizeTasks(JSON.parse(storage.getItem(key)||"[]")),
  save:tasks=>storage.setItem(key,JSON.stringify(normalizeTasks(tasks)))
 };
}
export const taskRepository={
 load:()=>createTaskRepository(window.localStorage).load(),
 save:tasks=>createTaskRepository(window.localStorage).save(tasks)
};
