#!/usr/bin/env node
// Records a GIF of the running dev server in headless Chrome, for the README.
// Needs `npm run dev`, Node 22+, and Python with Pillow (which assembles the GIF).
//
//   node gif.mjs --out <file.gif> [--page reef|pond|shrine|space|sky|hotpot] [--scroll 0]
//     [--size 1440x900] [--clip x,y,w,h] [--frames 70] [--interval 100] [--wait 6000]
//     [--debug "Button text"] [--eval <js>] [--delay 0] [--port 3000] [--still <file.png>] [--scale 1]
//
// Opens the page (switching to --page), scrolls to --scroll, optionally opens the
// hidden debug panel (the Konami code) and presses the button labelled --debug, runs
// --eval to stage the scene, waits --delay ms, then captures --frames shots of --clip
// (x, y within the window) about --interval ms apart, enlarged --scale times. If --eval
// returns { clip: [x, y, w, h], scale }, that crop is used instead (for action that
// happens wherever a creature is). --still writes one full-window PNG instead of a GIF.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) args[process.argv[i].replace(/^--/, '')] = process.argv[++i];
if (!args.out && !args.still) { console.error('--out <file.gif> or --still <file.png> is required'); process.exit(1); }

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [width, height] = (args.size || '1440x900').split('x').map(Number);
const port = 9300 + Math.floor(Math.random() * 600);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pixel-gif-'))}`, 'about:blank']);
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
const dir = mkdtempSync(join(tmpdir(), 'pixel-gif-frames-'));
try {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://localhost:${args.port || 3000}/` });
  const wait = Number(args.wait || 6000);
  await sleep(wait);
  if (args.page && args.page !== 'reef') {
    const ok = await run(`(() => { const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes(${JSON.stringify(args.page)})); if (b) b.click(); return !!b; })()`);
    if (!ok) throw new Error(`no switch stop for ${args.page}`);
    await sleep(wait + 1000);
  }
  await run(`window.scrollTo(0, ${Number(args.scroll || 0)})`);
  await sleep(800);
  if (args.debug) {
    const pressed = await run(`(async () => {
      for (const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      const b = [...document.querySelectorAll('[data-reef-ui] button')].find(b => b.textContent.trim() === ${JSON.stringify(args.debug)});
      if (b) b.click();
      // Close the panel again so it isn't in the shot.
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return !!b;
    })()`);
    if (!pressed) throw new Error(`no debug button "${args.debug}"`);
  }
  let staged = null;
  if (args.eval) { staged = await run(args.eval); console.log(typeof staged === 'object' ? JSON.stringify(staged) : staged); }
  await sleep(Number(args.delay || 0));
  if (args.still) {
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(args.still), Buffer.from(result.data, 'base64'));
    console.log(args.still);
  } else {
    const [cx, cy, cw, ch] = staged?.clip ?? (args.clip || `0,0,${width},${height}`).split(',').map(Number);
    const scale = staged?.scale ?? Number(args.scale || 1);
    const scroll = await run('window.scrollY');
    const frames = Number(args.frames || 70), interval = Number(args.interval || 100);
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      const due = t0 + f * interval;
      if (Date.now() < due) await sleep(due - Date.now());
      const { result } = await send('Page.captureScreenshot', { format: 'png', clip: { x: cx, y: scroll + cy, width: cw, height: ch, scale } });
      writeFileSync(join(dir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(result.data, 'base64'));
    }
    const each = Math.round((Date.now() - t0) / frames);
    // Pillow assembles it: one shared palette keeps the pixel art's colours exact and the file small.
    const py = `
import sys, glob
from PIL import Image
d, out, dur = sys.argv[1], sys.argv[2], int(sys.argv[3])
frames = [Image.open(p).convert('RGB') for p in sorted(glob.glob(d + '/f*.png'))]
sheet = Image.new('RGB', (frames[0].width, frames[0].height * min(len(frames), 12)))
for i, f in enumerate(frames[::max(1, len(frames) // 12)][:12]): sheet.paste(f, (0, i * f.height))
pal = sheet.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
q[0].save(out, save_all=True, append_images=q[1:], duration=dur, loop=0, optimize=True, disposal=1)
print(out, len(q), 'frames', dur, 'ms')
`;
    const r = spawnSync('python', ['-c', py, dir, resolve(args.out), String(each)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    console.log(r.stdout.trim());
  }
} catch (e) {
  console.error(e.message);
  code = 1;
} finally {
  ws.close();
  chrome.kill();
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
