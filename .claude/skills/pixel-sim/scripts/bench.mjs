#!/usr/bin/env node
// Measures a simulation's step time and draw time, optionally against a git ref.
// Needs Node 22+; the draw half also needs `npm run dev` on http://localhost:3000.
//
//   node bench.mjs <reef|pond> [--base HEAD] [--steps 6000] [--no-draw]
//
// Step time runs the simulation in Node on a settled world, so it needs no
// browser. Draw time builds the real view in headless Chrome and reports ms per
// sprite pass, averaged down the page. It always measures the working tree, as
// the dev server serves it: to compare draw times, stash, rerun and pop.
// Run from the repo root. A new simulation gets an entry in SIMS.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SIMS = {
  reef: { file: 'pixelOcean', sim: 'PixelOcean', viewFile: 'pixelOceanView', view: 'OceanView', make: 'new S(360, 2000)' },
  pond: { file: 'pond', sim: 'Pond', viewFile: 'pondView', view: 'PondView', make: 'new S(320, 2000, { z0: 0, z1: 200 }, [])' },
};
const sim = SIMS[process.argv[2]];
if (!sim) { console.error('usage: bench.mjs <reef|pond> [--base <ref>] [--steps n] [--no-draw]'); process.exit(1); }
const opt = key => { const i = process.argv.indexOf(key); return i < 0 ? null : process.argv[i + 1]; };
const steps = Number(opt('--steps') || 6000);
const base = opt('--base');
const root = execSync('git rev-parse --show-toplevel').toString().trim();

async function stepMs(file) {
  const S = (await import(pathToFileURL(file).href))[sim.sim];
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const world = eval(sim.make);
    for (let t = 0; t < 1500; t++) world.step();
    const a = performance.now();
    for (let t = 0; t < steps; t++) world.step();
    runs.push((performance.now() - a) / steps);
  }
  return Math.min(...runs);
}

console.log(`step  working tree  ${(await stepMs(resolve(root, 'lib', `${sim.file}.ts`))).toFixed(3)} ms`);
if (base) {
  // Beside the real lib, so that its relative imports resolve the same way.
  const tmp = resolve(root, 'lib', '.bench-tmp');
  mkdirSync(tmp, { recursive: true });
  const file = join(tmp, `${sim.file}.ts`);
  const source = execSync(`git show ${base}:lib/${sim.file}.ts`, { cwd: root, maxBuffer: 1 << 28 }).toString();
  writeFileSync(file, source.replace(/from '\.\//g, "from '../"));
  try { console.log(`step  ${base.padEnd(12)}  ${(await stepMs(file)).toFixed(3)} ms`); }
  finally { rmSync(tmp, { recursive: true, force: true }); }
}

if (!process.argv.includes('--no-draw')) {
  const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const port = 9300 + Math.floor(Math.random() * 600);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pixel-sim-'))}`, 'about:blank']);
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
    if (!target) await sleep(250);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(2500);
  const { result } = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    document.body.innerHTML = '';
    const S = (await import('/lib/${sim.file}.ts')).${sim.sim};
    const V = (await import('/lib/${sim.viewFile}.ts')).${sim.view};
    const mk = () => document.createElement('canvas');
    const runs = [];
    for (let r = 0; r < 3; r++) {
      const world = ${sim.make};
      const view = new V(world, mk(), mk(), [mk(), mk()], 4, () => {});
      for (let k = 0; k < 600; k++) world.step();
      let total = 0, n = 0;
      for (let y = 0; y < 2000 * 4 - 900; y += 600) {
        view.render(y, 1440, 900);
        const a = performance.now();
        for (let k = 0; k < 10; k++) view.renderSprites();
        total += performance.now() - a; n += 10;
      }
      runs.push(total / n);
    }
    return Math.min(...runs);
  })()` });
  if (result?.exceptionDetails) console.error(JSON.stringify(result.exceptionDetails).slice(0, 800));
  else console.log(`draw  working tree  ${result.result.value.toFixed(3)} ms`);
  ws.close();
  chrome.kill();
}
process.exit(0);
