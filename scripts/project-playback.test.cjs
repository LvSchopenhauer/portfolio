const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'../js/main.js'),'utf8');
const source=main.slice(main.indexOf('function resetProjectPlayback()'),main.indexOf('function showProjectPage('));
function fixture(){
 const handlers={},buttons=['vimeo','backup'].map(mode=>({dataset:{videoMode:mode},setAttribute(name,value){this[name]=value;}}));
 const native={hidden:true,src:'',plays:0,loads:0,pauses:0,pause(){this.pauses++;},load(){this.loads++;},play(){this.plays++;return Promise.resolve();},removeAttribute(){this.src='';},getAttribute(){return this.src||null;},addEventListener(type,fn){handlers[type]=fn;}};
 const context={activeProjectPlayback:{video:'https://player.vimeo.com/video/123?h=original',videoFallback:'https://media.example/film.mp4'},projectVideo:{src:'',hidden:false},projectNative:native,projectPlaybackError:{hidden:true},projectVideoSwitch:{querySelectorAll:()=>buttons,addEventListener(type,fn){handlers[type]=fn;}}};
 const api=vm.runInNewContext(source+';({resetProjectPlayback,selectProjectPlayback})',context);
 return {...context,...api,handlers,buttons};
}
test('default Vimeo selection does not start a backup download',()=>{
 const f=fixture();f.selectProjectPlayback('vimeo');
 assert.equal(f.projectVideo.src,'https://player.vimeo.com/video/123?h=original');
 assert.equal(f.projectNative.src,'');assert.equal(f.projectNative.hidden,true);assert.equal(f.projectNative.plays,0);
});
test('backup starts only on selection and detaches Vimeo',()=>{
 const f=fixture();f.selectProjectPlayback('backup',true);
 assert.equal(f.projectNative.src,'https://media.example/film.mp4');assert.equal(f.projectNative.plays,1);
 assert.equal(f.projectVideo.src,'about:blank');assert.equal(f.projectVideo.hidden,true);
 assert.equal(f.buttons[1]['aria-pressed'],'true');
});
test('switching back restores the original Vimeo and releases native media',()=>{
 const f=fixture();f.selectProjectPlayback('backup',true);f.selectProjectPlayback('vimeo');
 assert.equal(f.projectNative.src,'');assert.equal(f.projectVideo.hidden,false);
 assert.equal(f.projectVideo.src,'https://player.vimeo.com/video/123?h=original');
});
test('leaving a project releases both players and ignores late media errors',()=>{
 const f=fixture();f.selectProjectPlayback('backup',true);f.resetProjectPlayback();f.handlers.error();
 assert.equal(f.projectNative.src,'');assert.equal(f.projectNative.hidden,true);
 assert.equal(f.projectVideo.src,'about:blank');assert.equal(f.projectPlaybackError.hidden,true);
});
test('backup failure is shown only for the active backup',()=>{
 const f=fixture();f.selectProjectPlayback('backup');f.handlers.error();assert.equal(f.projectPlaybackError.hidden,false);
 f.selectProjectPlayback('vimeo');f.handlers.error();assert.equal(f.projectPlaybackError.hidden,true);
});

const projectSource=main.slice(main.indexOf('function getProject('),main.indexOf('function getMediaLayout('));
test('full-frame detail covers retain custom images and explicit video hiding',()=>{
 const get=override=>vm.runInNewContext(projectSource+'; getProject("eqlz")',{
  projects:{eqlz:{image:'/assets/covers/cover_1.png',video:'https://player.vimeo.com/video/123',videoFallback:'https://media.example/film.mp4'}},readEditableProject:()=>override
 });
 assert.equal(get({}).image,'/assets/covers/cover_1.detail.webp');
 assert.equal(get({image:'/assets/uploads/custom.png'}).image,'/assets/uploads/custom.png');
 assert.equal(get({video:''}).videoFallback,'');
 assert.equal(get({image:'http://127.0.0.1:4173/assets/covers/cover_1.png'}).image,'/assets/covers/cover_1.detail.webp');
});
