const {spawnSync,execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const python=process.env.SUBTITLE_BUILD_PYTHON||path.join(root,'.venv/Scripts/python.exe');
const result=spawnSync(python,['-m','PyInstaller','--clean','--noconfirm','--distpath','build/subtitle-backend','--workpath','build/pyinstaller-subtitles','packaging/subtitles.spec'],{cwd:root,windowsHide:true,stdio:'inherit'});
if(result.error) throw result.error;
if(result.status!==0) throw new Error('Subtitle worker build failed');
const site=path.resolve(path.dirname(python),'../Lib/site-packages');
const licenses=path.join(root,'build/subtitle-backend/subtitle-worker/LICENSES');fs.mkdirSync(licenses,{recursive:true});
for(const entry of fs.readdirSync(site)){
  if(!entry.endsWith('.dist-info'))continue;
  for(const file of fs.readdirSync(path.join(site,entry))) if(/^(licenses?|copying|notice)/i.test(file)) fs.cpSync(path.join(site,entry,file),path.join(licenses,entry,file),{recursive:true});
}
const base=execFileSync(python,['-c','import sys;print(sys.base_prefix)'],{windowsHide:true,encoding:'utf8'}).trim();
if(fs.existsSync(path.join(base,'LICENSE.txt')))fs.copyFileSync(path.join(base,'LICENSE.txt'),path.join(licenses,'Python.LICENSE.txt'));
