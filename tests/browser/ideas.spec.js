import {test,expect} from "@playwright/test";
async function create(page,text) {
 await page.getByRole("button",{name:"+ Idée",exact:true}).click();
 await page.getByLabel("Ton idée",{exact:true}).fill(text);
 await expect(page.locator("#ideaSaveStatus")).toHaveText("Enregistrée sur cet appareil.");
}
async function saved(page) {
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open("cap.ideas",1);
  req.onsuccess=()=>{const db=req.result;const tx=db.transaction("ideas");const r=tx.objectStore("ideas").getAll();r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);};
  req.onerror=()=>reject(req.error);
 }));
}
test("capture, édition, classement, recherche, date et conservation des tâches",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/");
 await page.locator("#title").fill("Tâche à conserver");await page.getByRole("button",{name:"Ajouter la tâche",exact:true}).click();
 await create(page,"Un atelier éco-responsable");
 const before=(await saved(page))[0];
 await page.locator("#ideaCategory").selectOption("Travail");await page.locator("#ideaStatus").selectOption("En cours");
 await page.locator("#ideaReview").fill("2026-12-10T10:30");
 await page.getByRole("button",{name:"Terminer",exact:true}).click();
 await expect(page.locator("#ideaDialog")).not.toBeVisible();await page.reload();
 await expect(page.locator(".idea-item")).toContainText("Un atelier éco-responsable");await expect(page.locator(".task")).toContainText("Tâche à conserver");
 await expect(page.locator(".idea-item")).toContainText("À revoir le");
 await page.locator("#ideaSearch").fill("ECO");await expect(page.locator(".idea-item")).toHaveCount(1);
 await page.locator("#ideaFilter").selectOption("Archivée");await expect(page.locator(".idea-item")).toHaveCount(0);
 await page.locator("#ideaFilter").selectOption("En cours");
 await page.getByRole("button",{name:"Ouvrir / modifier"}).click();
 await page.locator("#ideaText").fill("Atelier durable modifié");
 await page.getByRole("button",{name:"Discuter de cette idée"}).click();
 await expect(page.locator("#ideaAiStatus")).toContainText("aucun assistant IA");
 await page.getByRole("button",{name:"Terminer",exact:true}).click();
 const after=await saved(page);expect(after).toHaveLength(1);expect(after[0].id).toBe(before.id);expect(after[0].createdAt).toBe(before.createdAt);
 expect(after[0].text).toBe("Atelier durable modifié");expect(after[0].status).toBe("En cours");
 await page.locator("#ideaSearch").fill("");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:"test-results/idees-"+test.info().project.name+".png",fullPage:true});
 expect(errors).toEqual([]);
});
test("fermer immédiatement sauvegarde et une saisie vide ne crée rien",async({page})=>{
 await page.goto("/");await page.locator("#newIdea").click();await page.locator("#ideaText").fill("Idée éclair");await page.locator("#closeIdea").click();
 // Le clic lance une transaction asynchrone ; attendre sa confirmation par la fermeture.
 await expect(page.locator("#ideaDialog")).not.toBeVisible();
 await page.reload();await expect(page.locator(".idea-item")).toContainText("Idée éclair");
 await page.locator("#newIdea").click();await page.keyboard.press("Escape");await expect(page.locator("#ideaDialog")).not.toBeVisible();
 expect(await saved(page)).toHaveLength(1);
});
test("export, suppression confirmée, import répété et refus de fichiers invalides",async({page})=>{
 await page.goto("/");await create(page,"Idée à exporter");await page.locator("#closeIdea").click();
 const wait=page.waitForEvent("download");await page.locator("#exportIdeas").click();const download=await wait;expect(download.suggestedFilename()).toBe("cap-idees.json");
 const path=await download.path();
 page.once("dialog",d=>d.dismiss());await page.getByRole("button",{name:"Supprimer l’idée",exact:true}).click();await expect(page.locator(".idea-item")).toHaveCount(1);
 page.on("dialog",d=>d.accept());await page.getByRole("button",{name:"Supprimer l’idée",exact:true}).click();await expect(page.locator(".idea-item")).toHaveCount(0);
 for(let i=0;i<2;i++){await page.locator("#importIdeas").setInputFiles(path);await expect(page.locator("#ideasNotice")).toContainText("idée(s) ajoutée(s)");await expect(page.locator(".idea-item")).toHaveCount(1);}
 await page.locator("#importIdeas").setInputFiles({name:"faux.json",mimeType:"application/json",buffer:Buffer.from('{"format":"cap.ideas","schemaVersion":1,"ideas":[null]}')});
 await expect(page.locator("#ideasNotice")).toContainText("Import impossible");expect(await saved(page)).toHaveLength(1);
});
test("un import en conflit est entièrement annulé",async({page})=>{
 await page.goto("/");await create(page,"Original");await page.locator("#closeIdea").click();const [idea]=await saved(page);
 const data={format:"cap.ideas",schemaVersion:1,ideas:[{...idea,id:"nouvelle",text:"Ne doit pas être ajoutée"},{...idea,text:"Conflit"}]};
 page.on("dialog",d=>d.accept());
 await page.locator("#importIdeas").setInputFiles({name:"conflit.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(data))});
 await expect(page.locator("#ideasNotice")).toContainText("Aucun import effectué");expect((await saved(page)).map(i=>i.text)).toEqual(["Original"]);
});
test("dictée simulée, repli et microphone refusé",async({page})=>{
 await page.addInitScript(()=>{window.SpeechRecognition=class {start(){this.onresult({results:[[{transcript:"Mon idée dictée"}]]});this.onend();}};});
 await page.goto("/");await page.locator("#newIdea").click();await page.locator("#dictateIdea").click();
 await expect(page.locator("#ideaText")).toHaveValue("Mon idée dictée");await expect(page.locator("#ideaSaveStatus")).toHaveText("Enregistrée sur cet appareil.");
 await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await page.locator("#dictateIdea").click();
 await expect(page.locator("#ideaVoice")).toContainText("clavier vocal Huawei");
 await page.evaluate(()=>{window.SpeechRecognition=class {start(){this.onerror();this.onend();}};});await page.locator("#dictateIdea").click();
 await expect(page.locator("#ideaVoice")).toContainText("microphone refusé");
});
test("un stockage indisponible ne prétend pas avoir sauvegardé",async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,"indexedDB",{value:undefined});});
 await page.goto("/");await expect(page.locator("#ideasNotice")).toContainText("indisponible");
 await page.locator("#newIdea").click();await page.locator("#ideaText").fill("Texte à protéger");
 await expect(page.locator("#ideaSaveStatus")).toContainText("Sauvegarde impossible");
 await page.locator("#closeIdea").click();await expect(page.locator("#ideaDialog")).toBeVisible();
 const wait=page.waitForEvent("download");await page.locator("#exportDraft").click();expect((await wait).suggestedFilename()).toBe("cap-brouillon-idee.json");
 await expect(page.locator("#ideaText")).toHaveValue("Texte à protéger");
});
test("deux onglets ne s'écrasent pas silencieusement",async({page,context})=>{
 await page.goto("/");await create(page,"Version initiale");await page.locator("#closeIdea").click();
 const other=await context.newPage();await other.goto("/");
 await page.getByRole("button",{name:"Ouvrir / modifier"}).click();await other.getByRole("button",{name:"Ouvrir / modifier"}).click();
 await page.locator("#ideaText").fill("Version onglet A");await expect(page.locator("#ideaSaveStatus")).toHaveText("Enregistrée sur cet appareil.");
 await other.locator("#ideaText").fill("Version onglet B");await expect(other.locator("#ideaSaveStatus")).toContainText("autre onglet");
 expect((await saved(page))[0].text).toBe("Version onglet A");await expect(other.locator("#ideaText")).toHaveValue("Version onglet B");
});
test("quota plein : échec explicite et texte conservé sans fausse sauvegarde",async({page})=>{
 await page.addInitScript(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException("Quota plein","QuotaExceededError");};});
 await page.goto("/");await page.locator("#newIdea").click();await page.locator("#ideaText").fill("Brouillon même sans place");
 await expect(page.locator("#ideaSaveStatus")).toContainText("Sauvegarde impossible");
 await expect(page.locator("#ideaSaveStatus")).toContainText("Quota plein");
 expect(await saved(page)).toHaveLength(0);
 await expect(page.locator("#ideaText")).toHaveValue("Brouillon même sans place");
});
test("texte HTML affiché sans exécution et date de révision sauvegardée",async({page})=>{
 await page.goto("/");await create(page,'<img src=x onerror="window.injection=true"> Idée');
 await page.locator("#ideaReview").fill("2028-02-29T09:15");await page.locator("#closeIdea").click();
 await expect(page.locator(".idea-item")).toContainText("<img");expect(await page.evaluate(()=>window.injection)).toBeUndefined();
 expect((await saved(page))[0].reviewAt).toBe("2028-02-29T09:15");
});
