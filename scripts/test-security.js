import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
const image="postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b";
const container="cap-security-"+process.pid;
function run(args,input,quiet=false) {
 const r=spawnSync("docker",args,{input,encoding:"utf8",timeout:120000});
 if(!quiet){process.stdout.write(r.stdout||"");process.stderr.write(r.stderr||"");}
 if(r.status!==0)throw Error("Commande Docker en échec (aucun test de sécurité validé).");
 return r.stdout;
}
try {
 // Aucune publication de port ; données fictives, conteneur sans accès réseau.
 run(["run","--rm","-d","--network","none","--name",container,"-e","POSTGRES_HOST_AUTH_METHOD=trust",image],undefined,true);
 let ready=false;
 for(let i=0;i<30;i++){
  const r=spawnSync("docker",["exec",container,"pg_isready","-U","postgres"],{encoding:"utf8"});
  if(r.status===0){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw Error("PostgreSQL local indisponible.");
 const sql=readFileSync("tests/security/bootstrap.sql","utf8")+"\n"+
  readFileSync("supabase/migrations/001_cap_sync.sql","utf8")+"\n"+
  readFileSync("tests/security/isolation.sql","utf8");
 const result=spawnSync("docker",["exec","-i",container,"psql","-U","postgres","-v","ON_ERROR_STOP=1"],{input:sql,encoding:"utf8",timeout:60000});
 process.stdout.write(result.stdout||"");process.stderr.write(result.stderr||"");
 if(result.status!==0)throw Error("Échec SQL : confidentialité non validée.");
 const count=(result.stderr.match(/NOTICE:  PASS:/g)||[]).length;
 if(count<18)throw Error("Nombre de contrôles exécutés insuffisant.");
 console.log(count+" contrôles SQL réussis (identités simulées, PostgreSQL 17 local ; Supabase hébergé non testé).");
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {spawnSync("docker",["rm","-f",container],{stdio:"ignore"});}
