// Visão "Por categoria" da Fila: garante as regras que tornam o arraste por
// bloco seguro e a visão fiel ao algoritmo do próximo time.
//  1. Reordenar dentro de uma categoria nunca muda posição/ordem das outras.
//  2. Quem entra no próximo time é sempre um prefixo de cada bloco, e a linha
//     de corte fica exatamente depois dele; números são a posição no bloco.
//  3. Arrastar atravessa a linha de corte, mas nunca sai do próprio bloco.
//
// Uso (playwright fica fora do repo):
//   PW_DIR=/caminho/onde/instalou/playwright node test/fila-categoria.mjs [paisfilhos|calangada]
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire((process.env.PW_DIR || process.cwd()) + '/');
const { chromium } = require('playwright');

const app = process.argv[2] || 'paisfilhos';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(process.env.HTML_FILE || path.join(root, app + '.html'), 'utf8')
  .replace(/https:\/\/[a-z0-9-]+-default-rtdb\.firebaseio\.com/, 'https://nonexistent-fake-domain-xyz123.firebaseio.com');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/sw.js')) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html);
}).listen(0);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('pf_admin', '1'));
const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
await p.goto(`http://localhost:${server.address().port}/`);
await p.waitForFunction(() => typeof render === 'function' && typeof state === 'object');

const fails = await p.evaluate(() => {
  const fails = [];
  const fail = (m) => { if (fails.length < 40) fails.push(m); };
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const CATS = ['veterano', 'base', 'extra'];
  const fila = (n) => Array.from({ length: n }, (_, i) => ({ name: 'J' + i, categoria: CATS[Math.floor(rnd() * 3)] }));
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  state.teamSize = 6; state.courtA = []; state.courtB = [];
  document.getElementById('tabFila').click();
  document.querySelector('#filaViewToggle [data-view="categoria"]').click();

  // 1. applyCategoryOrder: só as posições da própria categoria mudam de dono
  for (let t = 0; t < 300; t++) {
    state.queue = fila(1 + Math.floor(rnd() * 25));
    const cat = CATS[t % 3];
    const antes = state.queue.map(pl => pl);
    const doBloco = antes.filter(pl => pl.categoria === cat);
    const nova = shuffle(doBloco);
    applyCategoryOrder(cat, nova);
    antes.forEach((pl, i) => {
      if (pl.categoria !== cat && state.queue[i] !== pl) fail(`applyCategoryOrder: ${pl.name} (${pl.categoria}) saiu da posição ${i} ao reordenar ${cat}`);
    });
    const depois = state.queue.filter(pl => pl.categoria === cat);
    if (depois.some((pl, k) => pl !== nova[k])) fail(`applyCategoryOrder: ordem de ${cat} não ficou como pedida`);
    if (state.queue.length !== antes.length) fail('applyCategoryOrder: tamanho da fila mudou');
  }

  // 2. Renderização: prefixo, corte e numeração por bloco
  for (let t = 0; t < 200; t++) {
    state.queue = fila(Math.floor(rnd() * 26));
    render();
    const next = proximoTime();
    const lis = [...document.querySelectorAll('#queueList > li')];
    let bloco = null, k = 0, viuCorte = false, entramNoBloco = 0;
    const fechaBloco = () => {
      if (!bloco) return;
      const n = state.queue.filter(pl => pl.categoria === bloco).length;
      if (k !== n) fail(`render t=${t}: bloco ${bloco} mostrou ${k} de ${n}`);
      const esperado = entramNoBloco > 0 && entramNoBloco < n;
      if (esperado !== viuCorte) fail(`render t=${t}: bloco ${bloco} corte=${viuCorte}, esperado=${esperado}`);
    };
    for (const li of lis) {
      if (li.classList.contains('cat-section-label')) {
        fechaBloco();
        bloco = { VETERANOS: 'veterano', BASE: 'base', EXTRA: 'extra' }[li.firstChild.textContent.trim()];
        const doBloco = state.queue.filter(pl => pl.categoria === bloco);
        entramNoBloco = doBloco.filter(pl => next.includes(pl)).length;
        k = 0; viuCorte = false;
        continue;
      }
      if (li.classList.contains('cat-cut')) {
        if (k !== entramNoBloco) fail(`render t=${t}: corte de ${bloco} depois de ${k}, deveria ser depois de ${entramNoBloco}`);
        viuCorte = true; continue;
      }
      k++;
      if (li.querySelector('.queue-num').textContent !== String(k)) fail(`render t=${t}: ${bloco} linha ${k} numerada ${li.querySelector('.queue-num').textContent}`);
      if (li.dataset.cat !== bloco) fail(`render t=${t}: ${li.dataset.cat} dentro do bloco ${bloco}`);
      if (li.querySelector('.cat-badge')) fail(`render t=${t}: selo de categoria repetido dentro do bloco`);
      const entra = li.classList.contains('nxt');
      if (entra !== (k <= entramNoBloco)) fail(`render t=${t}: ${bloco} linha ${k} entra=${entra} fora do prefixo`);
      if (li.classList.contains('wait') === entra) fail(`render t=${t}: ${bloco} linha ${k} com altura errada`);
    }
    fechaBloco();
  }

  // 3. Arraste: cruza o corte, trava no limite do bloco
  const byName = (n) => [...document.querySelectorAll('.queue-item')].find(l => l.querySelector('.queue-name').textContent === n);
  const fire = (el, type, y) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, clientX: r.left + r.width / 2, clientY: y })); };
  const drag = (name, y) => { const l = byName(name), h = l.querySelector('.queue-drag-handle'), r = l.getBoundingClientRect(); fire(h, 'pointerdown', (r.top + r.bottom) / 2); fire(h, 'pointermove', y); fire(h, 'pointerup', y); };
  const semear = () => { state.queue = [
    { name: 'V1', categoria: 'veterano' }, { name: 'B1', categoria: 'base' }, { name: 'V2', categoria: 'veterano' },
    { name: 'E1', categoria: 'extra' }, { name: 'V3', categoria: 'veterano' }, { name: 'B2', categoria: 'base' },
    { name: 'B3', categoria: 'base' }, { name: 'V4', categoria: 'veterano' }, { name: 'B4', categoria: 'base' },
  ]; render(); };
  const nomes = () => state.queue.map(pl => pl.name).join(',');

  semear();
  drag('V4', byName('V1').getBoundingClientRect().top + 2);
  if (nomes() !== 'V4,B1,V1,E1,V2,B2,B3,V3,B4') fail(`arraste cruzando o corte: ${nomes()}`);
  if (!proximoTime().some(pl => pl.name === 'V4')) fail('arraste cruzando o corte: V4 não entrou no próximo time');
  if (document.getElementById('queueList').classList.contains('dragging')) fail('arraste: classe dragging ficou na lista');

  semear();
  drag('V1', byName('B4').getBoundingClientRect().bottom + 300);
  if (nomes() !== 'V2,B1,V3,E1,V4,B2,B3,V1,B4') fail(`arraste além do bloco: ${nomes()}`);

  semear();
  const r = byName('V1').getBoundingClientRect();
  drag('V1', (r.top + r.bottom) / 2 + 15);
  if (nomes() !== 'V1,B1,V2,E1,V3,B2,B3,V4,B4') fail(`arraste pequeno não deveria trocar: ${nomes()}`);

  // 4. Atualização de outro aparelho no meio do arraste: a fila remota
  //    prevalece e a lista não fica presa em "arrastando".
  document.querySelector('#filaViewToggle [data-view="ordem"]').click();
  const remota = () => [{ name: 'A', categoria: 'base' }, { name: 'B', categoria: 'base' }, { name: 'D', categoria: 'base' }, { name: 'E', categoria: 'base' }];
  for (const soltaEm of ['linha antiga', 'linha nova']) {
    state.queue = ['A', 'B', 'C', 'D'].map(n => ({ name: n, categoria: 'base' })); render();
    const velho = byName('A'), h = velho.querySelector('.queue-drag-handle'), r0 = velho.getBoundingClientRect(), y = (r0.top + r0.bottom) / 2;
    fire(h, 'pointerdown', y); fire(h, 'pointermove', y + 130);
    state = Object.assign(state, { queue: remota() }); render();
    fire(soltaEm === 'linha antiga' ? h : byName('D').querySelector('.queue-drag-handle'), 'pointerup', y + 130);
    if (nomes() !== 'A,B,D,E') fail(`arraste durante atualização remota (solta na ${soltaEm}): fila virou ${nomes()}`);
    if (document.getElementById('queueList').classList.contains('dragging')) fail(`arraste durante atualização remota (solta na ${soltaEm}): lista presa em "arrastando"`);
  }

  // 5. Teclado: setas movem uma posição dentro do bloco e o foco acompanha
  document.querySelector('#filaViewToggle [data-view="categoria"]').click();
  semear();
  const tecla = (name, key) => byName(name).querySelector('.queue-drag-handle').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  const alca = byName('V2').querySelector('.queue-drag-handle');
  if (alca.tabIndex !== 0 || alca.getAttribute('role') !== 'button' || !/V2/.test(alca.getAttribute('aria-label') || '')) fail('teclado: alça não é focável ou não tem rótulo');
  tecla('V2', 'ArrowUp');
  if (nomes() !== 'V2,B1,V1,E1,V3,B2,B3,V4,B4') fail(`teclado ↑: ${nomes()}`);
  if (document.activeElement !== byName('V2').querySelector('.queue-drag-handle')) fail('teclado: foco não voltou pra alça de quem foi movido');
  tecla('V2', 'ArrowUp');
  if (nomes() !== 'V2,B1,V1,E1,V3,B2,B3,V4,B4') fail(`teclado ↑ no topo do bloco não deveria mexer: ${nomes()}`);
  tecla('V4', 'ArrowDown');
  if (nomes() !== 'V2,B1,V1,E1,V3,B2,B3,V4,B4') fail(`teclado ↓ no fim do bloco não deveria mexer: ${nomes()}`);
  tecla('B1', 'ArrowDown');
  if (nomes() !== 'V2,B2,V1,E1,V3,B1,B3,V4,B4') fail(`teclado ↓ na base: ${nomes()}`);
  const pressed = [...document.querySelectorAll('#filaViewToggle .filter-chip')].map(bt => bt.dataset.view + '=' + bt.getAttribute('aria-pressed')).join(',');
  if (pressed !== 'ordem=false,categoria=true') fail(`alternador: aria-pressed ${pressed}`);
  return fails;
});

// 6. A visão escolhida sobrevive a recarregar a página
await p.reload();
await p.waitForFunction(() => typeof render === 'function' && typeof state === 'object');
const lembrada = await p.evaluate(() => {
  state.queue = [{ name: 'X', categoria: 'base' }]; render();
  return { filaView, lista: !!document.querySelector('#queueList .cat-section-label'),
           pressed: document.querySelector('#filaViewToggle [data-view="categoria"]').getAttribute('aria-pressed') };
});
if (lembrada.filaView !== 'categoria' || !lembrada.lista || lembrada.pressed !== 'true') fails.push(`visão não foi lembrada ao recarregar: ${JSON.stringify(lembrada)}`);

await b.close();
server.close();
console.log(`${app}: ${fails.length} falhas`);
fails.forEach(f => console.log('FALHA', f));
process.exit(fails.length ? 1 : 0);
