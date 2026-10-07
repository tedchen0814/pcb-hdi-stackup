const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/ted.chen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(html.includes('data:image/png;base64,'), 'Source image must be embedded.');
const server = http.createServer((req,res) => { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html); });
const checks = [];
let browser;
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await check('Initial structure and embedded image',async()=>{
  assert.equal(await page.locator('#drawing [data-item]').count(),21);
  assert.equal(await page.locator('#beginner, #engineer').count(),0,'Single merged explanation mode');
  assert.equal(await page.locator('#sourceImage').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 });
 await check('Beginner and engineering explanations shown together',async()=>{
  assert(await page.locator('#readoutBody').isVisible());assert(await page.locator('#engineering').isVisible());
  assert((await page.locator('#fact').innerText()).includes('0.0635'));
 });
 await check('Layer selection, exploded view and thickness scale',async()=>{
  await page.click('[data-select="D1"]');assert((await page.locator('#readoutTitle').innerText()).includes('1037MR'));
  await page.click('[data-action="expand"]');assert((await page.locator('#drawing').textContent()).includes('展開顯示'));
  await page.click('[data-action="scale"]');assert.equal(await page.locator('[data-action="scale"]').getAttribute('aria-pressed'),'true');
  await page.click('[data-action="expand"]');await page.click('[data-action="scale"]');
 });
 await page.screenshot({path:path.join(root,'preview-desktop.png'),fullPage:true});
 await check('Material steps and paused playback',async()=>{
  await page.click('[data-chapter="material"]');await page.click('#next');
  assert((await page.locator('#readoutTitle').innerText()).includes('填平'));
  await page.click('#play');await page.waitForTimeout(350);await page.click('#play');
  assert.equal(await page.locator('#play .zh').innerText(),'▶ 播放');
  await page.click('[data-material="3"]');assert((await page.locator('#readoutTitle').innerText()).includes('Core'));
 });
 await check('Four distinct material illustrations and bilingual explanations',async()=>{
  const shapes=[];
  for(let i=0;i<4;i++){
   await page.click('[data-material="'+i+'"]');
   assert.equal(await page.locator('#drawing').getAttribute('data-material-stage'),String(i));
   shapes.push(await page.locator('#drawing').evaluate(el=>Array.from(el.querySelectorAll('rect,path,circle,line')).map(n=>n.outerHTML).join('')));
   for(const id of ['readoutTitle','readoutBody','purposeText'])assert((await page.locator('#'+id+' > .en').textContent()).length>10);
   await page.screenshot({path:path.join(root,'preview-material-'+i+'.png'),fullPage:true});
  }
  assert.equal(new Set(shapes).size,4,'Geometry, not just captions, must differ');
  await page.click('[data-material="1"]');assert.equal(await page.locator('[data-material-part="press"]').count(),1);
  await page.click('[data-material="2"]');assert.equal(await page.locator('[data-material-part="press"]').count(),0);assert.equal(await page.locator('[data-material-part="bonded-stack"]').count(),1);
  await page.click('[data-material="3"]');assert.equal(await page.locator('[data-material-part="core-comparison"]').count(),1);assert.equal(await page.locator('[data-material-part="pp-comparison"]').count(),1);
  assert((await page.locator('#readoutBody .en').textContent()).includes('not the next step'));
 });
 await check('All 38 process frames, layer counts and controls',async()=>{
  await page.click('[data-chapter="process"]');
  for(let i=0;i<=37;i++){
   await page.locator('#scrub').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},i);
   assert((await page.locator('#progressText').innerText()).includes('步驟 '+(i+1)+' / 38'));
   const expected=i===0?2:i<33?2+2*(Math.floor((i-1)/8)+1):10;
   assert.equal(await page.locator('#drawing [data-item^="L"]').count(),expected);
   for(const id of ['readoutTitle','readoutBody','purposeText','engineeringText','fact','sourceStatus'])assert((await page.locator('#'+id+' > .en').textContent()).length>10,'English translation: '+id+' at step '+i);
  }
  await page.click('#restart');assert.equal(await page.locator('#scrub').inputValue(),'0');
  await page.click('[data-proc="25"]');await page.click('#next');
  assert((await page.locator('#readoutTitle').innerText()).includes('壓合'));
  await page.selectOption('#speed','2');
  assert((await page.locator('#pace').innerText()).includes('3.5 秒'));
  await page.click('#play');await page.waitForTimeout(3900);await page.click('#play');
  assert.equal(await page.locator('#scrub').inputValue(),'27');
 });
 await page.screenshot({path:path.join(root,'preview-process.png'),fullPage:true});
 await check('Via topology and quiz feedback',async()=>{
  await page.click('[data-chapter="via"]');await page.click('[data-via="through"]');
  assert((await page.locator('#drawing').textContent()).includes('其餘銅層避空'));
  await page.click('[data-answer="1"]');assert((await page.locator('#quizFeedback').innerText()).startsWith('答對'));
  await page.click('[data-via="stacked"]');assert((await page.locator('#drawing').textContent()).includes('中央孔待確認'));
  const bounds=await page.locator('#drawing > path').evaluateAll(ps=>ps.map(p=>p.getBBox().height));
  assert.equal(bounds.length,8,'Four top and four bottom microvias');
  assert(bounds.every(h=>h>15),'Every microvia spans dielectric, not only the copper band');
  await page.click('[data-via="staggered"]');
  const xs=await page.locator('#drawing > path').evaluateAll(ps=>ps.map(p=>Math.round(p.getBBox().x+p.getBBox().width/2)));
  assert.equal(xs.length,8,'Staggered view keeps eight microvias');
  assert.equal(new Set(xs).size,2,'Staggered microvias alternate between two positions');
  assert((await page.locator('#readoutTitle').innerText()).includes('錯位'));
  assert((await page.locator('#progressText').innerText()).includes('3 / 5'));
 });
 await check('Knowledge additions and shop-floor terms',async()=>{
  await page.click('[data-chapter="structure"]');
  await page.click('[data-select="L1"]');assert((await page.locator('#engineeringText').innerText()).includes('copper foil + plated'));
  await page.click('[data-select="D4"]');const fact=await page.locator('#fact').innerText();assert(fact.includes('1.86')&&fact.includes('2.06'),'HR vs MR observation');
  assert((await page.locator('#engineeringText').innerText()).includes('Dk'));
  assert((await page.locator('#notation').innerText()).includes('4+2+4'));
  await page.click('[data-chapter="process"]');await page.click('[data-proc="0"]');assert((await page.locator('#jargon').innerText()).includes('棕化'));
  await page.click('[data-proc="9"]');await page.click('#next');assert((await page.locator('#jargon').innerText()).includes('壓合'));
  await page.locator('#scrub').evaluate(el=>{el.value=36;el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#drawing [fill="undefined"]').count(),0,'Surface-finish colour must be defined');
  await page.click('[data-chapter="structure"]');assert(await page.locator('#jargon').isHidden());
 });
 await check('Source drawing sync, custom via route, process stats and scrub preview',async()=>{
  await page.click('[data-chapter="structure"]');await page.click('[data-select="D5"]');
  const hl=await page.locator('.src-hl').evaluate(el=>parseFloat(el.style.top));assert(Math.abs(hl-267/594*100)<0.1,'Core row highlighted');
  assert(await page.locator('#srcMini').evaluate(i=>i.complete&&i.naturalWidth>0));
  const box=await page.locator('#srcWrap').boundingBox();await page.mouse.click(box.x+box.width*0.5,box.y+box.height*(56/594));
  assert((await page.locator('#readoutTitle').innerText()).startsWith('L1'),'Clicking the drawing row selects L1');
  await page.click('[data-chapter="via"]');await page.click('[data-via="custom"]');
  assert.equal(await page.locator('#drawing > path').count(),4,'L3→L8 draws four microvias plus the central via box');
  assert((await page.locator('#readoutBody').innerText()).includes('5 段'));
  await page.selectOption('#vFrom','1');await page.selectOption('#vTo','4');
  assert.equal(await page.locator('#drawing > path').count(),3);assert(!(await page.locator('#drawing').textContent()).includes('中央孔待確認'));
  assert.equal(await page.locator('.route-steps span').count(),3);
  await page.click('[data-chapter="process"]');await page.click('[data-proc="17"]');await page.click('#next');
  const stats=await page.locator('#procStats').innerText();assert(stats.includes('8 / 10')&&stats.includes('3 / 4 次')&&stats.includes('4 / 8'),stats);
  const sb=await page.locator('#scrub').boundingBox();await page.mouse.move(sb.x+sb.width-2,sb.y+sb.height/2);
  assert((await page.locator('#scrubTip').innerText()).includes('步驟 38'));
  await page.click('[data-chapter="structure"]');assert(await page.locator('#procStats').isHidden());
 });
 await check('Expanded quiz and stack-up puzzle',async()=>{
  await page.click('[data-chapter="structure"]');
  assert((await page.locator('#quizProgress').innerText()).includes('/ 4'));
  for(const k of [0,1,0,0]){await page.click('#quizOptions [data-answer="'+k+'"]');assert.equal(await page.locator('#quizOptions .right').count(),1);await page.click('#quizNext');}
  assert((await page.locator('#quizQuestion').innerText()).includes('4 / 4'));
  await page.click('#quizNext');assert((await page.locator('#quizProgress').innerText()).includes('第 1 / 4'));
  await page.click('#quizOptions [data-answer="2"]');assert.equal(await page.locator('#quizOptions .wrong').count(),1);
  const answer=['1037MR','1067MR','1067MR','1037HR','Core','1037HR','1067MR','1067MR','1037MR'];
  await page.click('#pzCheck');assert((await page.locator('#pzMsg').innerText()).includes('空格'));
  for(let k=0;k<9;k++){await page.locator('#pzTray [data-chip]',{hasText:answer[k]}).first().click();await page.click('[data-slot="'+k+'"]');}
  await page.click('#pzCheck');assert((await page.locator('#pzMsg').innerText()).includes('全對'));
  await page.click('[data-slot="0"]');await page.click('[data-slot="8"]');assert.equal(await page.locator('#pzTray [data-chip]').count(),2);
  await page.click('#pzReset');assert.equal(await page.locator('#pzTray [data-chip]').count(),9);
  await page.click('#pzHint');assert(await page.locator('#pzHintBox').isVisible());
 });
 await check('Remaining-copper slider and aspect-ratio calculator',async()=>{
  const set=async(id,v)=>page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},v);
  assert((await page.locator('#cuTotal').innerText()).includes('0.772'),'70% reproduces the drawing total');
  await set('cuLayer','1');assert((await page.locator('#cuThk').innerText()).startsWith('2.41'));
  await set('cuRatio','30');assert((await page.locator('#cuThk').innerText()).startsWith('2.09'));
  assert((await page.locator('#cuTotal').innerText()).includes('0.707'));
  await set('cuRatio','10');assert((await page.locator('#cuTotal').innerText()).includes('0.674'),'10% reaches the lower tolerance edge');
  await set('cuRatio','70');await set('viaDia','60');
  assert.equal(await page.locator('#arBody tr').count(),4);
  assert.equal(await page.locator('#arBody tr.sel td.warn, #arBody tr.sel td.bad').count(),1,'61 µm deep / 60 µm is over 1:1');
  await set('viaDia','100');assert.equal(await page.locator('#arBody tr.sel td.ok').count(),1);
 });
 await check('No overflow on desktop and 390px mobile',async()=>{
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const chapter of ['structure','material','process','via']){
    await page.click('[data-chapter="'+chapter+'"]');
    const dimensions=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth}));
    assert(dimensions.w<=dimensions.v+1,chapter+' overflow at '+width);
   }
  }
  await page.setViewportSize({width:390,height:1000});await page.click('[data-chapter="structure"]');
 });
 await page.screenshot({path:path.join(root,'preview-mobile.png'),fullPage:true});
 await check('Bilingual material frames fit mobile and SVG bounds',async()=>{
  await page.click('[data-chapter="material"]');
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1100});
   for(let i=0;i<4;i++){
    await page.click('[data-material="'+i+'"]');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const clipped=await page.locator('#drawing text').evaluateAll(els=>els.filter(el=>getComputedStyle(el).display!=='none').map(el=>({text:el.textContent,b:el.getBBox()})).filter(({b})=>b.x<0||b.x+b.width>760||b.y<0||b.y+b.height>470).map(v=>v.text));
    assert.deepEqual(clipped,[],'SVG text clipping at width '+width+' in material view '+i);
   }
  }
  await page.setViewportSize({width:390,height:1000});await page.click('[data-material="3"]');
  await page.screenshot({path:path.join(root,'preview-material-mobile.png'),fullPage:true});
 });
 await check('Reduced-motion, file:// offline and remembered preferences',async()=>{
  const offline=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await offline.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href);
  await offline.click('[data-chapter="process"]');await offline.selectOption('#speed','1.5');
  await offline.reload();
  await offline.click('[data-chapter="process"]');assert.equal(await offline.locator('#speed').inputValue(),'1.5');await offline.click('#play');await offline.waitForTimeout(300);await offline.click('#play');
  assert.equal(requests.length,0);await offline.close();
 });
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({date:'2026-10-07',checks,runtimeErrors:errors,status:'passed'},null,2));
 console.log('Verified '+checks.length+' interaction groups; no browser runtime errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
