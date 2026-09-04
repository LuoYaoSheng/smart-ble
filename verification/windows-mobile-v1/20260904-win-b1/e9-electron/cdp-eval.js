// CDP evaluator: node cdp-eval.js "<js expression>"
const http = require('http');
const WebSocket = require('ws');
const expr = process.argv[2];
http.get('http://127.0.0.1:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    const target = JSON.parse(d).find(t => t.type === 'page');
    if (!target) { console.error('no page target'); process.exit(1); }
    const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
    let id = 0;
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: ++id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    });
    ws.on('message', (m) => {
      const msg = JSON.parse(m);
      if (msg.id === id) {
        if (msg.error) console.error('ERR', JSON.stringify(msg.error));
        else console.log(JSON.stringify(msg.result.result, null, 1).slice(0, 4000));
        ws.close(); process.exit(0);
      }
    });
    setTimeout(() => { console.error('timeout'); process.exit(1); }, 15000);
  });
});
