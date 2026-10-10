const {_electron:electron} = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
async function main() {
  const desktop = await electron.launch({executablePath:process.env.YT_OVERLAY_PACKAGED_EXE,
    args:process.env.YT_OVERLAY_PACKAGED_EXE ? [] : [root],cwd:root,
    env:{...process.env,YT_OVERLAY_TEST_USER_DATA:path.join(root,'test-output','live-profile-'+Date.now()),YT_OVERLAY_TEST_PORT:'15001'}});
  try {
    const page = await desktop.firstWindow();
    await page.waitForFunction(()=>document.querySelector('#translationDevice').options.length>1);
    await page.locator('#mainTabs [data-tab="addons"]').click();
    if(process.env.YT_OVERLAY_PACKAGED_EXE){
      const state=await page.evaluate(()=>require('electron').ipcRenderer.invoke('runtime:get-state'));
      assert.deepEqual(state.features,{speech:false,translation:false,cuda:false});
      assert.equal(await page.locator('#installTranslation').isEnabled(),true);
    }
    await page.locator('#translationEnabled').uncheck();
    await page.locator('#inputTarget').fill('@LofiGirl');
    await page.locator('#btnStart').click();
    const deadline = Date.now()+60000; let count = 0;
    while (Date.now()<deadline) {
      count = (await (await fetch('http://127.0.0.1:15001/comments')).json()).length;
      if (count) break;
      await page.waitForTimeout(1000);
    }
    assert.ok(count>0,'live comments still reach the normal overlay route');
    await page.locator('#btnStop').click();
    console.log(`PASS: real YouTube connection and original comment API (${count} rows).`);
  } finally {await desktop.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
