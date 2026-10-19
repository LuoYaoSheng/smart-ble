# G-WIN 广播边车空口捕获：bleak 扫同一空口，收厂商块 companyId=0x4C42 ("BLE") 的帧。
# 用法: python run-g-aircheck.py <秒> <out.json>（与 go test -run TestWinBridgeStartStopAir 并行跑）
from __future__ import annotations

import asyncio
import json
import sys
import time

SECONDS = int(sys.argv[1]) if len(sys.argv) > 1 else 25
OUT = sys.argv[2] if len(sys.argv) > 2 else "g-aircheck.json"
COMPANY = 0x4C42


async def main() -> None:
    from bleak import BleakScanner

    hits: list[dict] = []
    loop = asyncio.get_running_loop()
    done = asyncio.Event()

    def cb(dev, adv):
        if COMPANY in adv.manufacturer_data:
            payload = bytes(adv.manufacturer_data[COMPANY])
            hits.append({
                "t": round(time.monotonic(), 1),
                "addr": str(dev.address),
                "name": dev.name or "",
                "rssi": adv.rssi,
                "payload": payload.decode("ascii", "replace"),
                "payload_hex": payload.hex(),
            })

    scanner = BleakScanner(detection_callback=cb)
    await scanner.start()
    await asyncio.sleep(SECONDS)
    await scanner.stop()
    summary = {"company": f"0x{COMPANY:04X}", "frames": len(hits), "hits": hits[:50]}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)


asyncio.run(main())
