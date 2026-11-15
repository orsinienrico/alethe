/* ALETHE — logica di gioco, stato persistente, client auth, deep link, countdown.
   Dipende da js/data.js (var sets, var proSet) e js/card.js (makeShareCard). Nessun handler inline. */
var DEFAULTS={credits:0,streak:0,best:0,bestCombo:0,lastPlayed:null,rounds:0,pro:false,history:[],user:null,savePromptShown:false};
var S=(function(){try{var raw=localStorage.getItem('alethe_state');if(raw){var o=JSON.parse(raw);for(var k in DEFAULTS){if(!(k in o))o[k]=DEFAULTS[k]}return o}}catch(e){}return JSON.parse(JSON.stringify(DEFAULTS))})();
function save(){try{localStorage.setItem('alethe_state',JSON.stringify(S))}catch(e){}}
var LEVELS=[[0,'Reader'],[100,'Observer'],[300,'Analyst'],[700,'Skeptic'],[1500,'Alethean']];
var LAUNCH_DATE=new Date(2026,10,14);
function levelOf(c){var l=1,n='Reader';for(var z=0;z<LEVELS.length;z++){if(c>=LEVELS[z][0]){l=z+1;n=LEVELS[z][1]}}return{n:l,name:n}}
function levelProgress(c){var idx=levelOf(c).n-1;if(idx>=LEVELS.length-1)return 1;var from=LEVELS[idx][0],to=LEVELS[idx+1][0];return (c-from)/(to-from)}
function creditsToNext(c){var idx=levelOf(c).n-1;if(idx>=LEVELS.length-1)return 0;return LEVELS[idx+1][0]-c}

var set=0,stories=sets[0].stories,i=0,score=0,answers=[],answered=false,startX=0,startY=0,curX=0,drag=false,lastTrail=0,lastShareText='',combo=0,practice=false,roundCredits=0;
function el(id){return document.getElementById(id)}
function show(id){var ids=['intro','game','reveal','result','dossier'];for(var z=0;z<ids.length;z++){el(ids[z]).classList.remove('active')}el(id).classList.add('active')}
function openInfo(){openModal('infoModal')}
function closeInfo(){closeModal('infoModal')}
function openModal(id){el(id).classList.add('open')}
function closeModal(id){el(id).classList.remove('open')}

/* ---------- sfida #N e deep link: ?ref=Nome&s=124&score=85 ---------- */
function challengeNumber(){var d=new Date(),base=new Date(LAUNCH_DATE.getFullYear(),LAUNCH_DATE.getMonth(),LAUNCH_DATE.getDate());var days=Math.floor((new Date(d.getFullYear(),d.getMonth(),d.getDate())-base)/86400000);return days+1}
function shortDate(){var d=new Date();return pad(d.getDate())+' '+['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}
function qparam(name){var m=location.search.match(new RegExp('[?&]'+name+'=([^&]+)'));return m?decodeURIComponent(m[1].replace(/\+/g,' ')):null}
var CH={ref:qparam('ref'),score:parseInt(qparam('score')||'',10),set:qparam('s')};
function challengeUrl(pct){
  var base=(location.protocol.indexOf('http')===0?location.origin+location.pathname:'');
  if(!base||set>=sets.length)return '';
  var who=S.user?S.user.name:'Alethe';
  return base+'?ref='+encodeURIComponent(who)+'&s='+sets[set].id+'&score='+pct;
}
function rematchUrl(){if(!CH.ref||!CH.set)return '';var base=(location.protocol.indexOf('http')===0?location.origin+location.pathname:'');return base?base+'?ref='+encodeURIComponent(CH.ref)+'&s='+CH.set+'&score='+CH.score:''}
function challengeSetIndex(){if(!CH.set)return -1;for(var z=0;z<sets.length;z++){if(sets[z].id===CH.set)return z}return -1}

/* ---------- data / streak (tutto sul fuso locale) ---------- */
function todayStr(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function bumpStreak(){if(S.lastPlayed===todayStr())return S.streak;var y=new Date();y.setDate(y.getDate()-1);var yd=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();S.streak=(S.lastPlayed===yd)?S.streak+1:1;S.lastPlayed=todayStr();save();return S.streak}
function dailyIndex(){var d=new Date();var local=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();return Math.floor(local/86400000)%sets.length}
function streakAtRisk(){var d=new Date();if(S.streak<=0||S.lastPlayed===todayStr())return false;return d.getHours()>=18}
function refreshChips(){var nums=document.querySelectorAll('.streak-num');for(var z=0;z<nums.length;z++){nums[z].textContent=S.streak}var chips=document.querySelectorAll('.streak-chip');for(var c=0;c<chips.length;c++){chips[c].classList.toggle('lit',S.streak>0)}}

/* ---------- render base ---------- */
function pill(){el('gamePill').textContent=practice?'Allenamento':'Sfida #'+challengeNumber()}
function clearChoice(){var buttons=document.querySelectorAll('.choice');for(var n=0;n<buttons.length;n++){buttons[n].classList.remove('real-tap','doubt-tap')}}
function progress(){var p=el('progress');p.innerHTML='';for(var x=0;x<stories.length;x++){var d=document.createElement('span');if(x<i)d.className='done';if(x===i)d.className='current';p.appendChild(d)}}
function renderMeter(){var w=el('comboMeterWrap');if(combo>0){w.classList.remove('hidden')}else{w.classList.add('hidden')}var m=el('comboMeter');var sp=m.querySelectorAll('span');for(var z=0;z<sp.length;z++){sp[z].classList.toggle('filled',combo>z)}}
var CAT_COLORS={'Scienza':'#00E5C0','Natura':'#00E5C0','Corpo umano':'#00E5C0','Sport':'#00E5C0','Psicologia':'#00E5C0','Italia':'#FFD166','Storia':'#FFD166','Cibo':'#FFD166','Cultura':'#FFD166','Arte':'#FFD166','Spazio':'#7C6CFF','Europa':'#7C6CFF','UE':'#7C6CFF','Lingue':'#7C6CFF','Geografia':'#7C6CFF','AI':'#7C6CFF','Social':'#7C6CFF','Ricerca':'#7C6CFF'};
function catColor(k){var seg=(k||'').split(' · ')[0];return CAT_COLORS[seg]||'#E6C77D'}
function render(){answered=false;clearChoice();pill();refreshChips();renderMeter();var st=stories[i];el('storyCount').textContent='Storia '+(i+1)+' di '+stories.length;el('kicker').textContent=st.k;el('kicker').style.color=catColor(st.k);el('title').textContent=st.t;el('source').textContent=st.s;var c=el('storyCard');c.className='story-card nudge';c.classList.toggle('onfire',combo>=3);c.style.setProperty('--cat',catColor(st.k));c.style.transform='';c.style.opacity='1';progress()}
function startGame(asPractice){
  practice=!!asPractice||S.lastPlayed===todayStr();
  var cs=challengeSetIndex();
  set=cs>=0?cs:dailyIndex();
  var base=sets[set].stories;
  var lv=levelOf(S.credits).n;
  if(!practice&&lv>=3&&base.length>=5){
    var soft=proSet.stories[(dayOfSet(set)+lv-2)%proSet.stories.length];
    base=base.slice(0,base.length-1).concat([soft]);
  }
  stories=base;
  i=0;score=0;answers=[];combo=0;roundCredits=0;render();show('game');
}
function dayOfSet(idx){var d=new Date();var local=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();return (Math.floor(local/86400000)+idx)%proSet.stories.length}
function startProSet(){if(!isPro()){openPaywall();return}set=sets.length;stories=proSet.stories;i=0;score=0;answers=[];combo=0;roundCredits=0;practice=false;render();show('game')}
function tapFx(value){clearChoice();var b=document.querySelector('.choice[data-answer="'+value+'"]');if(b)b.classList.add(value==='real'?'real-tap':'doubt-tap')}
function answer(value){
  if(answered)return;answered=true;tapFx(value);
  var instr=el('swipeInstruction');if(instr)instr.classList.add('gone');
  var st=stories[i],ok=value===st.truth;
  answers.push({ok:ok,cat:(st.k||'').split(' · ')[0]});
  if(ok){score++;combo++;if(!practice)roundCredits+=(combo>=4?37:combo>=3?30:15);if(combo===3)showCombo();else if(combo>3)el('comboBanner').classList.add('show');S.bestCombo=Math.max(S.bestCombo||0,combo);renderMeter()}
  else{if(combo>=3)toast('A fuoco perso a '+combo);combo=0;renderMeter()}
  if(window.navigator&&navigator.vibrate)try{navigator.vibrate(ok?18:[28,40,28])}catch(e){}
  setTimeout(function(){
    clearChoice();hideCombo();
    var r=el('reveal');r.className='screen reveal '+(ok?'success':'fail')+' '+(st.truth==='real'?'truth-real':'truth-doubt');
    el('truthChip').textContent=st.truth==='real'?'La notizia era reale':'La notizia non tornava';
    el('verdict').textContent=ok?'GIUSTO':'SBAGLIATO';
    el('revealHeadline').textContent=st.h;
    el('revealExplanation').textContent=st.e;
    el('revealStep').textContent=(i+1)+' / '+stories.length;
    el('nextBtn').textContent=i===stories.length-1?'Scopri il tuo punteggio':'Prossima storia';
    if(!ok)shake(el('revealHeadline'));
    show('reveal')
  },200)
}
function backToIntro(){resetRound();show('intro')}
function goHome(){resetRound();show('intro')}
function mission(){var st=el('missionState'),tx=el('missionText');if(!st)return;var cur=set<sets.length?sets[set]:null;var theme=cur?' «'+cur.theme+'».':'.';if(S.lastPlayed===todayStr()){st.textContent='COMPLETATA';st.classList.add('done');tx.textContent='+25 crediti incassati. Torna domani: nuovo tema, nuovo dossier.'}else{st.textContent='DA FARE';st.classList.remove('done');tx.textContent='+25 crediti. Fai 4/5 e sblocchi il dossier del giorno:'+theme}}
function introCta(){var cur=set<sets.length?sets[set]:null;el('startBtn').textContent=S.lastPlayed===todayStr()?'Allenamento libero':(cur?'Gioca «'+cur.theme+'»':'Scopri la prima storia')}
function shuffle(a){for(var z=a.length-1;z>0;z--){var y=Math.floor(Math.random()*(z+1));var t=a[z];a[z]=a[y];a[y]=t}}
function pool(){var all=[];for(var z=0;z<sets.length;z++){all=all.concat(sets[z].stories)}if(isPro())all=all.concat(proSet.stories);return all}
function resetRound(){i=0;score=0;answers=[];combo=0;roundCredits=0;answered=false;renderMeter()}
function nextStory(){clearChoice();i++;if(i>=stories.length){result();show('result')}else{render();show('game')}}
function shake(elm){if(!elm)return;elm.classList.remove('shake');void elm.offsetWidth;elm.classList.add('shake')}

/* ---------- risultato ---------- */
function meta(r){if(r<=0)return['Modalità zio','Oggi ti hanno portato a spasso.','Tranquillo: capita ai migliori. Ma non mandarla subito allo zio.',18];if(r<.4)return['Occhio in rodaggio','Qualcosa l’hai vista. Le altre ti hanno lavorato bene.','Hai avuto un lampo. Poi la realtà ha fatto il resto.',34];if(r<.6)return['Dubbio attivo','Hai iniziato a vedere lo schema.','Non male: il radar si è acceso, ma ogni tanto fa buffering.',52];if(r<.8)return['Giudizio stabile','Il tuo giudizio ha retto.','Abbastanza per sfottere qualcuno, non abbastanza per fare il professore.',68];if(r<1)return['Quasi inattaccabile','Hai visto ciò che molti hanno lasciato passare.','Oggi sei stato fastidiosamente bravo. Condividilo, ma con eleganza.',81];return['Alethean','Non ti è sfuggito nulla.','O sei lucidissimo o hai un patto segreto con la realtà.',94]}
function result(){
  var total=answers.length||stories.length,pct=Math.round(score/total*100),earned=25+roundCredits;
  var before=levelOf(S.credits).n;
  if(!practice){
    S.history=S.history.concat(answers).slice(-60);
    S.credits+=earned;S.rounds++;bumpStreak();if(pct>S.best)S.best=pct;save();
    var after=levelOf(S.credits);
    if(after.n>before)setTimeout(function(){levelUpFx(after.n,after.name)},900);
    syncScore(sets[set].id,pct,score,total,earned);
  }
  countUp(el('scorePercent'),pct);
  el('scoreDetail').textContent=score+(score===1?' corretta':' corrette')+' su '+total;
  el('scoreRing').style.setProperty('--scorePct',pct);
  el('creditsEarned').textContent=practice?'Allenamento':'+'+earned+' crediti';
  var lv=levelOf(S.credits);
  el('levelText').textContent='Livello '+lv.n+' · '+lv.name;
  el('levelBar').style.width=Math.round(levelProgress(S.credits)*100)+'%';
  el('streakText').textContent=practice?'Niente streak in allenamento':'Streak '+S.streak+' giorno'+(S.streak===1?'':'i');
  el('rankText').textContent='+'+creditsToNext(S.credits)+' cr al livello '+(lv.n+1);
  var m=meta(score/total);
  el('badge').textContent=practice?'ALLENAMENTO':m[0];
  el('scoreCopy').textContent=practice?'Allenamento libero: niente crediti, niente pressione.':m[1];
  var g=el('shareGrid');g.innerHTML='';
  for(var a=0;a<answers.length;a++){var t=document.createElement('span');t.className=answers[a]?'hit':'miss';g.appendChild(t)}
  el('tomorrow').textContent=practice?'Sfida di oggi già giocata: torna domani per i crediti.':'Torna domani: streak '+S.streak+' da difendere.';
  var cr=el('challengeResult');
  var loss=CH.ref&&CH.score!=null&&!practice&&pct<=CH.score;
  if(CH.ref&&CH.score!=null&&!practice){
    cr.classList.remove('hidden');
    if(pct>CH.score){cr.textContent='🏆 Hai battuto '+CH.ref+' ('+CH.score+'%) con '+pct+'%';}
    else{cr.textContent='Quasi! '+CH.ref+' ha fatto '+CH.score+'%.'}
  }else{cr.classList.add('hidden')}
  if(pct>=80||(CH.ref&&CH.score!=null&&pct>CH.score))setTimeout(function(){confetti(pct===100?130:70)},350);
  el('shareBtn').textContent=loss?'Rivincita con '+CH.ref:'Sfida qualcuno';
  if(!S.user&&!practice&&!S.savePromptShown){S.savePromptShown=true;save();showSavePrompt(earned)}
  var db=el('dossierBtn'),cur=set<sets.length?sets[set]:null;
  if(!cur){db.classList.add('hidden')}
  else if(practice){db.classList.remove('hidden');db.classList.add('locked');db.textContent='🔒 Il dossier si sblocca solo nella sfida quotidiana'}
  else if(score>=4){db.classList.remove('hidden','locked');db.textContent='🔓 Leggi il dossier del giorno: «'+cur.theme+'»'}
  else{db.classList.remove('hidden');db.classList.add('locked');db.textContent='🔒 Dossier non sbloccato: servivano 4 su 5 ('+score+'/5)'}
  lastShareText=buildShareText('share');
}
function showSavePrompt(earned){var p=el('savePrompt');el('savePromptText').textContent='Hai guadagnato +'+earned+' crediti. Crea un account per non perderli ed entrare in classifica.';p.classList.remove('hidden')}
function nextChallenge(){i=0;score=0;answers=[];combo=0;roundCredits=0;render();show('intro');mission();introCta()}
function openDossier(){var cur=set<sets.length?sets[set]:null;if(!cur)return;el('dossierTheme').textContent=cur.theme;el('dossierLead').textContent=cur.lead;el('dossierKicker').textContent='IL DOSSIER DEL GIORNO — SFIDA #'+challengeNumber();var art=el('dossierArticle');art.innerHTML='';for(var z=0;z<cur.dossier.length;z++){var p=document.createElement('p');p.className='dossier-p';p.textContent=cur.dossier[z];art.appendChild(p)}show('dossier')}
function replay(){practice=true;var p=pool(),exclude=stories.map(function(s){return s.t});var avail=p.filter(function(s){return exclude.indexOf(s.t)<0});shuffle(avail);stories=avail.slice(0,Math.min(5,avail.length));set=sets.length;i=0;score=0;answers=[];combo=0;roundCredits=0;render();show('game');toast('Allenamento: 5 storie a caso dal pool, niente crediti')}

/* ---------- countdown alla prossima sfida ---------- */
function pad(n){return n<10?'0'+n:''+n}
function tickCountdown(){var now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);var s=Math.max(0,Math.floor((mid-now)/1000));var clock=pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60);var c=el('countdown');if(c)c.textContent=clock;var ic=el('introCountdown');if(ic&&!ic.classList.contains('hidden'))ic.textContent='⏳ Prossima sfida tra '+clock}
setInterval(tickCountdown,1000);

/* ---------- animazioni ---------- */
function countUp(elm,to){var started=null;function step(ts){if(!started)started=ts;var p=Math.min(1,(ts-started)/900),e=p<.5?2*p*p:-1+(4-2*p)*p;elm.textContent=Math.round(to*e);if(p<1)requestAnimationFrame(step);else elm.textContent=to}requestAnimationFrame(step)}
function confetti(n){if(reducedMotion())return;var colors=['#00E5C0','#7C6CFF','#FFD166','#EAF2FF','#FF4D6D'];var box=el('confetti');for(var z=0;z<n;z++){var d=document.createElement('span');d.className='cf';d.style.left=(Math.random()*100)+'%';d.style.background=colors[z%colors.length];d.style.animationDelay=(Math.random()*.45)+'s';d.style.animationDuration=(1.5+Math.random()*1.3)+'s';d.style.transform='rotate('+(Math.random()*360)+'deg)';box.appendChild(d);(function(node){setTimeout(function(){if(node.parentNode)node.parentNode.removeChild(node)},3400)})(d)}}
function reducedMotion(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
function levelUpFx(n,name){var o=el('levelUp');el('levelUpNum').textContent=n;el('levelUpName').textContent=name;o.classList.add('show');confetti(50);setTimeout(function(){o.classList.remove('show')},2200)}
function showCombo(){var b=el('comboBanner');b.textContent='🔥 A FUOCO — crediti ×2';b.classList.add('show');setTimeout(function(){b.classList.remove('show')},1700)}
function hideCombo(){el('comboBanner').classList.remove('show')}

/* ---------- share: leggibile senza contesto, sfida verso il ricevente ---------- */
function shareGridText(){var g='';for(var b=0;b<answers.length;b++){g+=answers[b]?'✅':'❌'}return g}
function buildShareText(kind){
  var total=answers.length||stories.length,pct=Math.round(score/total*100);
  var m=meta(score/total);
  var head=kind==='challenge'?'🧠 Ti sfido su ALETHE: vediamo se riconosci una bugia meglio di me.':'🧠 ALETHE — Sfida #'+challengeNumber()+' · '+shortDate();
  var tail=kind==='challenge'?'5 storie, 2 minuti: batti questo score.':'Reale o non torna? Scoprilo qui.';
  return head+'\n\n'+shareGridText()+'\nLucidità '+pct+'% · Streak '+S.streak+' 🔥\n«'+m[1]+'»\n\n'+tail
}
function shareText(kind){
  var text=buildShareText(kind);lastShareText=text;
  var total=answers.length||stories.length,pct=Math.round(score/total*100);
  var link=challengeUrl(pct);
  try{
    if(window.navigator&&window.navigator.share){
      window.navigator.share({title:'ALETHE',text:text,url:link||undefined}).then(function(){toast('Condiviso')}).catch(function(){safeCopy(text)})
    }else{safeCopy(text)}
  }catch(err){safeCopy(text)}
}
function shareCard(){
  var loss=CH.ref&&CH.score!=null&&!practice&&score/(answers.length||stories.length)*100<=CH.score;
  if(loss&&rematchUrl()){var t=buildShareText('challenge');safeCopy(t);location.assign(rematchUrl());return}
  var total=answers.length||stories.length,pct=Math.round(score/total*100),earned=25+roundCredits;
  var m=meta(score/total);
  var data={pct:pct,detail:score+(score===1?' corretta':' corrette')+' su '+total,earned:earned,grid:answers.map(function(a){return a.ok}),streak:practice?0:S.streak,url:challengeUrl(pct),challenge:CH.ref&&CH.score!=null?{name:CH.ref,score:CH.score,win:pct>CH.score}:null,quote:m[1],num:challengeNumber(),date:shortDate()};
  makeShareCard(data,function(blob){
    if(!blob){shareText('challenge');return}
    var file;try{file=new File([blob],'alethe-sfida-'+challengeNumber()+'.png',{type:'image/png'})}catch(e){}
    try{
      if(file&&window.navigator&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],text:'🧠 Lucidità '+pct+'% su ALETHE — battimi'}).then(function(){toast('Card condivisa')}).catch(function(){shareText('challenge')})
      }else if(file){
        var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='alethe-sfida-'+challengeNumber()+'.png';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url)},2500);
        safeCopy(buildShareText('challenge'));toast('Card scaricata + sfida copiata')
      }else{shareText('challenge')}
    }catch(err){shareText('challenge')}
  });
}

/* ---------- copy helpers ---------- */
function safeCopyScore(){safeCopy(lastShareText||buildShareText('share'))}
function safeCopy(text){try{if(window.navigator&&navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast('Sfida copiata')}).catch(function(){fallbackCopy(text)})}else{fallbackCopy(text)}}catch(e){fallbackCopy(text)}}
function fallbackCopy(text){try{var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('Sfida copiata')}catch(e){toast('Pronta')}}
function toast(t){el('toast').textContent=t;el('toast').classList.add('show');setTimeout(function(){el('toast').classList.remove('show')},1600)}

/* ---------- drag: pointercancel non risponde, scroll vince sulle gesture diagonali ---------- */
function addTrail(x,y,doubt){var now=Date.now();if(now-lastTrail<45)return;lastTrail=now;var dot=document.createElement('span');dot.className='dot'+(doubt?' doubt':'');var r=el('trail').getBoundingClientRect();dot.style.left=(x-r.left)+'px';dot.style.top=(y-r.top)+'px';el('trail').appendChild(dot);setTimeout(function(){if(dot.parentNode)dot.parentNode.removeChild(dot)},650)}
function down(e){drag=true;startX=e.clientX;startY=e.clientY;curX=startX;el('storyCard').classList.remove('nudge');if(window.PointerEvent&&el('cardArea').setPointerCapture){try{el('cardArea').setPointerCapture(e.pointerId)}catch(err){}}}
function move(e){if(!drag||answered)return;curX=e.clientX;var dx=curX-startX,dy=e.clientY-startY;if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)*1.4){drag=false;creset();return}var abs=Math.min(1,Math.abs(dx/130)),c=el('storyCard');c.classList.toggle('drag-real',dx>10);c.classList.toggle('drag-doubt',dx<-10);c.style.transform='translateX('+dx+'px) rotate('+(dx/28)+'deg) scale('+(1+abs*.025)+')';if(Math.abs(dx)>18)addTrail(e.clientX,e.clientY,dx<0)}
function creset(){var c=el('storyCard');c.style.transform='';c.classList.remove('drag-real','drag-doubt')}
function up(){if(!drag)return;drag=false;var dx=curX-startX,c=el('storyCard');if(Math.abs(dx)>90){c.style.transform='translateX('+(dx>0?520:-520)+'px) rotate('+(dx>0?14:-14)+'deg)';c.style.opacity='0';setTimeout(function(){answer(dx>0?'real':'notreal')},170)}else{creset()}}
function resetDrag(){drag=false;creset()}

/* ---------- auth: client + fallback demo ---------- */
function isPro(){return !!S.pro}
function apiPost(path,body,cb){try{fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body||{})}).then(function(r){return r.json()}).then(function(j){cb(j)}).catch(function(){cb(null)})}catch(e){cb(null)}}
function apiGet(path,cb){try{fetch(path,{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){cb(j)}).catch(function(){cb(null)})}catch(e){cb(null)}}
function demoUsers(){try{return JSON.parse(localStorage.getItem('alethe_users')||'{}')}catch(e){return{}}}
function demoSaveUser(email,rec){var u=demoUsers();u[email]=rec;try{localStorage.setItem('alethe_users',JSON.stringify(u))}catch(e){}}
function setUser(u){S.user={name:u.name||'Giocatore',email:u.email||'',plan:u.plan||'free'};S.pro=S.user.plan==='pro';save();refreshUser();refreshChips()}
function syncScore(setId,pct,correct,total,credits){if(!S.user)return;apiPost('/api/scores',{set_id:setId,pct:pct,correct:correct,total:total,credits:credits},function(){})}
function authErr(t){el('authErr').textContent=t||''}
function openAuth(){openModal('authModal');setAuthTab('login')}
function closeAuth(){closeModal('authModal')}
function setAuthTab(mode){var tabs=document.querySelectorAll('.tab');for(var z=0;z<tabs.length;z++){tabs[z].classList.toggle('active',tabs[z].getAttribute('data-tab')===mode)}el('nameField').classList.toggle('hidden',mode==='login');el('authSubmit').textContent=mode==='login'?'Accedi':'Crea account';el('authPass').setAttribute('autocomplete',mode==='register'?'new-password':'current-password');el('authModal').setAttribute('data-mode',mode);authErr('')}
function doAuth(){
  var mode=el('authModal').getAttribute('data-mode')||'login';
  var email=(el('authEmail').value||'').trim().toLowerCase(),pass=el('authPass').value||'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){authErr('Inserisci un’email valida');return}
  if(pass.length<8){authErr('La password deve avere almeno 8 caratteri');return}
  var name=(el('regName').value||'').trim()||email.split('@')[0];
  var btn=el('authSubmit');btn.disabled=true;
  var done=function(){btn.disabled=false};
  if(mode==='register'){
    apiPost('/api/auth/register',{email:email,name:name,password:pass},function(j){
      done();
      if(j&&j.user){setUser(j.user);closeAuth();toast('Benvenuto, '+j.user.name)}
      else if(j&&j.error){authErr(j.error)}
      else{var u=demoUsers();if(u[email]){authErr('Demo: questa email è già registrata in locale');return}demoSaveUser(email,{name:name,pass:pass});setUser({name:name,email:email});closeAuth();toast('Account demo creato (backend non collegato)')}
    })
  }else{
    apiPost('/api/auth/login',{email:email,password:pass},function(j){
      done();
      if(j&&j.user){setUser(j.user);closeAuth();toast('Bentornato, '+j.user.name)}
      else if(j&&j.error){authErr(j.error)}
      else{var u=demoUsers();if(!u[email]||u[email].pass!==pass){authErr('Demo: credenziali non valide in locale');return}setUser({name:u[email].name,email:email});closeAuth();toast('Login demo riuscito (backend non collegato)')}
    })
  }
}
function doLogout(){apiPost('/api/auth/logout',{},function(){S.user=null;S.pro=false;save();refreshUser();closeModal('profileModal');toast('Sei uscito')})}
function refreshUser(){
  var logged=!!S.user;
  el('authBtn').classList.toggle('hidden',logged);
  el('userBtn').classList.toggle('hidden',!logged);
  if(logged){el('userBtn').textContent=(S.user.name||'G').charAt(0).toUpperCase()}
  el('logoutBtn').classList.toggle('hidden',!logged);
  el('proTeaserFlag').textContent=isPro()?'PRO attivo':'Scopri';
}
function openProfile(){renderProfile();openModal('profileModal')}
function renderProfile(){
  var lv=levelOf(S.credits);
  el('profName').textContent=S.user?S.user.name:'Ospite';
  el('profPlan').textContent=isPro()?'ALETHE PRO':'Piano FREE';
  el('profPlan').classList.toggle('gold',isPro());
  el('profCredits').textContent=S.credits;el('profStreak').textContent=S.streak;el('profBest').textContent=S.best+'%';
  var bars=el('biasBars');bars.innerHTML='';
  var cats={};for(var z=0;z<S.history.length;z++){var h=S.history[z];if(!cats[h.c])cats[h.c]={ok:0,n:0};cats[h.c].n++;if(h.ok)cats[h.c].ok++}
  var keys=Object.keys(cats);
  if(!isPro()){el('biasLock').classList.remove('hidden');return}
  el('biasLock').classList.add('hidden');
  for(var y=0;y<keys.length&&y<4;y++){var c=cats[keys[y]],pct=Math.round(c.ok/c.n*100);var row=document.createElement('div');row.className='bias-row';row.innerHTML='<span>'+keys[y]+'</span><i><b style="width:'+pct+'%"></b></i><em>'+pct+'%</em>';bars.appendChild(row)}
  if(!keys.length)bars.innerHTML='<div class="bias-row"><span>Gioca una sfida per i primi dati</span></div>';
}
function openPaywall(){openModal('proModal')}
function tryProDemo(){S.pro=true;save();refreshUser();closeModal('proModal');toast('PRO attivato in demo')}
function buyPro(plan){
  var btn=el('proBuy');btn.disabled=true;btn.textContent='…';
  apiPost('/api/checkout',{plan:plan||'pro'},function(j){
    btn.disabled=false;btn.textContent='Attiva PRO';
    if(j&&j.url){location.assign(j.url);return}
    authErrInline(j&&j.message?j.message:'Checkout pronto al lancio: Stripe va collegato con il tuo account');
  })
}
function authErrInline(t){toast(t)}

/* ---------- binding ---------- */
function bind(){
  var buttons=document.querySelectorAll('.choice');
  for(var b=0;b<buttons.length;b++){buttons[b].onclick=function(){answer(this.getAttribute('data-answer'))};buttons[b].ontouchend=function(e){if(e&&e.preventDefault)e.preventDefault();answer(this.getAttribute('data-answer'));return false}}
  var area=el('cardArea');
  if(window.PointerEvent){area.addEventListener('pointerdown',down);area.addEventListener('pointermove',move);area.addEventListener('pointerup',up);area.addEventListener('pointercancel',resetDrag)}
  else{area.addEventListener('touchstart',function(e){startY=e.touches[0].clientY;down(e.touches[0])});area.addEventListener('touchmove',function(e){move(e.touches[0]);if(e.cancelable)e.preventDefault()},false);area.addEventListener('touchend',up);area.addEventListener('touchcancel',resetDrag)}
  var reveal=el('reveal');
  reveal.onclick=function(e){if(answered&&(e.target===reveal||e.target.id==='revealHeadline'||e.target.id==='revealExplanation'||e.target.id==='truthChip'||e.target.id==='verdict'))nextStory()};
  document.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&el('reveal').classList.contains('active')&&answered){e.preventDefault();nextStory()}});
  var infos=document.querySelectorAll('.info-btn');
  for(var n=0;n<infos.length;n++){infos[n].onclick=openInfo}
  var brands=document.querySelectorAll('.brand-btn');
  for(var br=0;br<brands.length;br++){brands[br].onclick=goHome}
  el('dossierBtn').onclick=function(){if(this.classList.contains('locked')){toast('Fai almeno 4/5 nella sfida di oggi per aprire il dossier');return}openDossier()};
  el('dossierBack').onclick=function(){show('result')};
  var chips=document.querySelectorAll('.streak-chip');
  for(var s=0;s<chips.length;s++){chips[s].onclick=openProfile}
  el('startBtn').onclick=startGame;
  el('backBtn').onclick=backToIntro;
  el('nextBtn').onclick=nextStory;
  el('shareBtn').onclick=shareCard;
  el('copyBtn').onclick=safeCopyScore;
  el('replayBtn').onclick=replay;
  el('modalClose').onclick=closeInfo;
  el('proTeaser').onclick=function(){closeInfo();isPro()?startProSet():openPaywall()};
  el('proStrip').onclick=function(){isPro()?startProSet():openPaywall()};
  el('authBtn').onclick=openAuth;
  el('userBtn').onclick=openProfile;
  el('authSubmit').onclick=doAuth;
  var tabs=document.querySelectorAll('.tab');
  for(var t=0;t<tabs.length;t++){tabs[t].onclick=function(){setAuthTab(this.getAttribute('data-tab'))}}
  el('logoutBtn').onclick=doLogout;
  el('profProBtn').onclick=openPaywall;
  var planBtns=document.querySelectorAll('.plan');
  for(var pb=0;pb<planBtns.length;pb++){(function(btn){btn.onclick=function(){var all=document.querySelectorAll('.plan');for(var q=0;q<all.length;q++){all[q].classList.toggle('selected',all[q]===btn)}}})(planBtns[pb])}
  el('proBuy').onclick=function(){var sel=document.querySelector('.plan.selected');buyPro(sel?sel.getAttribute('data-plan'):'annual')};
  el('proTry').onclick=tryProDemo;
  var xs=document.querySelectorAll('.modal-x');
  for(var mx=0;mx<xs.length;mx++){xs[mx].onclick=function(){var m=this.closest('.modal');if(m)closeModal(m.id)}}
  el('savePromptBtn').onclick=function(){closeSavePrompt();setAuthTab('register');openAuth()};
  el('recoveryPro').onclick=function(){closeModal('recoveryModal');openPaywall()};
  el('recoveryRestart').onclick=function(){S.streak=0;save();refreshChips();closeModal('recoveryModal');toast('Si riparte: la fiamma torna con la prima sfida')};
  var modals=document.querySelectorAll('.modal');
  for(var m=0;m<modals.length;m++){(function(mod){mod.onclick=function(e){if(e.target===mod)closeModal(mod.id)}})(modals[m])}
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var open=document.querySelector('.modal.open');if(open)closeModal(open.id)}});
}
function closeSavePrompt(){el('savePrompt').classList.add('hidden')}

/* ---------- init + stati intro ---------- */
set=dailyIndex();stories=sets[set].stories;pill();progress();bind();refreshChips();refreshUser();tickCountdown();mission();introCta();
if(CH.ref&&CH.score!=null){
  el('challengeBanner').classList.remove('hidden');
  el('challengeText').textContent='🧠 '+(CH.ref||'Un amico')+' ti ha sfidato: '+CH.score+'%. Batti questo score.';
  el('intro').classList.add('challenge-mode');
  el('h1').textContent=(CH.ref||'Un amico')+' ha fatto '+CH.score+'%.';
  el('heroCopy').textContent='Cinque storie, due minuti. Batti lo score e prendi la rivincita.';
  el('startBtn').textContent='Accetta la sfida';
}
if(S.lastPlayed===todayStr()){
  el('introCountdown').classList.remove('hidden');
}
if(streakAtRisk()){
  el('riskBanner').classList.remove('hidden');
  el('riskText').textContent='⚠️ Streak di '+S.streak+' giorni a rischio: la sfida di oggi scade a mezzanotte.';
}
if(S.streak>0&&S.lastPlayed&&S.lastPlayed!==todayStr()){
  var y=new Date();y.setDate(y.getDate()-1);
  if(S.lastPlayed!==y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate()){
    el('recoveryNum').textContent=S.streak;
    openModal('recoveryModal');
  }
}
if(S.user)apiGet('/api/auth/me',function(j){if(j&&j.user)setUser(j.user)});
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
