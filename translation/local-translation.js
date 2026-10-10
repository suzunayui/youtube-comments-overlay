const {spawn, spawnSync} = require('node:child_process');
const readline = require('node:readline');
class LocalTranslation {
  constructor(command, args, options) {this.command = command; this.args = args; this.options = options; this.pending = new Map(); this.nextId = 0;}
  async start(device, signal, status) {
    this.stop();
    const child = spawn(this.command, this.args, this.options); this.child = child;
    await new Promise((resolve, reject) => {
      let ready = false;
      const abort = () => {if (this.child === child) this.stop();};
      signal.addEventListener('abort', abort, {once:true});
      const lines = readline.createInterface({input:child.stdout});
      lines.on('line', line => {
        let message; try {message = JSON.parse(line);} catch {return;}
        if (this.child !== child || signal.aborted) return;
        if (message.type === 'status') status(message.text);
        if (message.type === 'ready') {ready = true; resolve();}
        if (message.type === 'error') {reject(new Error(message.text)); this.rejectAll(new Error(message.text));}
        if (['result', 'translation-error'].includes(message.type)) {
          const pending = this.pending.get(message.id); this.pending.delete(message.id);
          if (pending) {if (message.type === 'result') pending.resolve({ja:message.ja, language:message.language}); else pending.reject(new Error(message.text));}
        }
      });
      // No comment text is written to logs.
      child.stderr.on('data', () => {});
      child.on('error', error => {reject(error); if (this.child === child) this.rejectAll(error);});
      child.on('exit', () => {
        signal.removeEventListener('abort', abort);
        if (!ready) reject(new Error(signal.aborted ? '停止しました' : '翻訳処理が終了しました'));
        if (this.child === child) {this.child = null; this.rejectAll(new Error('翻訳処理が終了しました'));}
      });
      child.stdin.on('error', error => {reject(error); if (this.child === child) this.rejectAll(error);});
      if (signal.aborted) abort();
      else child.stdin.write(JSON.stringify({device}) + '\n');
    });
  }
  translate(text, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted || !this.child?.stdin.writable) return reject(new Error('翻訳処理を開始してください'));
      const id = ++this.nextId;
      this.pending.set(id, {resolve, reject});
      this.child.stdin.write(JSON.stringify({id, text}) + '\n');
    });
  }
  rejectAll(error) {for (const pending of this.pending.values()) pending.reject(error); this.pending.clear();}
  stop() {
    const child = this.child; this.child = null; this.rejectAll(new Error('停止しました'));
    // The translation worker owns a llama.cpp process; terminate the entire tree.
    if (child?.pid && process.platform === 'win32') {
      const killed = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide:true, stdio:'ignore', timeout:5000});
      if (killed.error) child.kill();
    } else child?.kill();
  }
}
module.exports = {LocalTranslation};
