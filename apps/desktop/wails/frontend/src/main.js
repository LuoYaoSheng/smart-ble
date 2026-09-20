import './app.css';

import { ScanBLE } from '../wailsjs/go/main/App';

const $ = (id) => document.getElementById(id);
const scanBtn = $('scanBtn');
const statusEl = $('status');
const listEl = $('deviceList');
const emptyTip = $('emptyTip');

scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    statusEl.textContent = '正在扫描…';
    try {
        const hits = await ScanBLE();
        // P001 正典状态词：扫描完成 · 发现 N 台
        statusEl.textContent = `扫描完成 · 发现 ${hits.length} 台`;
        listEl.innerHTML = '';
        for (const h of hits) {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.className = 'dev-name';
            name.textContent = h.name || '(未命名)';
            const meta = document.createElement('span');
            meta.className = 'dev-meta';
            meta.textContent = `${h.rssi} dBm · ${h.address}`;
            li.append(name, meta);
            listEl.append(li);
        }
        emptyTip.style.display = hits.length ? 'none' : 'block';
    } catch (e) {
        statusEl.textContent = `扫描失败：${e}`;
    } finally {
        scanBtn.disabled = false;
    }
});
