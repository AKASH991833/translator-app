/* LingoBridge - live MyMemory translation + heuristic detect + offline phrasebook. */
(()=>{
const $=s=>document.querySelector(s);
const LANGS=[['auto','Auto-detect'],['en','English'],['es','Spanish'],['fr','French'],['de','German'],['hi','Hindi'],['pt','Portuguese'],['it','Italian'],['ru','Russian'],['ja','Japanese'],['zh-CN','Chinese']];
const LOCALES={en:'en-US',es:'es-ES',fr:'fr-FR',de:'de-DE',hi:'hi-IN',pt:'pt-PT',it:'it-IT',ru:'ru-RU',ja:'ja-JP','zh-CN':'zh-CN'};
const PHRASES=['Hello, how are you?','Thank you very much','Where is the bathroom?','How much does this cost?','I don\'t understand','Can you help me?','What time is it?','I would like a coffee','Where is the train station?','Nice to meet you'];
const PHRASEBOOK={
 'es|hello':'hola','es|thank you':'gracias','es|goodbye':'adiós','es|good morning':'buenos días','es|please':'por favor','es|yes':'sí','es|no':'no','es|water':'agua',
 'fr|hello':'bonjour','fr|thank you':'merci','fr|goodbye':'au revoir','fr|good morning':'bonjour','fr|please':'s\'il vous plaît','fr|yes':'oui','fr|no':'non','fr|water':'eau',
 'de|hello':'hallo','de|thank you':'danke','de|goodbye':'auf wiedersehen','de|good morning':'guten morgen','de|please':'bitte','de|yes':'ja','de|no':'nein','de|water':'wasser',
 'hi|hello':'नमस्ते','hi|thank you':'धन्यवाद','hi|goodbye':'अलविदा','hi|good morning':'सुप्रभात','hi|please':'कृपया','hi|yes':'हाँ','hi|no':'नहीं','hi|water':'पानी',
 'pt|hello':'olá','pt|thank you':'obrigado','pt|goodbye':'tchau','pt|good morning':'bom dia','pt|please':'por favor','pt|yes':'sim','pt|no':'não','pt|water':'água',
 'it|hello':'ciao','it|thank you':'grazie','it|goodbye':'arrivederci','it|good morning':'buongiorno','it|please':'per favore','it|yes':'sì','it|no':'no','it|water':'acqua',
 'ru|hello':'привет','ru|thank you':'спасибо','ru|goodbye':'до свидания','ru|good morning':'доброе утро','ru|please':'пожалуйста','ru|yes':'да','ru|no':'нет','ru|water':'вода',
 'ja|hello':'こんにちは','ja|thank you':'ありがとう','ja|goodbye':'さようなら','ja|good morning':'おはよう','ja|please':'お願いします','ja|yes':'はい','ja|no':'いいえ','ja|water':'水',
 'zh-CN|hello':'你好','zh-CN|thank you':'谢谢','zh-CN|goodbye':'再见','zh-CN|good morning':'早上好','zh-CN|please':'请','zh-CN|yes':'是','zh-CN|no':'不','zh-CN|water':'水',
};
const STOPW={
 en:['the','is','and','you','are','of','to','in','it','that'],
 es:['el','la','es','y','de','que','en','un','una','los'],
 fr:['le','la','est','et','de','que','en','un','une','les','je'],
 de:['der','die','ist','und','das','ich','nicht','ein','eine','zu'],
 pt:['o','a','é','e','de','que','em','um','uma','você'],
 it:['il','la','è','e','di','che','in','un','una','non'],
 hi:[],ru:[],ja:[],'zh-CN':[]};
function detect(text){
  if(/[\u0900-\u097F]/.test(text))return'hi';
  if(/[\u0400-\u04FF]/.test(text))return'ru';
  if(/[\u3040-\u30FF]/.test(text))return'ja';
  if(/[\u4E00-\u9FFF]/.test(text))return'zh-CN';
  const ws=text.toLowerCase().replace(/[^a-zà-ÿ\s]/g,' ').split(/\s+/);
  let best='en',bs=0;
  Object.entries(STOPW).forEach(([l,st])=>{const s=ws.filter(w=>st.includes(w)).length;if(s>bs){bs=s;best=l;}});
  return best;
}
const srcSel=$('#srcLang'),dstSel=$('#dstLang');
LANGS.forEach(([v,n])=>{srcSel.add(new Option(n,v));if(v!=='auto')dstSel.add(new Option(n,v));});
srcSel.value='auto';dstSel.value='es';
let hist=JSON.parse(localStorage.getItem('lingobridge-hist')||'[]');
let cache=JSON.parse(localStorage.getItem('lingobridge-cache')||'{}');
const saveH=()=>localStorage.setItem('lingobridge-hist',JSON.stringify(hist.slice(0,40)));
const saveC=()=>localStorage.setItem('lingobridge-cache',JSON.stringify(cache));
let online=true,seq=0;
function setBadge(){const b=$('#liveBadge');b.className='badge-live'+(online?'':' off');b.innerHTML='<i></i>'+(online?'LIVE':'OFFLINE MODE');}
async function translate(){
  const q=$('#src').value.trim(),out=$('#out');
  const my=++seq;
  if(!q){out.textContent='Translation appears here';out.className='output placeholder';$('#detected').textContent='';return;}
  let src=srcSel.value;
  if(src==='auto'){src=detect(q);const nm=LANGS.find(l=>l[0]===src);
    $('#detected').textContent='Detected: '+nm[1]+' (heuristic)';}else $('#detected').textContent='';
  let dst=dstSel.value;if(dst===src)dst=src==='en'?'es':'en';
  const key=src+'|'+dst+'|'+q.toLowerCase();
  if(cache[key]){show(cache[key],true);return;}
  // offline phrasebook first for exact hits
  const pb=PHRASEBOOK[dst+'|'+q.toLowerCase()];
  if(pb&&!navigator.onLine){show(pb,true,true);return;}
  try{
    const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),9000);
    const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(q)+'&langpair='+src+'|'+dst,{signal:ctrl.signal});
    clearTimeout(to);
    const j=await r.json();
    if(my!==seq)return;
    if(j.responseStatus===200&&j.responseData&&j.responseData.translatedText){
      const t=j.responseData.translatedText;
      online=true;setBadge();show(t);
      cache[key]=t;saveC();
      hist.unshift({q,t,src,dst,ts:Date.now()});saveH();renderHist();
    }else throw new Error('quota');
  }catch(e){
    if(my!==seq)return;
    online=false;setBadge();
    const fb=PHRASEBOOK[dst+'|'+q.toLowerCase()]||PHRASEBOOK[dst+'|'+q.toLowerCase().replace(/[.!?]$/,'')] ;
    show(fb||'(offline - translation unavailable. Common phrases work from the built-in phrasebook.)',true,true);
  }
}
function show(t,cached,fallback){
  const out=$('#out');out.textContent=t;out.className='output';
  if(fallback)out.classList.add('placeholder');
}
let deb;
$('#src').oninput=e=>{
  $('#count').textContent=e.target.value.length+' / 2000';
  clearTimeout(deb);deb=setTimeout(translate,450);};
$('#src').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))translate();});
srcSel.onchange=translate;dstSel.onchange=translate;
$('#swap').onclick=()=>{
  const s=srcSel.value==='auto'?detect($('#src').value||'hello'):srcSel.value;
  const d=dstSel.value;
  srcSel.value=d;dstSel.value=s;
  const sv=$('#src').value;
  const ot=$('#out');
  if(!ot.classList.contains('placeholder')&&ot.textContent){$('#src').value=ot.textContent;}
  translate();};
$('#clear').onclick=()=>{$('#src').value='';$('#count').textContent='0 / 2000';translate();$('#src').focus();};
$('#copy').onclick=()=>{const t=$('#out');if(!t.classList.contains('placeholder')){navigator.clipboard.writeText(t.textContent);toast('Copied');}};
$('#paste').onclick=async()=>{try{$('#src').value=await navigator.clipboard.readText();$('#count').textContent=$('#src').value.length+' / 2000';translate();}catch(e){toast('Clipboard blocked by browser');}};
const speak=(el,lang)=>{const t=typeof el==='string'?el:el.value||el.textContent;if(!t)return;
  try{const u=new SpeechSynthesisUtterance(t);u.lang=LOCALES[lang]||'en-US';speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}};
$('#speakSrc').onclick=()=>{const s=srcSel.value==='auto'?detect($('#src').value):srcSel.value;speak($('#src').value,s);};
$('#speakDst').onclick=()=>{if(!$('#out').classList.contains('placeholder'))speak($('#out').textContent,dstSel.value);};
function renderHist(){
  const el=$('#history');
  if(!hist.length){el.innerHTML='<p style="font-size:13.5px;color:var(--muted)">No translations yet.</p>';return;}
  el.innerHTML=hist.slice(0,12).map((h,i)=>`<div class="hist-row" data-i="${i}">
    <span class="h-pair">${h.src} → ${h.dst}</span>
    <span class="h-s">${h.q.replace(/</g,'&lt;').slice(0,60)}</span>
    <span class="h-t">${h.t.replace(/</g,'&lt;').slice(0,60)}</span></div>`).join('');
  el.querySelectorAll('.hist-row').forEach(row=>row.onclick=()=>{
    const h=hist[+row.dataset.i];
    $('#src').value=h.q;srcSel.value=h.src;dstSel.value=h.dst;
    $('#count').textContent=h.q.length+' / 2000';translate();window.scrollTo({top:0,behavior:'smooth'});});
}
$('#clearHist').onclick=()=>{hist=[];saveH();renderHist();};
const pg=$('#phrases');
PHRASES.forEach(p=>{const b=document.createElement('button');b.className='phrase';b.textContent=p;
  b.onclick=()=>{$('#src').value=p;$('#count').textContent=p.length+' / 2000';translate();window.scrollTo({top:0,behavior:'smooth'});};pg.append(b);});
renderHist();setBadge();
})();
