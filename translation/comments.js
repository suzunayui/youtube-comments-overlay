// Translate new comments in the background without delaying their original text.
function candidate(text) {
  const clean = String(text || '').replace(/https?:\/\/\S+/g, '').trim();
  return /\p{L}/u.test(clean) && !/[\u3040-\u30ff]/u.test(clean);
}
class CommentTranslation {
  constructor(worker, publish = () => {}) {
    this.worker = worker; this.publish = publish; this.results = new Map();
    this.seen = new Set(); this.queue = []; this.controller = null;
    this.state = {active:false, ready:false, status:'翻訳は停止中です', translated:0, skipped:0, queued:0};
  }
  notify(text) {
    if (text) this.state.status = text;
    this.state.queued = this.queue.length;
    this.publish({...this.state});
  }
  async start(device) {
    this.stop();
    const controller = new AbortController(); this.controller = controller;
    this.startedAt = Date.now(); this.seen.clear();
    this.state = {active:true, ready:false, status:'TranslateGemma 12Bを準備中', translated:0, skipped:0, queued:0};
    this.notify();
    try {
      await this.worker.start(device, controller.signal, text => {
        if (this.controller === controller) this.notify(text);
      });
      if (this.controller !== controller || controller.signal.aborted) return;
      this.state.ready = true; this.notify('TranslateGemma 12Bで翻訳中');
      void this.drain(controller);
    } catch (error) {
      if (this.controller !== controller || controller.signal.aborted) return;
      this.worker.stop(); this.queue = []; this.state.active = false; this.state.ready = false;
      this.notify(`翻訳エラー: ${error.message}`);
    }
  }
  enqueue(comment) {
    if (!this.state.active || !comment?.id || this.seen.has(comment.id)) return;
    this.seen.add(comment.id);
    if (this.seen.size > 10000) this.seen.delete(this.seen.values().next().value);
    // Avoid translating the existing chat history returned at connection time.
    if (Number(comment.timestamp_ms) < this.startedAt || !candidate(comment.text)) return;
    if (comment.kind && !['text','paid','membership'].includes(comment.kind)) return;
    if (this.queue.length >= 30) {this.queue.shift(); this.state.skipped++;}
    this.queue.push({id:comment.id, text:String(comment.text).slice(0,2000)}); this.notify();
    if (this.state.ready) void this.drain(this.controller);
  }
  async drain(controller) {
    if (!controller || this.draining === controller) return;
    this.draining = controller;
    try {
      while (this.queue.length && this.controller === controller && !controller.signal.aborted) {
        const comment = this.queue.shift(); this.notify();
        try {
          const result = await this.worker.translate(comment.text, controller.signal);
          if (this.controller !== controller || controller.signal.aborted) return;
          if (result.language !== 'ja' && result.ja && result.ja.trim() !== comment.text.trim()) {
            this.results.set(comment.id, {translation_ja:result.ja, source_language:result.language});
            if (this.results.size > 1000) this.results.delete(this.results.keys().next().value);
            this.state.translated++;
          }
          this.notify('TranslateGemma 12Bで翻訳中');
        } catch (error) {
          if (this.controller !== controller || controller.signal.aborted) return;
          this.state.skipped++; this.notify(`コメントを翻訳できませんでした: ${error.message}`);
          await new Promise(resolve=>{
            const timer = setTimeout(done,1000);
            function done() {clearTimeout(timer); controller.signal.removeEventListener('abort',done); resolve();}
            controller.signal.addEventListener('abort',done,{once:true});
          });
        }
      }
    } finally {if (this.draining === controller) this.draining = null;}
  }
  decorate(rows) {return rows.map(row=>({...row, ...(this.results.get(row.id) || {})}));}
  stop() {
    this.controller?.abort(); this.controller = null; this.worker.stop();
    this.queue = []; this.results.clear();
    this.state.active = false; this.state.ready = false; this.notify('翻訳は停止中です');
  }
}
module.exports = {CommentTranslation, candidate};
