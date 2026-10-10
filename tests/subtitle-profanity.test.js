const {test}=require('node:test');
const assert=require('node:assert/strict');
const {maskProfanity}=require('../subtitles/profanity');
const {SpeechSubtitles}=require('../subtitles/service');

test('subtitle masking handles capitalization and inflections without replacing ordinary words',()=>{
  assert.equal(maskProfanity('fuck you! FUCK YOU!'),'f**k you! F**K YOU!');
  assert.equal(maskProfanity('fucking fucked fucker fuckers fucks motherfucker'),'f**king f**ked f**ker f**kers f**ks motherf**ker');
  assert.equal(maskProfanity('ファックユー'),'フ＊＊クユー');
  assert.equal(maskProfanity('good morning, I like sushi. firetruck duck'),'good morning, I like sushi. firetruck duck');
});

test('masking is enabled for existing settings and updates both captions without changing their expiry',()=>{
  const service=new SpeechSubtitles('',[],{},{config:{},style:{}});
  service.acceptSubtitle('ファックユー','fuck you');
  const timestamp=service.state.subtitle.receivedAt;
  assert.equal(service.state.subtitle.en,'f**k you');assert.equal(service.state.subtitle.ja,'フ＊＊クユー');
  service.update({config:{},style:{maskProfanity:false}});
  assert.equal(service.state.subtitle.en,'fuck you');assert.equal(service.state.subtitle.receivedAt,timestamp);
  service.update({config:{},style:{maskProfanity:true}});
  assert.equal(service.state.subtitle.en,'f**k you');assert.equal(service.state.subtitle.receivedAt,timestamp);
  service.clear();service.update({config:{},style:{}});
  assert.equal(service.state.subtitle,null);assert.equal(service.rawSubtitle,null);
});
