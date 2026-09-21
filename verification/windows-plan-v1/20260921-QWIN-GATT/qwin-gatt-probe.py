"""Q-WIN GATT 层无头真机探针：扫描→连接→枚举→INFO 读→STATUS 订阅→断开。

bleak 3.0.2 / WinRT。不写任何特征（铁律 SHID-FW-LOCK-001）。
"""
import asyncio, sys, time

SVC_INFO = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04"
SVC_STATUS = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04"

async def main() -> int:
    from bleak import BleakScanner, BleakClient

    t0 = time.time()
    found = await BleakScanner.discover(timeout=5.0, return_adv=True)
    hits = sorted(found.values(), key=lambda p: p[1].rssi if p[1].rssi else -100, reverse=True)
    print(f"[probe] scan done in {time.time()-t0:.1f}s, {len(hits)} device(s)")
    for dev, adv in hits:
        print(f"[probe]   {dev.name or '(unnamed)'}  {adv.rssi} dBm  {dev.address}")
    target = None
    for dev, adv in hits:
        name = dev.name or ""
        if name.startswith("SHID-") or "238E" in dev.address.upper():
            target = dev
            break
    if target is None:
        print("[probe] FATAL: SHID device not found")
        return 2
    print(f"[probe] target: {target.name} @ {target.address}")

    def on_disc(client):
        print(f"[probe] disconnected callback fired (is_connected={client.is_connected})")

    async with BleakClient(target, disconnected_callback=on_disc, timeout=15.0) as client:
        print(f"[probe] connected: {client.is_connected} (mtu={client.mtu_size})")
        svc_count = char_count = 0
        for svc in client.services:
            svc_count += 1
            print(f"[probe] SVC {svc.uuid}")
            for ch in svc.characteristics:
                char_count += 1
                print(f"[probe]   CHAR {ch.uuid} props={sorted(set(ch.properties or []))}")
        print(f"[probe] enumeration: {svc_count} service(s), {char_count} char(s)")

        data = await client.read_gatt_char(SVC_INFO)
        raw = bytes(data)
        print(f"[probe] INFO read: {len(raw)}B hex={' '.join(f'{b:02X}' for b in raw)}")
        print(f"[probe] INFO text: {raw.decode('utf-8', errors='replace')!r}")

        events: list[bytes] = []
        def on_notify(char, payload: bytearray):
            events.append(bytes(payload))
            print(f"[probe] notify: {len(payload)}B {' '.join(f'{b:02X}' for b in payload)}")
        await client.start_notify(SVC_STATUS, on_notify)
        print("[probe] STATUS notify subscribed, waiting 8s …")
        await asyncio.sleep(8)
        print(f"[probe] notify events: {len(events)}")
        await client.stop_notify(SVC_STATUS)
        print("[probe] STATUS notify unsubscribed")
    print("[probe] disconnected (context exit) — probe OK")
    return 0

sys.exit(asyncio.run(main()))
