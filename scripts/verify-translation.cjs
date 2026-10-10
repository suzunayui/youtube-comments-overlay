const {_electron:electron} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'test-output'); fs.mkdirSync(output,{recursive:true});
async function main() {
  const desktop = await electron.launch({executablePath:process.env.YT_OVERLAY_PACKAGED_EXE,
    args:process.env.YT_OVERLAY_PACKAGED_EXE ? [] : [root], cwd:root,
    env:{...process.env,YT_OVERLAY_TEST_USER_DATA:path.join(output,'translation-profile'),
      YT_OVERLAY_TEST_PORT:'15000',HF_HUB_OFFLINE:'1',YT_OVERLAY_TEST_RUNTIME:path.join(output,'addon-runtime')},timeout:30000});
  try {
    const page = await desktop.firstWindow();
    const errors = []; page.on('pageerror', error=>errors.push(error.message));
    await page.waitForFunction(()=>document.querySelector('#translationDevice').options.length>1);
    await page.locator('#mainTabs [data-tab="addons"]').click();
    await page.locator('#translationEnabled').check();
    await page.locator('#translationDevice').selectOption('cuda:0');
    await desktop.evaluate(()=>{
      const original = global.fetch;
      global.fetch = (url,...args)=>String(url).includes('youtube.com') ? new Promise(()=>{}) : original(url,...args);
    });
    await page.locator('#inputTarget').fill('@LofiGirl');
    await page.locator('#btnStart').click();
    await page.waitForFunction(()=>document.querySelector('#translationStatus').textContent.includes('で翻訳中'),null,{timeout:180000});
    // Freeze the remote collector so deterministic synthetic comments can exercise
    // the same SQLite save event, translator and public /comments route.
    await desktop.evaluate(({app})=>process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('./youtubeChat.js').stopLiveChat());
    // Electron's BrowserWindow provides Chromium without a separate browser install.
    await desktop.evaluate(({BrowserWindow})=>{
      const window = new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
      window.loadURL('http://127.0.0.1:15000/');
    });
    const windows = desktop.windows();
    let overlay = windows.find(window=>window!==page);
    if (!overlay) overlay = await desktop.waitForEvent('window');
    await overlay.waitForLoadState('domcontentloaded');
    const id = 'translation-test-'+Date.now();
    const saved = await desktop.evaluate(({app}, comment)=>process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('./chatStore.js').saveComment(comment),
      {id,video_id:'synthetic',text:'Guten Morgen',author:'Test',timestamp_ms:Date.now(),kind:'text',parts:[{type:'text',text:'Guten Morgen'}]});
    assert.equal(saved,true,'synthetic comment reaches the packaged SQLite store');
    const original = overlay.locator(`[data-comment-id="${id}"]`);
    await original.waitFor();
    assert.equal(await original.count(),1);
    await original.locator('.translation-ja').waitFor({state:'visible',timeout:120000});
    assert.match(await original.locator('.translation-ja').textContent(),/おはよう/);
    await original.screenshot({path:path.join(output,'translated-comment.png'),omitBackground:true});
    assert.equal(await original.count(),1,'late translation updates the existing comment');
    await desktop.evaluate(({app}, comment)=>process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('./chatStore.js').saveComment(comment),
      {id:id+'-ja',video_id:'synthetic',text:'おはようございます',author:'Test',timestamp_ms:Date.now(),kind:'text'});
    await overlay.waitForTimeout(700);
    const japanese = overlay.locator(`[data-comment-id="${id}-ja"]`);
    assert.equal(await japanese.locator('.translation-ja').isHidden(),true);
    // Use an intercepted response only for HTML escaping, independent of model output.
    await overlay.route('**/comments',route=>route.fulfill({json:[{id:'escape',text:'hello',author:'Test',timestamp_ms:Date.now(),translation_ja:'<img src=x onerror=alert(1)>'}]}));
    await overlay.waitForTimeout(700);
    assert.equal(await overlay.locator('.translation-ja img').count(),0);
    await overlay.unroute('**/comments');
    if (!process.env.YT_OVERLAY_PACKAGED_EXE) await overlay.screenshot({path:path.join(output,'overlay-translation.png')});
    await page.locator('#translationEnabled').uncheck();
    await original.locator('.translation-ja').waitFor({state:'hidden',timeout:10000});
    await page.locator('#translationEnabled').check();
    await page.locator('#btnStop').click();
    await page.waitForFunction(()=>document.querySelector('#translationStatus').textContent.includes('停止中'));
    assert.deepEqual(errors,[],'settings page has no script errors');
    if (!process.env.YT_OVERLAY_PACKAGED_EXE) await page.screenshot({path:path.join(output,'settings-translation.png'),fullPage:true});
    console.log('PASS: integrated app, GPU model, SQLite event, late Japanese translation under original, no duplicates, Japanese skip, safe rendering, disable and cancellation on restart.');
  } finally {await desktop.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
