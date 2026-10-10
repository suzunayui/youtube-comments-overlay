const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('installation progress and retry errors appear only in the relevant feature section',()=>{
  const elements=Object.fromEntries(['installSpeech','installCuda','installTranslation','speechInstallStatus','translationInstallStatus'].map(id=>[id,{}]));
  const ipc={on:()=>{},invoke:()=>new Promise(()=>{})};
  const context=vm.createContext({require:()=>({ipcRenderer:ipc}),document:{getElementById:id=>elements[id]}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../runtime/controls.js'),'utf8'),context);
  for(const kind of ['speech','cuda','translation']){
    for(const failed of [false,true]){
      const status=failed?'導入できませんでした。再試行できます: pip failed':'Collecting numpy';
      context.state={busy:!failed,installing:failed?null:kind,statusKind:kind,status,features:{speech:true,cuda:false,translation:false}};
      vm.runInContext('render(state)',context);
      const target=kind==='translation'?'translationInstallStatus':'speechInstallStatus';
      const other=kind==='translation'?'speechInstallStatus':'translationInstallStatus';
      assert.equal(elements[target].textContent,status);
      assert.notEqual(elements[other].textContent,status);
      if(!failed)assert.equal(elements.installTranslation.disabled,true);
    }
  }
  context.state={busy:false,installing:null,statusKind:'translation',status:'導入が完了しました',features:{speech:true,cuda:true,translation:true}};
  vm.runInContext('render(state)',context);
  assert.equal(elements.speechInstallStatus.textContent,'音声字幕・GPU高速化を導入済み');
  assert.match(elements.translationInstallStatus.textContent,/コメント翻訳を導入済み/);
});
