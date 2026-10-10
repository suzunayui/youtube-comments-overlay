const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const html='"INNERTUBE_API_KEY":"test" "clientVersion":"1.0" "continuation":"first"';
const response=()=>({ok:true,json:async()=>({continuationContents:{liveChatContinuation:{actions:[],continuations:[{timedContinuationData:{continuation:'next',timeoutMs:1000}}]}}})});
function collector(fetch,saveComment=()=>{}){
  const sleepers=[];
  const context=vm.createContext({require:()=>({saveComment}),module:{exports:{}},console:{log:()=>{},error:()=>{}},fetch,
    setTimeout:(callback,delay)=>sleepers.push({callback,delay})});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../youtubeChat.js'),'utf8'),context);
  return {...context.module.exports,sleepers};
}
test('successful empty polls report acquisition; transient failures report reconnecting and recover',async()=>{
  let requests=0;
  const chat=collector(async url=>{
    if(url.includes('/watch?'))return {ok:true,text:async()=>html};
    if(++requests===2)throw Error('temporary network failure');
    return response();
  });
  const states=[];const run=chat.startLiveChat('abcdefghijk',state=>states.push(state));
  await tick();assert.deepEqual(states,['reconnecting']);assert.equal(chat.sleepers[0].delay,5000);
  chat.sleepers.shift().callback();await tick();assert.deepEqual(states,['reconnecting','running']);
  chat.stopLiveChat();chat.sleepers.shift().callback();await run;
});
test('an in-flight response after stop does not restore the acquisition status',async()=>{
  let requests=0,finish;
  const chat=collector(async url=>{
    if(url.includes('/watch?'))return {ok:true,text:async()=>html};
    if(++requests===2)return new Promise(resolve=>finish=resolve);
    return response();
  });
  const states=[];const run=chat.startLiveChat('abcdefghijk',state=>states.push(state));
  await tick();assert.ok(finish);chat.stopLiveChat();finish(response());await run;
  assert.deepEqual(states,[]);
});

test('membership milestone messages retain duration headers and message text',async()=>{
  const saved=[];
  const chat=collector(async url=>{
    if(url.includes('/watch?'))return {ok:true,text:async()=>html};
    const data=await response().json();
    data.continuationContents.liveChatContinuation.actions=[{addChatItemAction:{item:{liveChatMembershipItemRenderer:{
      id:'milestone',authorName:{simpleText:'Member'},timestampUsec:String(Date.now()*1000),
      headerPrimaryText:{runs:[{text:'Member for 12 months'}]},headerSubtext:{runs:[{text:'Gold'}]},
      message:{runs:[{text:'Thank you!'}]}
    }}}}];
    return {ok:true,json:async()=>data};
  },msg=>saved.push(msg));
  const run=chat.startLiveChat('abcdefghijk');await tick();
  assert.equal(saved.length,1);assert.equal(saved[0].kind,'membership');
  assert.equal(saved[0].text,'Member for 12 months Gold Thank you!');assert.equal(saved[0].parts[0].text,'Thank you!');
  chat.stopLiveChat();chat.sleepers.shift().callback();await run;
});
