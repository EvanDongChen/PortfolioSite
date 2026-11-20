// Compares the pixel pages' running cost while scrolling: frame rate, the 95th-percentile frame
// gap, frames slower than 34 ms, main-thread long tasks, and script and task milliseconds per second.
// Needs the dev server on port 3000 and Chrome. Run from the repo root:
//   node .claude/skills/pixel-3d/scripts/pages-perf.mjs [--throttle 4] [--pages reef,pond,shrine,space,hotpot] [--port 3000]
// --throttle slows the CPU (4 stands in for a modest laptop). Run it twice: a scene rebuild landing
// in the 8-second window makes one sample look worse than the page is.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const opt = (key, dflt) => { const i = process.argv.indexOf(key); return i < 0 ? dflt : process.argv[i + 1]; };
const throttle = Number(opt('--throttle', 1));
const pages = opt('--pages', 'reef,pond,shrine,space').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const measure = async page => {
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--enable-gpu', '--ignore-gpu-blocklist', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'perf-'))}`, 'about:blank']);
  let target;
  for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(250); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const run = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://localhost:${opt('--port', 3000)}/` });
  await sleep(7000);
  if (page !== 'reef') {
    await run(`[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes(${JSON.stringify(page)}))?.click()`);
    await sleep(8000);
  }
  await send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await send('Performance.enable');
  const m0 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
  const res = await run(`(async () => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?';
    let long = 0;
    const po = new PerformanceObserver(l => { for (const e of l.getEntries()) long += e.duration; });
    try { po.observe({ type: 'longtask', buffered: false }); } catch {}
    const gaps = [];
    let last = performance.now();
    const t0 = last;
    await new Promise(done => {
      const f = now => {
        gaps.push(now - last); last = now;
        // Scroll steadily down the page and back, as a reader would.
        const u = (now - t0) / 8000;
        window.scrollTo(0, Math.sin(u * Math.PI) * 4200);
        if (now - t0 < 8000) requestAnimationFrame(f); else done();
      };
      requestAnimationFrame(f);
    });
    po.disconnect();
    gaps.sort((a, b) => a - b);
    const fps = gaps.length / 8;
    return { gpu, fps: +fps.toFixed(1), p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1), slow: gaps.filter(g => g > 34).length, long: Math.round(long) };
  })()`);
  const m1 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
  res.scriptMsPerSec = Math.round(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / 8);
  res.taskMsPerSec = Math.round(((m1.TaskDuration - m0.TaskDuration) * 1000) / 8);
  ws.close(); chrome.kill();
  return res;
};

console.log(`CPU throttle ${throttle}x`);
for (const page of pages) {
  const r = await measure(page);
  console.log(page.padEnd(7), JSON.stringify(r));
}
process.exit(0);
