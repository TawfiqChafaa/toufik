import {test,expect} from "@playwright/test";
import {randomUUID} from "node:crypto";
function mockSupabase(){
 const user={id:"11111111-1111-4111-8111-111111111111",email:"pilote@example.test",aud:"authenticated",role:"authenticated",email_confirmed_at:new Date().toISOString(),app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:new Date().toISOString()};
 const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
 const token=b64({alg:"HS256",typ:"JWT"})+"."+b64({sub:user.id,role:"authenticated",exp:Math.floor(Date.now()/1000)+3600})+".signature-fictive";
 const records=new Map(),ops=new Map(),changes=[];
 const server={available:true,records,changes};
 server.route=async context=>context.route("https://cap-test.supabase.co/**",async route=>{
  const url=new URL(route.request().url());
  const send=(data,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
  if(!server.available)return send({message:"Simulation locale de coupure"},503);
  if(url.pathname==="/auth/v1/token")return send({access_token:token,refresh_token:randomUUID(),token_type:"bearer",expires_in:3600,user});
  if(url.pathname==="/auth/v1/user")return send(user);
  if(url.pathname==="/auth/v1/logout")return send({});
  if(url.pathname==="/rest/v1/rpc/cap_apply"){
   const op=route.request().postDataJSON();
   if(ops.has(op.p_operation))return send(ops.get(op.p_operation));
   const key=JSON.stringify([op.p_kind,op.p_id]),old=records.get(key);
   if((old?.version||0)!==op.p_expected)return send({conflict:true,record:old||null});
   const record={kind:op.p_kind,id:op.p_id,data:op.p_data,deleted:op.p_deleted,version:op.p_expected+1,seq:changes.length+1};
   records.set(key,record);changes.push({seq:record.seq,record});
   const result={conflict:false,record};ops.set(op.p_operation,result);return send(result);
  }
  if(url.pathname==="/rest/v1/cap_changes"){
   const cursor=Number((url.searchParams.get("seq")||"gt.0").slice(3));
   return send(changes.filter(c=>c.seq>cursor).slice(0,100));
  }
  return send({message:"Route non simulée"},400);
 });
 return server;
}
async function login(page){
 await page.goto("/");
 await page.locator("#accountOpen").click();
 await page.locator("#supabaseUrl").fill("https://cap-test.supabase.co");
 await page.locator("#supabasePublicKey").fill("sb_publishable_CLE_FICTIVE_TEST");
 page.once("dialog",d=>d.accept());
 await page.locator("#cloudConfigForm button").click();
 await expect(page.locator("#syncStatus")).toContainText("Compte non connecté");
 await page.locator("#accountOpen").click();
 await page.locator("#accountEmail").fill("pilote@example.test");
 await page.locator("#accountPassword").fill(randomUUID());
 await page.getByRole("button",{name:"Se connecter",exact:true}).click();
 await expect(page.locator("#syncStatus")).toHaveText("Synchronisé");
}
async function sync(page){
 await page.locator("#accountOpen").click();await page.locator("#syncNow").click();
 await expect(page.locator("#syncStatus")).toHaveText("Synchronisé");
 await page.locator("#accountClose").click();
}
test("mode local : aucune requête Supabase et le panneau explique l'activation",async({page})=>{
 const external=[];page.on("request",req=>{if(new URL(req.url()).origin!=="http://127.0.0.1:8000")external.push(req.url());});
 await page.goto("/");await page.locator("#accountOpen").click();
 await expect(page.locator("#accountNotice")).toContainText("désactivée");
 await expect(page.locator("#cloudConfigPanel")).toBeVisible();
 expect(external).toEqual([]);
});
test("l'application et les idées se rouvrent hors ligne après préparation du cache",async({page,context})=>{
 await page.goto("/");
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);await page.reload();
 await expect(page.locator("#offlineStatus")).toContainText("Hors connexion");
 await page.locator("#newIdea").click();await page.locator("#ideaText").fill("Mon idée sans réseau");await page.locator("#closeIdea").click();
 await expect(page.locator("#ideaDialog")).not.toBeVisible();
 await page.reload();await expect(page.locator(".idea-item")).toContainText("Mon idée sans réseau");
});
test("SDK réel avec serveur entièrement simulé : migration, sauvegarde et second appareil",async({page,context,browser})=>{
 const server=mockSupabase();await server.route(context);
 await page.goto("/");await page.locator("#title").fill("Tâche historique");await page.getByRole("button",{name:"Ajouter la tâche",exact:true}).click();
 await page.locator("#newIdea").click();await page.locator("#ideaText").fill("Idée historique");await page.locator("#closeIdea").click();await expect(page.locator("#ideaDialog")).not.toBeVisible();
 const original=await page.evaluate(()=>localStorage.getItem("cap.tasks.v1"));
 await login(page);await expect(page.locator(".task")).toHaveCount(0);await expect(page.locator(".idea-item")).toHaveCount(0);
 await page.locator("#accountOpen").click();page.once("dialog",d=>d.accept());
 const download=page.waitForEvent("download");await page.locator("#migrateLocal").click();
 const sources=await download;
 expect(sources.suggestedFilename()).toBe("cap-avant-migration.json");
 await expect(page.locator("#syncStatus")).toHaveText("Synchronisé");
 await page.locator("#accountClose").click();
 await expect(page.locator(".task")).toContainText("Tâche historique");await expect(page.locator(".idea-item")).toContainText("Idée historique");
 expect(await page.evaluate(()=>localStorage.getItem("cap.tasks.v1"))).toBe(original);
 const secondContext=await browser.newContext();await server.route(secondContext);const second=await secondContext.newPage();await login(second);
 await expect(second.locator(".task")).toContainText("Tâche historique");await expect(second.locator(".idea-item")).toContainText("Idée historique");
 await context.setOffline(true);await page.reload();
 await expect(page.locator("#offlineStatus")).toContainText("Hors connexion");
 await expect(page.locator(".task")).toContainText("Tâche historique");
 server.available=false;
 await page.locator("#title").fill("Travail hors connexion");await page.getByRole("button",{name:"Ajouter la tâche",exact:true}).click();
 await expect(page.locator(".task")).toHaveCount(2);
 await page.locator("#accountOpen").click();await page.locator("#syncNow").click();
 await expect(page.locator("#syncStatus")).toContainText("Hors connexion");
 await context.setOffline(false);
 server.available=true;await page.locator("#syncNow").click();await expect(page.locator("#syncStatus")).toHaveText("Synchronisé");await page.locator("#accountClose").click();
 await sync(second);await expect(second.locator(".task").filter({hasText:"Travail hors connexion"})).toHaveCount(1);
 await page.locator("#accountOpen").click();
 const backup=page.waitForEvent("download");await page.locator("#exportAccount").click();
 const exported=await backup;expect(exported.suggestedFilename()).toBe("cap-compte-sauvegarde.json");
 for(const path of [await exported.path(),await sources.path()]) {
  page.once("dialog",d=>d.accept());await page.locator("#restoreAccount").setInputFiles(path);
  await expect(page.locator("#accountNotice")).toContainText("0 élément(s) restauré(s)");
 }
 page.once("dialog",d=>d.accept());await page.locator("#signOut").click();
 await expect(page.locator("#syncStatus")).toContainText("Compte non connecté");
 await expect(page.locator(".task")).toHaveCount(1); // retour à l'espace historique, pas aux données du compte
 await secondContext.close();
});
