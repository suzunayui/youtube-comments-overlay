const {ipcRenderer}=require('electron');
const buttons={speech:document.getElementById('installSpeech'),cuda:document.getElementById('installCuda'),translation:document.getElementById('installTranslation')};
const labels={speech:'音声字幕を導入',cuda:'GPU高速化を導入',translation:'コメント翻訳を導入'};
function render(state){
  for(const [kind,button]of Object.entries(buttons)){
    button.disabled=state.busy||state.features[kind]||(kind==='cuda'&&!state.features.speech);
    button.textContent=state.features[kind]?labels[kind].replace('を導入','：導入済み'):state.installing===kind?'導入中…':labels[kind];
  }
  const statusKind=state.installing||state.statusKind;
  const showProgress=state.busy||state.status.includes('導入できません');
  document.getElementById('speechInstallStatus').textContent=showProgress&&['speech','cuda'].includes(statusKind)?state.status:state.features.speech?(state.features.cuda?'音声字幕・GPU高速化を導入済み':'音声字幕を導入済み。GPUで使う場合はGPU高速化を導入してください'):'音声字幕を使う場合は「音声字幕を導入」ボタンを押してください';
  document.getElementById('translationInstallStatus').textContent=showProgress&&statusKind==='translation'?state.status:state.features.translation?'コメント翻訳を導入済み（モデルは初回の開始時に準備します）':'翻訳を使う場合のみ導入してください';
}
for(const [kind,button]of Object.entries(buttons))button.onclick=async()=>{
  try{render(await ipcRenderer.invoke('runtime:install',kind));}catch(error){document.getElementById(kind==='translation'?'translationInstallStatus':'speechInstallStatus').textContent=error.message;}
};
ipcRenderer.on('runtime:state',(_event,state)=>render(state));
ipcRenderer.invoke('runtime:get-state').then(render);
