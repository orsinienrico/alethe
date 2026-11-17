/* load-check.js — simula il load della pagina con un DOM stub e esegue data.js+data2.js+app.js
   per intercettare errori runtime nel percorso di inizializzazione. */
const fs = require('fs'), vm = require('vm');

const elements = {};
function fakeEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      _class: new Set(),
      style: { setProperty() {}, width: '' },
      textContent: '',
      innerHTML: '',
      value: '',
      disabled: false,
      getAttribute() { return null },
      setAttribute() {},
      querySelectorAll() { return [] },
      querySelector() { return null },
      appendChild() {},
      removeChild() {},
      getBoundingClientRect() { return { left: 0, top: 0 } },
      focus() {}, select() {},
      classList: {
        add(...c) { c.forEach(x => elements[id]._class.add(x)) },
        remove(...c) { c.forEach(x => elements[id]._class.delete(x)) },
        toggle(c, force) { if (force === undefined) { elements[id]._class.has(c) ? elements[id]._class.delete(c) : elements[id]._class.add(c) } else { force ? elements[id]._class.add(c) : elements[id]._class.delete(c) } },
        contains(c) { return elements[id]._class.has(c) }
      },
      addEventListener() {},
      parentNode: null
    };
  }
  return elements[id];
}
const knownIds = [...fs.readFileSync(fs.existsSync('_product/index.html') ? '_product/index.html' : 'index.html', 'utf8').matchAll(/id="([^"]+)"/g)].map(m => m[1]);

const sandbox = {
  document: {
    getElementById(id) { return fakeEl(id) },
    querySelectorAll() { return [] },
    querySelector() { return null },
    createElement(tag) { return fakeEl('dyn-' + tag + '-' + Math.random()) },
    addEventListener() {},
    activeElement: null,
    execCommand() { return true },
    body: fakeEl('body')
  },
  window: {},
  navigator: {},
  location: { search: '', protocol: 'http:', origin: 'http://localhost:8080', pathname: '/' },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  Date, Math, JSON,
  // Browser timers are inert in this synchronous initialization smoke test.
  setTimeout() { return 0; }, setInterval() { return 0; }, clearTimeout() {}, clearInterval() {},
  requestAnimationFrame(cb) { return 0 },
  fetch() { return new Promise((res, rej) => rej(new Error('no network in test'))) },
  URL: { createObjectURL() { return '' }, revokeObjectURL() {} },
  Blob: function () {}, File: function () {},
  console
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

try {
  vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), sandbox, { filename: 'data.js' });
  console.log('OK   data.js eseguito');
  vm.runInContext(fs.readFileSync('js/data2.js', 'utf8'), sandbox, { filename: 'data2.js' });
  console.log('OK   data2.js eseguito — set totali:', sandbox.sets.length);
  vm.runInContext(fs.readFileSync('js/card.js', 'utf8'), sandbox, { filename: 'card.js' });
  console.log('OK   card.js eseguito');
  vm.runInContext(fs.readFileSync('js/app.js', 'utf8'), sandbox, { filename: 'app.js' });
  console.log('OK   app.js eseguito fino in fondo (init completo, nessun errore runtime)');
} catch (err) {
  console.log('ERRORE RUNTIME:', err.message);
  console.log(err.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}
