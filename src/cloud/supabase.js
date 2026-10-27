import {createClient} from "@supabase/supabase-js";
export function validateConfig({url,publishableKey}) {
 const parsed=new URL(url);
 if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".supabase.co")||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash)throw Error("URL HTTPS du projet Supabase attendue.");
 if(typeof publishableKey!=="string"||publishableKey.length>4000)throw Error("Clé publiable invalide.");
 if(!publishableKey.startsWith("sb_publishable_")) {
  try {
   const payload=JSON.parse(atob(publishableKey.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
   if(payload.role!=="anon")throw Error();
  }catch{throw Error("Utilise uniquement une clé publiable ou anon. Jamais une clé secrète administrative.");}
 }
 return {url:parsed.origin,publishableKey};
}
export function createSupabase(config) {
 const clean=validateConfig(config);
 const client=createClient(clean.url,clean.publishableKey,{
  auth:{persistSession:true,autoRefreshToken:globalThis.navigator?.onLine!==false,detectSessionInUrl:true,flowType:"pkce"}
 });
 return {
  auth:client.auth,
  remote:{
   async apply(op) {
    const {data,error}=await client.rpc("cap_apply",{
     p_operation:op.operationId,p_kind:op.kind,p_id:op.id,p_expected:op.expected,p_data:op.data,p_deleted:op.deleted
    });
    if(error){if(error.code==="PGRST301"||error.code==="28000")error.code="AUTH";throw error;}
    return data;
   },
   async pull(cursor) {
    const {data,error}=await client.from("cap_changes").select("seq,record").gt("seq",cursor).order("seq").limit(100);
    if(error)throw error;return data;
   }
  }
 };
}
