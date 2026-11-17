/* css-check.js — confronta tutte le classi usate in HTML/JS con le regole del CSS. */
const fs = require('fs');
const css = fs.readFileSync('css/alethe.css', 'utf8');
const used = new Set();
for (const f of [fs.existsSync('_product/index.html') ? '_product/index.html' : 'index.html', 'privacy.html']) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach(c => c && used.add(c));
}
for (const m of fs.readFileSync('js/app.js', 'utf8').matchAll(/classList\.(?:add|toggle|remove)\('([^']+)'/g)) used.add(m[1]);
for (const m of fs.readFileSync('js/app.js', 'utf8').matchAll(/className='([^']+)'/g)) m[1].split(/\s+/).forEach(c => c && used.add(c));

const cssEsc = css.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// classi senza regola propria ma coperte da selettori padre o senza bisogno di stili
const WHITELIST = ['levelup-in', 'streak-num', 'game'];
const missing = [];
for (const c of used) {
  if (WHITELIST.includes(c)) continue;
  const re = new RegExp('\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s,{:%."])');
  if (!re.test(css)) missing.push(c);
}
console.log('classi usate:', used.size, '· senza regola CSS:', missing.length ? missing.join(', ') : 'NESSUNA');
process.exit(missing.length ? 1 : 0);
