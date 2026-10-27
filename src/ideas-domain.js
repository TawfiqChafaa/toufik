export const IDEA_STATUSES = ["À explorer", "En cours", "Réalisée", "Archivée"];
export const IDEA_CATEGORIES = ["Non classée", "Moi", "Famille", "Maison", "Travail", "Administratif", "Finances", "Santé", "Autres", "Mes ambitions"];
export function validateIdea(value) {
  if (!value || typeof value.id !== "string" || !value.id || value.id.length > 200 ||
      typeof value.text !== "string" || !value.text.trim() || value.text.length > 10000 ||
      !IDEA_STATUSES.includes(value.status) || !IDEA_CATEGORIES.includes(value.category) ||
      !Number.isInteger(value.version) || value.version < 1) throw Error("Idée invalide.");
  for (const key of ["createdAt", "updatedAt"]) {
    if (typeof value[key] !== "string" || !/^\d{4}-\d\d-\d\dT/.test(value[key]) || !Number.isFinite(Date.parse(value[key]))) throw Error("Date de création invalide.");
  }
  if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) throw Error("Dates incohérentes.");
  const reviewAt = value.reviewAt;
  if (typeof reviewAt !== "string" || (reviewAt && !validReviewDate(reviewAt))) throw Error("Date de révision invalide.");
  return {id:value.id, text:value.text, category:value.category, status:value.status,
    reviewAt, createdAt:value.createdAt, updatedAt:value.updatedAt, version:value.version};
}
export function validReviewDate(value) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return false;
  const [date,time] = value.split("T");
  const [y,m,d] = date.split("-").map(Number);
  const [h,min] = time.split(":").map(Number);
  const max = new Date(Date.UTC(y,m,0)).getUTCDate();
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= max && h < 24 && min < 60;
}
export function decodeIdeasBackup(data) {
  if (!data || data.format !== "cap.ideas" || data.schemaVersion !== 1 || !Array.isArray(data.ideas) || data.ideas.length > 10000) throw Error("Sauvegarde d’idées incompatible.");
  const ideas = data.ideas.map(validateIdea);
  if (new Set(ideas.map(i=>i.id)).size !== ideas.length) throw Error("Identifiants dupliqués.");
  return ideas;
}
export const encodeIdeasBackup = ideas => ({
  format:"cap.ideas", schemaVersion:1, exportedAt:new Date().toISOString(), ideas:ideas.map(validateIdea)
});
export function filterIdeas(ideas, query="", status="") {
  const fold = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
  return ideas.filter(i=>(!status || i.status===status) && fold(i.text+" "+i.category).includes(fold(query.trim())))
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
