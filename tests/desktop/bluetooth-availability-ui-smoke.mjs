import {_electron as electron} from 'playwright-core';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const require=createRequire(root+'/apps/desktop/electron/package.json');
const app=await electron.launch({executablePath:require('electron'),args:[root+'/apps/desktop/electron'],timeout:30000});
try {
 const page=await app.firstWindow();
 for(let attempt=0;attempt<100;attempt++){if(await page.evaluate(()=>Boolean(window.appInstance && window.bleAPI)))break;await new Promise(resolve=>setTimeout(resolve,50));}
 const result=await page.evaluate(async()=>{
  // Exercise the production state event sink in the real sandboxed window.
  await window.bleAPI.init();
  const ui=window.appInstance;
  ui.updateBluetoothStatus('noAdapter');
  ui.updateBroadcastStatus('ready');
  ui.updateByteBudget();
  await ui.startScan(); await ui.startBroadcast();
  return {name:document.title,word:document.getElementById('btWord').textContent,scanDisabled:document.getElementById('scanButton').disabled,broadcastDisabled:document.getElementById('startBroadcastButton').disabled,badge:document.getElementById('broadcastStateBadge').textContent};
 });
 assert.equal(result.word,'未发现蓝牙适配器');assert.equal(result.scanDisabled,true);assert.equal(result.broadcastDisabled,true);assert.doesNotMatch(result.badge,/已就绪/);assert.equal(result.name,'BLE Toolkit+');
 console.log(JSON.stringify({pass:true,...result}));
} finally {app.process().kill('SIGKILL');}
