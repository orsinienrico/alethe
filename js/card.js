/* ALETHE — share card immagine: canvas 1080×1350, zero asset esterni.
   Palette "Neon digitale": Fraunces (wordmark), Courier Prime (metadati), Libre Franklin (UI).
   Disegna dopo il load dei webfont, fallback consapevole. */
function makeShareCard(d,cb){
  try{
    var c=document.createElement('canvas');c.width=1080;c.height=1350;
    var x=c.getContext('2d');
    if(!x){cb(null);return}
    var draw=function(){
      var g=x.createLinearGradient(0,0,0,1350);g.addColorStop(0,'#0A0F1F');g.addColorStop(1,'#05060E');
      x.fillStyle=g;x.fillRect(0,0,1080,1350);
      var r1=x.createRadialGradient(180,120,0,180,120,700);r1.addColorStop(0,'rgba(124,108,255,.28)');r1.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r1;x.fillRect(0,0,1080,1350);
      var r2=x.createRadialGradient(950,1200,0,950,1200,620);r2.addColorStop(0,'rgba(0,229,192,.16)');r2.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r2;x.fillRect(0,0,1080,1350);
      x.strokeStyle='rgba(234,242,255,.07)';x.lineWidth=1;
      for(var gy=0;gy<1350;gy+=54){x.beginPath();x.moveTo(0,gy);x.lineTo(1080,gy);x.stroke()}
      for(var gx=0;gx<1080;gx+=54){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,1350);x.stroke()}
      x.fillStyle='#EAF2FF';x.font='600 56px Fraunces, Georgia, serif';x.fillText('A L E T H E',80,150);
      x.fillStyle='#00E5C0';x.font='700 25px Courier Prime, Consolas, monospace';x.fillText('IL GIOCO GIORNALIERO DEL GIUDIZIO',80,205);
      x.fillStyle='#75809C';x.font='700 30px Courier Prime, Consolas, monospace';x.fillText('SFIDA #'+(d.num||'')+' · '+(d.date||'').toUpperCase()+' — LUCIDITA',80,330);
      x.fillStyle='#00E5C0';x.font='700 230px Libre Franklin, Arial, sans-serif';x.fillText(d.pct+'%',80,570);
      x.fillStyle='#EAF2FF';x.font='600 46px Libre Franklin, Arial, sans-serif';x.fillText(d.detail,80,660);
      var cell=96,gap=16,cx=80,cy=730;
      for(var z=0;z<d.grid.length;z++){
        x.fillStyle=d.grid[z]?'#00E5C0':'#FF4D6D';
        var px=cx+(z%5)*(cell+gap),py=cy+Math.floor(z/5)*(cell+gap);
        x.beginPath();
        if(x.roundRect){x.roundRect(px,py,cell,cell,18)}else{x.rect(px,py,cell,cell)}
        x.fill();
        x.fillStyle='#05060E';x.font='700 44px Libre Franklin, Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';
        x.fillText(String(z+1),px+cell/2,py+cell/2+2);
        x.textAlign='left';x.textBaseline='alphabetic';
      }
      var rows=Math.ceil(d.grid.length/5),ty=730+rows*112+90;
      x.fillStyle='#FFD166';x.font='600 38px Libre Franklin, Arial, sans-serif';
      x.fillText('+'+d.earned+' crediti',80,ty);
      if(d.streak>0){x.fillStyle='#FFD166';x.font='600 38px Libre Franklin, Arial, sans-serif';x.fillText('🔥 Streak '+d.streak+' giorni',80,ty+56)}
      if(d.challenge){
        x.fillStyle=d.challenge.win?'#00E5C0':'#75809C';x.font='600 34px Libre Franklin, Arial, sans-serif';
        x.fillText(d.challenge.win?('🏆 Ho battuto '+d.challenge.name+' ('+d.challenge.score+'%)'):('Sfida di '+d.challenge.name+': '+d.challenge.score+'%'),80,ty+(d.streak>0?112:56));
      }
      x.fillStyle='#75809C';x.font='700 30px Courier Prime, Consolas, monospace';
      x.fillText('ALETHE · '+(d.url||'sfida quotidiana'),80,1280);
      c.toBlob(function(b){cb(b)},'image/png');
    };
    if(document.fonts&&document.fonts.load){
      Promise.all([
        document.fonts.load('600 56px Fraunces'),
        document.fonts.load('700 230px Libre Franklin'),
        document.fonts.load('700 25px Courier Prime')
      ]).then(draw).catch(draw);
    }else{draw()}
  }catch(err){cb(null)}
}
