const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {normalizeProject}=require('./project-store.cjs');
const editor=fs.readFileSync(path.join(__dirname,'../js/editor.js'),'utf8');
const source=editor.slice(editor.indexOf('function normalizeVideo('),editor.indexOf('class PortfolioEditor'));
const normalize=vm.runInNewContext(source+'; normalizeVideo',{URL});
const expected='https://player.bilibili.com/player.html?bvid=BV1Pexe6uE9q&p=1&autoplay=0&danmaku=0';
const project=video=>({client:'361°',title:'Breathing Underwater',video,blocks:[]});

test('Bilibili iframe, BV ID, video link and embed URL normalize consistently',()=>{
 for(const input of [
  'BV1Pexe6uE9q',
  'https://www.bilibili.com/video/BV1Pexe6uE9q/',
  '//player.bilibili.com/player.html?bvid=BV1Pexe6uE9q&page=1',
  '<iframe src="//player.bilibili.com/player.html?bvid=BV1Pexe6uE9q&amp;page=1" allowfullscreen="true"> </iframe>'
 ])assert.equal(normalize(input),expected);
});
test('saved Bilibili embeds preserve BV and page, disable autoplay and danmaku',()=>{
 assert.equal(normalizeProject(project(expected)).video,expected);
 const input='https://player.bilibili.com/player.html?bvid=BV1Pexe6uE9q&page=2&autoplay=1&danmaku=1';
 assert.equal(normalizeProject(project(input)).video,expected.replace('p=1','p=2'));
});
test('untrusted iframe hosts, invalid BVs, protocols and page numbers are rejected',()=>{
 for(const input of ['https://player.bilibili.com.evil.example/player.html?bvid=BV1Pexe6uE9q','https://player.bilibili.com/player.html?bvid=bad','https://player.bilibili.com/player.html?bvid=BV1Pexe6uE9q&p=0','javascript:alert(1)']){
  assert.throws(()=>normalize(input));assert.throws(()=>normalizeProject(project(input)),{status:422});
 }
});
test('existing Vimeo privacy hashes and explicit empty players remain supported',()=>{
 assert.equal(normalize('https://vimeo.com/1079682226/1d4e238bca'),'https://player.vimeo.com/video/1079682226?h=1d4e238bca');
 assert.equal(normalizeProject(project('https://player.vimeo.com/video/123?h=original')).video,'https://player.vimeo.com/video/123?h=original');
 assert.equal(normalize(''), '');
});
