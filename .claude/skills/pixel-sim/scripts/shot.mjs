#!/usr/bin/env node
// Screenshots the running dev server in headless Chrome, with no dependencies.
// Needs `npm run dev` on http://localhost:3000 and Node 22+.
//
//   node shot.mjs --out <prefix> [--page reef|pond|aquarium] [--scroll 0,900,1800]
//     [--size 1440x900] [--phone] [--wait 3000] [--query pond-main] [--eval <js>]
//     [--zoom x,y,w,h,scale]
//
// Writes <prefix>-<scrollY>.png for each scroll position. --phone is 390x844.
// --eval runs in the page before the shots and prints what it returns.
// --zoom crops to a region of the view (y is from the top of the view) and
// enlarges it, for judging sprites up close.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, '');
  if (key === 'phone') args.phone = true;
  else args[key] = process.argv[++i];
}
if (!args.out) { console.error('--out <prefix> is required'); process.exit(1); }

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [width, height] = (args.phone ? '390x844' : args.size || '1440x900').split('x').map(Number);
const scrolls = (args.scroll || '0').split(',').map(Number);
const wait = Number(args.wait || 3000);
const port = 9300 + Math.floor(Math.random() * 600);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pixel-sim-'))}`, 'about:blank']);
let target;
for (let i = 0; i < 40 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
  if (!target) await sleep(250);
}
if (!target) { console.error('Chrome did not start'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let id = 0;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async expression => {
  const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result?.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 600));
  return result?.result?.value;
};

let code = 0;
try {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: !!args.phone });
  await send('Page.navigate', { url: `http://localhost:3000/${args.query ? `?${args.query}` : ''}` });
  await sleep(wait);
  if (args.page && args.page !== 'reef') {
    const clicked = await run(`(() => {
      const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.title || '').toLowerCase().includes(${JSON.stringify(args.page)}));
      if (b) b.click();
      return !!b;
    })()`);
    if (!clicked) throw new Error(`no switch stop for page ${args.page}`);
    await sleep(wait + 1000);
  }
  if (args.eval) console.log(await run(args.eval));
  const clip = args.zoom ? args.zoom.split(',').map(Number) : null;
  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  for (const y of scrolls) {
    await run(`window.scrollTo(0, ${y})`);
    await sleep(800);
    const { result } = await send('Page.captureScreenshot', {
      format: 'png',
      ...(clip ? { clip: { x: clip[0], y: y + clip[1], width: clip[2], height: clip[3], scale: clip[4] || 1 } } : {}),
    });
    const file = `${args.out}-${y}.png`;
    writeFileSync(file, Buffer.from(result.data, 'base64'));
    console.log(file);
  }
} catch (e) {
  console.error(e.message);
  code = 1;
}
ws.close();
chrome.kill();
process.exit(code);
