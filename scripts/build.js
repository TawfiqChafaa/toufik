import {build} from "esbuild";
import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
await build({entryPoints:["src/cloud/supabase.js"],bundle:true,minify:true,format:"esm",outfile:"dist/supabase.js"});
const assets=[
 "index.html","manifest.webmanifest","src/styles.css","src/offline.js","src/app.js","src/domain.js","src/repository.js",
 "src/ideas-ui.js","src/ideas-domain.js","src/ideas-repository.js","src/cloud/runtime.js","src/cloud/account-ui.js",
 "src/cloud/local-store.js","src/cloud/sync.js","dist/supabase.js"
];
const hash=createHash("sha256");
for(const path of assets)hash.update(await readFile(path));
const template=await readFile("src/sw-template.js","utf8");hash.update(template);
await writeFile("sw.js",template.replace("__VERSION__",hash.digest("hex").slice(0,16)).replace("__ASSETS__",JSON.stringify(assets)));
console.log("SDK et cache hors ligne préparés, sans connexion Supabase.");
