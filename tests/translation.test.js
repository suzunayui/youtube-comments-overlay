const {test} = require('node:test');
const assert = require('node:assert/strict');
const {CommentTranslation, candidate} = require('../translation/comments');
const tick = () => new Promise(resolve=>setImmediate(resolve));
test('only fresh foreign text is translated once; originals keep their metadata', async () => {
  const calls = [];
  const worker = {start:async()=>{}, stop:()=>{}, translate:async text=>{calls.push(text); return {ja:'おはようございます。',language:'de'};}};
  const service = new CommentTranslation(worker);
  await service.start('cpu');
  for (const message of [
    {id:'old', text:'Guten Morgen', timestamp_ms:service.startedAt-10},
    {id:'jp', text:'おはようございます', timestamp_ms:Date.now()},
    {id:'emoji', text:'👋 ☀️', timestamp_ms:Date.now()},
    {id:'one', text:'Guten Morgen', timestamp_ms:Date.now(),kind:'text'},
    {id:'one', text:'Guten Morgen', timestamp_ms:Date.now(),kind:'text'}]) service.enqueue(message);
  await tick();
  assert.deepEqual(calls,['Guten Morgen']);
  const row = {id:'one',text:'Guten Morgen',parts:[{type:'emoji',url:'example'}],is_member:true};
  assert.deepEqual(service.decorate([row])[0],{...row,translation_ja:'おはようございます。',source_language:'de'});
  service.stop(); assert.equal(service.decorate([row])[0].translation_ja,undefined);
  assert.equal(candidate('https://example.com 👋'),false);
});
test('stopping or restarting discards in-flight results and bounds the waiting queue', async () => {
  let finish;
  const worker = {start:async()=>{}, stop:()=>{},translate:()=>new Promise(resolve=>{finish=resolve;})};
  const service = new CommentTranslation(worker);
  await service.start('cpu');
  service.enqueue({id:'pending',text:'Hello',timestamp_ms:Date.now()});
  for (let i=0;i<40;i++) service.enqueue({id:String(i),text:'Hello',timestamp_ms:Date.now()});
  assert.equal(service.queue.length,30); assert.equal(service.state.skipped,10);
  service.stop();
  finish({ja:'こんにちは',language:'en'}); await tick();
  assert.equal(service.results.size,0); assert.equal(service.queue.length,0);
  assert.equal(service.state.active,false);
});
test('startup failure keeps translation stopped and allows a later restart', async () => {
  const worker = {start:async()=>{throw new Error('failed');}, stop:()=>{}};
  const service = new CommentTranslation(worker);
  await service.start('cpu'); assert.equal(service.state.active,false); assert.match(service.state.status,/failed/);
  worker.start = async()=>{};
  await service.start('cpu'); assert.equal(service.state.ready,true); service.stop();
});
