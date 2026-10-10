const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'build', 'translation-runtime');
const version = 'b11429';
const digest = '1bfe78ad9168b79fa02bf67f6af9f5e17a966d824d77238517f7bef12ac73b36';
async function prepare() {
  const marker = path.join(target, 'runtime-version.txt');
  if (fs.existsSync(path.join(target, 'llama-server.exe')) && fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === version) return;
  fs.mkdirSync(target, {recursive:true});
  const response = await fetch(`https://github.com/ggml-org/llama.cpp/releases/download/${version}/llama-${version}-bin-win-vulkan-x64.zip`);
  if (!response.ok) throw new Error(`Runtime download failed: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (crypto.createHash('sha256').update(data).digest('hex') !== digest) throw new Error('Runtime checksum mismatch');
  const zip = path.join(root, 'build', 'translation-runtime.zip'); fs.writeFileSync(zip, data);
  const quote = value => "'" + value.replaceAll("'", "''") + "'";
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${quote(zip)} -DestinationPath ${quote(target)} -Force`], {windowsHide:true});
  const license = await fetch(`https://raw.githubusercontent.com/ggml-org/llama.cpp/${version}/LICENSE`);
  if (!license.ok) throw new Error('Runtime license download failed');
  fs.writeFileSync(path.join(target, 'LICENSE-llama.cpp.txt'), await license.text());
  fs.writeFileSync(marker, version + '\n');
  fs.unlinkSync(zip);
}
prepare().catch(error => {console.error(error.message); process.exitCode = 1;});
