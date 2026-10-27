import { defineConfig } from "@playwright/test";
export default defineConfig({
 testDir:"./tests/browser",use:{locale:"fr-FR",baseURL:"http://127.0.0.1:8000",launchOptions:{executablePath:process.env.CAP_CHROMIUM||"/usr/bin/chromium",args:["--no-sandbox"]}},
 webServer:{command:"npm run dev",url:"http://127.0.0.1:8000",reuseExistingServer:true},
 projects:[{name:"ordinateur",use:{viewport:{width:1366,height:900}}},{name:"mobile",use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
