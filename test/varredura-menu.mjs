// Varredura de garantia: com o menu flutuante, rolando até o fim NUNCA pode
// sobrar conteúdo atrás dele. Testa a regra em vez de um cenário só: varre
// alturas de conteúdo, tamanhos de tela e safe-area, em WebKit e Chromium.
//
// Uso (playwright fica fora do repo):
//   PW_DIR=/caminho/onde/instalou/playwright node test/varredura-menu.mjs [paisfilhos|calangada]
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire((process.env.PW_DIR || process.cwd()) + '/');
const { webkit, chromium } = require('playwright');

const app = process.argv[2] || 'paisfilhos';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(process.env.HTML_FILE || path.join(root, app + '.html'), 'utf8')
  .replace(/https:\/\/[a-z0-9-]+-default-rtdb\.firebaseio\.com/, 'https://nonexistent-fake-domain-xyz123.firebaseio.com');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/sw.js')) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html);
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const VIEWPORTS = [[320, 568], [375, 667], [375, 812], [390, 844], [430, 932]];
const SAFE = [0, 34];
const TOL = 0.5;
let checks = 0; const fails = [];
const fail = (msg) => { if (fails.length < 40) fails.push(msg); else if (fails.length === 40) fails.push('… (mais falhas omitidas)'); };

async function open(browserType, [w, h], safe) {
  const b = await browserType.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(process.env.MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) });
  await ctx.addInitScript(() => localStorage.setItem('pf_admin', '1'));
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('http://localhost') ? r.continue() : r.abort());
  await p.goto(url);
  await p.addStyleTag({ content: `:root{--safe-bot:${safe}px !important}` });
  await p.waitForFunction(() => typeof render === 'function' && typeof state === 'object');
  return { b, p };
}

const player = (i, cat) => ({ id: 'p' + i, name: 'Jogador ' + i, categoria: cat || (i % 3 === 0 ? 'veterano' : 'base') });

// Em Quadra: cenários × varredura da altura dos cards
const QUADRA = {
  vazia:      () => ({ courtA: [], courtB: [], queue: [player(1), player(2)], review: false }),
  parcial:    () => ({ courtA: [player(1)], courtB: [player(2)], queue: [player(3)], review: false }),
  cheiaRev:   () => ({ courtA: Array.from({ length: 6 }, (_, i) => player(i)), courtB: Array.from({ length: 6 }, (_, i) => player(10 + i)), queue: Array.from({ length: 7 }, (_, i) => player(20 + i)), review: true }),
  cheiaSemRev:() => ({ courtA: Array.from({ length: 5 }, (_, i) => player(i)), courtB: Array.from({ length: 5 }, (_, i) => player(10 + i)), queue: [player(30)], review: false }),
};

async function checkQuadra(p, label) {
  for (const [nome, mk] of Object.entries(QUADRA)) {
    await p.evaluate((d) => {
      state.teamSize = 6;
      state.courtA = d.courtA; state.courtB = d.courtB; state.queue = d.queue;
      state._reviewMode = d.review; state._lastWinner = 'A';
      render(); document.getElementById('tabQuadra').click();
    }, mk());
    for (let mh = 0; mh <= 1400; mh += 5) {
      const r = await p.evaluate((mh) => {
        document.getElementById('scoreboardUnified').style.minHeight = mh + 'px';
        const cs = document.getElementById('courtScroll');
        cs.scrollTop = cs.scrollHeight;
        const rows = document.querySelectorAll('#scoreboardUnified .su-team'); const cb = document.querySelector('.court-block'); const last = Math.max(cb.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(cb).flexGrow) ? 0 : 0), 0);
        const bar = document.querySelector('.tab-bar').getBoundingClientRect().top;
        return { last, bar, over: last - bar };
      }, mh);
      checks++;
      if (r.over > TOL) fail(`${label} quadra/${nome} minH=${mh}: conteúdo ${r.over.toFixed(1)}px atrás do menu`);
    }
  }
}

async function checkHistorico(p, label) {
  await p.evaluate(() => document.getElementById('tabHistorico').click());
  for (let n = 0; n <= 30; n++) {
    const r = await p.evaluate((n) => {
      state.history = Array.from({ length: n }, (_, i) => ({ type: 'win', time: Date.now() - i * 60000, winner: 'A', winnerNames: ['A' + i, 'B' + i], loserNames: ['C' + i, 'D' + i] }));
      render();
      const l = document.getElementById('historicoList'); l.scrollTop = l.scrollHeight;
      const li = l.querySelector('li:last-of-type');
      const bar = document.querySelector('.tab-bar').getBoundingClientRect().top;
      return li ? li.getBoundingClientRect().bottom - bar : -1;
    }, n);
    checks++;
    if (r > TOL) fail(`${label} historico n=${n}: ${r.toFixed(1)}px atrás do menu`);
  }
}

async function checkFila(p, label) {
  await p.evaluate(() => document.getElementById('tabFila').click());
  for (let n = 0; n <= 25; n++) {
    const r = await p.evaluate((n) => {
      state.courtA = []; state.courtB = [];
      state.queue = Array.from({ length: n }, (_, i) => ({ id: 'q' + i, name: 'Fila ' + i, categoria: 'base' }));
      render();
      const l = document.getElementById('queueList'); l.scrollTop = l.scrollHeight;
      const bar = document.querySelector('.tab-bar').getBoundingClientRect().top;
      const btn = document.getElementById('addFilaBtn').getBoundingClientRect();
      const li = l.querySelector('li:last-of-type');
      return { btn: btn.bottom - bar, li: li ? li.getBoundingClientRect().bottom - btn.top : -1 };
    }, n);
    checks += 2;
    if (r.btn > TOL) fail(`${label} fila n=${n}: botão ${r.btn.toFixed(1)}px atrás do menu`);
    if (r.li > TOL) fail(`${label} fila n=${n}: último item ${r.li.toFixed(1)}px atrás do botão`);
  }
}

for (const [engName, eng] of [['webkit', webkit], ['chromium', chromium]].filter(([n]) => !process.env.ENGINE || process.env.ENGINE === n)) {
  for (const vp of VIEWPORTS) for (const safe of SAFE) {
    const label = `${engName} ${vp.join('x')} safe=${safe}`;
    const { b, p } = await open(eng, vp, safe);
    try { await checkQuadra(p, label); await checkHistorico(p, label); await checkFila(p, label); }
    catch (e) { fail(`${label}: erro no teste — ${e.message.split('\n')[0]}`); }
    await b.close();
    console.log(`ok ${label}`);
  }
}
server.close();
console.log(`\n${checks} verificações, ${fails.length} falhas`);
fails.forEach(f => console.log('FALHA', f));
process.exit(fails.length ? 1 : 0);
