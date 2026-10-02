import {defineConfig} from 'playwright/test';
export default defineConfig({
 testDir:'./test/browser',timeout:45000,fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1200,height:900},trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:[
  {command:'python3 -m http.server 4173 --bind 127.0.0.1',url:'http://127.0.0.1:4173/test/browser/harness.html',reuseExistingServer:!process.env.CI},
  {command:'python3 examples/python-server/server.py --port 4174',url:'http://127.0.0.1:4174/api/timeline',reuseExistingServer:!process.env.CI}
 ]
});
