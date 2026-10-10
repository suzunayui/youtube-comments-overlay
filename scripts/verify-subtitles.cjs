const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-output');fs.mkdirSync(output,{recursive:true});
async function main(){
  const profile=path.join(output,'speech-profile');fs.mkdirSync(profile,{recursive:true});
  fs.writeFileSync(path.join(profile,'speech-settings.json'),JSON.stringify({config:{device:'cpu',model:'large-v3',threshold:'0.5'}}));
  const env={...process.env,YT_OVERLAY_TEST_USER_DATA:profile,YT_OVERLAY_TEST_PORT:'15002',HF_HUB_OFFLINE:'1'};
  if(process.env.YT_OVERLAY_PACKAGED_EXE)env.YT_OVERLAY_TEST_RUNTIME=path.join(output,'addon-runtime');
  if(process.env.YT_OVERLAY_PACKAGED_EXE) env.PATH=`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`;
  const desktop=await electron.launch({executablePath:process.env.YT_OVERLAY_PACKAGED_EXE,args:process.env.YT_OVERLAY_PACKAGED_EXE?[]:[root],cwd:root,env,timeout:30000});
  try{
    const page=await desktop.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>document.querySelector('#speechMicrophone').options.length>0,null,{timeout:30000});
    await page.locator('#mainTabs [data-tab="speech"]').click();
    assert.equal(await page.locator('#speechDevice').inputValue(),'cpu','saved CPU preference is retained even when GPUs are available');
    const microphones=await page.locator('#speechMicrophone option').evaluateAll(options=>options.map(option=>({value:option.value,text:option.textContent})));
    const mic=microphones.find(item=>/HyperX/i.test(item.text))||microphones[0];
    await page.locator('#speechMicrophone').selectOption(mic.value);
    await page.locator('#speechDevice').selectOption('cuda:1');
    await page.locator('#speechModel').selectOption('large-v3');
    await page.locator('#speechStart').click();
    await page.waitForFunction(()=>/字幕を生成中|エラー/.test(document.querySelector('#speechStatus').textContent),null,{timeout:120000});
    assert.match(await page.locator('#speechStatus').textContent(),/字幕を生成中/,'real microphone opens with CUDA model and cached model offline');
    assert.equal(await page.locator('#speechStart').isDisabled(),true);
    assert.match(await page.locator('#translationStatus').textContent(),/停止中/);
    await page.locator('#speechStop').click();
    await page.waitForFunction(()=>!document.querySelector('#speechStart').disabled,null,{timeout:30000});
    assert.equal(await page.locator('#speechStop').isDisabled(),true);
    // Stop while the inference process is still initializing, then restart.
    await page.locator('#speechStart').click();await page.locator('#speechStop').click();
    await page.waitForFunction(()=>!document.querySelector('#speechStart').disabled,null,{timeout:30000});
    await page.locator('#speechStart').click();
    await page.waitForFunction(()=>/字幕を生成中|エラー/.test(document.querySelector('#speechStatus').textContent),null,{timeout:120000});
    assert.match(await page.locator('#speechStatus').textContent(),/字幕を生成中/);
    await page.locator('#speechStop').click();
    await page.waitForFunction(()=>!document.querySelector('#speechStart').disabled,null,{timeout:30000});
    await desktop.evaluate(({BrowserWindow})=>new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadURL('http://127.0.0.1:15002/subtitles'));
    const overlay=desktop.windows().find(window=>window!==page)||await desktop.waitForEvent('window');
    await overlay.waitForLoadState('domcontentloaded');
    // Inject a result at the same service boundary used by the Python stdout handler.
    await desktop.evaluate(({app})=>{
      const {SpeechSubtitles}=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json')('./subtitles/service');
      const publish=SpeechSubtitles.prototype.publish;
      SpeechSubtitles.prototype.publish=function(){global.__testSpeech=this;return publish.call(this);};
    });
    await page.evaluate(()=>require('electron').ipcRenderer.invoke('speech:clear'));
    await desktop.evaluate(()=>{global.__testSpeech.state.subtitle={ja:'おはようございます',en:'Good morning.',receivedAt:Date.now()};global.__testSpeech.publish();});
    await overlay.locator('#captions').waitFor({state:'visible'});
    assert.equal(await overlay.locator('#ja').textContent(),'おはようございます');
    assert.equal(await overlay.locator('#en').textContent(),'Good morning.');
    const appearance=await overlay.locator('#captions').evaluate(box=>{const style=getComputedStyle(box);return {background:style.backgroundColor,radius:style.borderRadius,color:getComputedStyle(box.querySelector('#ja')).color};});
    assert.deepEqual(appearance,{background:'rgb(0, 0, 0)',radius:'20px',color:'rgb(255, 255, 255)'});
    if(!process.env.YT_OVERLAY_PACKAGED_EXE){
      await overlay.screenshot({path:path.join(output,'speech-subtitles.png'),omitBackground:true});
      await page.screenshot({path:path.join(output,'speech-settings.png'),fullPage:true});
    }
    await desktop.evaluate(()=>{global.__testSpeech.state.subtitle={ja:'<img src=x onerror=alert(1)>',en:'safe',receivedAt:Date.now()};global.__testSpeech.publish();});
    await overlay.waitForFunction(()=>document.querySelector('#ja').textContent.includes('<img'));
    assert.equal(await overlay.locator('img').count(),0);
    await page.locator('#speechDuration').fill('2');await page.locator('#speechDuration').dispatchEvent('change');
    await overlay.locator('#captions').waitFor({state:'hidden',timeout:5000});
    await desktop.evaluate(()=>{global.__testSpeech.state.subtitle={ja:'確認',en:'Test',receivedAt:Date.now()};global.__testSpeech.publish();});
    await overlay.locator('#captions').waitFor({state:'visible'});await overlay.reload();
    await overlay.locator('#captions').waitFor({state:'visible'});
    await page.locator('#speechClear').click();await overlay.locator('#captions').waitFor({state:'hidden'});
    await page.locator('#mainTabs [data-tab="comments"]').click();assert.equal(await page.locator('#speechPanel').isHidden(),true);
    await page.locator('#mainTabs [data-tab="overlay"]').click();assert.equal(await page.locator('#speechPanel').isHidden(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: real WASAPI mic, GPU1 large-v3 offline cache, stop/restart including initialization, independent controls, SSE Japanese/English, black/white/rounded rendering, escape, expiration, reconnect, clear and navigation.');
  }finally{await desktop.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
