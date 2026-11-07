import fs from 'node:fs';

const port = process.env.CDP_PORT || 9223;
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
};

function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Runtime.enable');
await send('Page.enable');

const [, , command, ...args] = process.argv;

if (command === 'shot') {
  const result = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(args[0], Buffer.from(result.data, 'base64'));
  console.log('saved', args[0]);
} else if (command === 'eval') {
  const expression = fs.readFileSync(args[0], 'utf8');
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    console.error(JSON.stringify(result.exceptionDetails, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result.result.value, null, 2));
} else if (command === 'size') {
  const result = await send('Runtime.evaluate', {
    expression:
      '({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,body:document.body.getBoundingClientRect().toJSON()})',
    returnByValue: true
  });
  console.log(JSON.stringify(result.result.value, null, 2));
} else {
  console.error('usage: cdp.mjs shot <path> | eval <file> | size');
  process.exit(2);
}

ws.close();
