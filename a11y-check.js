/* a11y-check.js — verifica WCAG 2.1 dei contrasti del design ALETHE (palette "Neon digitale").
   Regole: testo normale ≥4.5:1 (AA), testo grande ≥3:1 (AA), componenti UI/bordi ≥3:1 (1.4.11). Esce 0 se tutto passa. */
function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => {
    let v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const l1 = lum(fg), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function blend(fg, alpha, bg) {
  const p = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').substr(i, 2), 16));
  const [fr, f2, fb] = p(fg), [br, b2, bb] = p(bg);
  const mix = (a, b) => Math.round(a * alpha + b * (1 - alpha));
  return '#' + [mix(fr, br), mix(f2, b2), mix(fb, bb)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const B = '#05060E', S = '#0D1322', S2 = '#141C33', P = '#F1F4FA';
const checks = [
  ['h1/testo primario #EAF2FF su bg', '#EAF2FF', B, 4.5],
  ['testo primario su card', '#EAF2FF', S, 4.5],
  ['testo primario su card raised', '#EAF2FF', S2, 4.5],
  ['muted su bg', '#8A97B8', B, 4.5],
  ['muted su card', '#8A97B8', S, 4.5],
  ['muted-2 (metadati 11px) su bg', '#75809C', B, 4.5],
  ['aqua (kicker/GIUSTO/CI CREDO) su bg', '#00E5C0', B, 4.5],
  ['aqua su card', '#00E5C0', S, 4.5],
  ['aqua su card raised (score number)', '#00E5C0', S2, 4.5],
  ['gold (crediti/streak/badge) su bg', '#FFD166', B, 4.5],
  ['gold su card', '#FFD166', S, 4.5],
  ['magenta (SBAGLIATO/errore) su bg', '#FF4D6D', B, 4.5],
  ['auth-err #FF8AA0 su bg', '#FF8AA0', B, 4.5],
  ['risk banner #FFB3BE su bg', '#FFB3BE', B, 4.5],
  ['challenge result #7FF2DE su bg', '#7FF2DE', B, 4.5],
  ['score-detail #B7AEFF su card', '#B7AEFF', S, 4.5],
  ['tomorrow/countdown #B7AEFF su bg', '#B7AEFF', B, 4.5],
  ['pro-strip #B7AEFF su bg', '#B7AEFF', B, 4.5],
  ['roast (blended .85) su bg', blend('#B7AEFF', 0.85, B), B, 4.5],
  ['CTA: testo scuro su aqua #7CF5DD', '#04121A', '#7CF5DD', 4.5],
  ['CTA: testo scuro su cyan #5FD0FF', '#04121A', '#5FD0FF', 4.5],
  ['levelup: testo scuro su gold #FFD166', '#04121A', '#FFD166', 4.5],
  ['violet (progress done/kicker PRO) su bg', '#7C6CFF', B, 4.5],
  ['reveal: chip fail #FF8AA0 su bg', '#FF8AA0', B, 4.5],
  ['dossier: ink su carta fredda', '#0B1020', P, 4.5],
  ['dossier: ink-muted su carta fredda', '#4A5268', P, 4.5],
  ['dossier: ink-accent (capolettera) su carta', '#4A3DB8', P, 4.5],
  ['bordo input line-strong su bg', '#5C6390', B, 3],
  ['bordo circuito card (violet .55) su bg', blend('#7C6CFF', 0.55, B), B, 1.5]
];
let fail = 0;
for (const [desc, fg, bg, min] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL').padEnd(5), r.toFixed(2).padStart(6) + ':1', '(min ' + min + ')', desc);
}
console.log(fail ? '\n' + fail + ' COPPIE SOTTO SOGLIA' : '\nTUTTI I CONTRASTI PASSANO');
process.exit(fail ? 1 : 0);
