const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const assets = ['index.html','privacy.html','terms.html','_headers','robots.txt','og.png','manifest.webmanifest','sw.js','css','js','fonts','icons'];
fs.rmSync(out, {recursive:true,force:true});
fs.mkdirSync(out, {recursive:true});
for (const name of assets) fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
const hash = crypto.createHash('sha256');
function digest(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir,name);
    if(fs.statSync(file).isDirectory()) digest(file);
    else {hash.update(path.relative(out,file));hash.update(fs.readFileSync(file));}
  }
}
digest(out);
const release = hash.digest('hex').slice(0,16);
const sw = path.join(out,'sw.js');
const source=fs.readFileSync(sw,'utf8');
if(!source.includes('alethe-__RELEASE__')) throw new Error('Missing service worker release placeholder');
fs.writeFileSync(sw,source.replace('alethe-__RELEASE__','alethe-'+release));
console.log('Static release '+release+' ready in dist; development files excluded.');
