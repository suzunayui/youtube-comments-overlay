const {spawnSync, execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(command,args) {
  const result = spawnSync(command,args,{cwd:root,windowsHide:true,stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed: ${command}`);
}
run(process.execPath,[path.join(__dirname,'prepare-translation-runtime.cjs')]);
const python = process.env.TRANSLATION_BUILD_PYTHON || path.join(root,'.venv/Scripts/python.exe');
if (!fs.existsSync(python)) throw new Error('Run setup-translation.ps1 first.');
run(python,['-m','PyInstaller','--clean','--noconfirm','--distpath','build/translation-backend','--workpath','build/pyinstaller','packaging/translation.spec']);
const site = path.resolve(path.dirname(python),'../Lib/site-packages');
const licenses = path.join(root,'build/translation-backend/translation-worker/LICENSES');
fs.mkdirSync(licenses,{recursive:true});
for (const entry of fs.readdirSync(site,{withFileTypes:true})) {
  if (!entry.name.endsWith('.dist-info')) continue;
  const folder = path.join(site,entry.name);
  for (const file of fs.readdirSync(folder)) {
    if (!/^(licenses?|copying|notice)/i.test(file)) continue;
    fs.cpSync(path.join(folder,file),path.join(licenses,entry.name,file),{recursive:true});
  }
}
const pythonBase = execFileSync(python,['-c','import sys; print(sys.base_prefix)'],{windowsHide:true,encoding:'utf8'}).trim();
const pythonLicense = path.join(pythonBase,'LICENSE.txt');
if (fs.existsSync(pythonLicense)) fs.copyFileSync(pythonLicense,path.join(licenses,'Python.LICENSE.txt'));
