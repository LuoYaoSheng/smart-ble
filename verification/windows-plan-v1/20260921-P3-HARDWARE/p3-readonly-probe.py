"""P3 硬件窗口 · 断电重启后只读复核探针（FW-LOCK 清除验证第一步）。

只读链：扫描→连接→MTU→枚举 1svc/3char→INFO 身份→STATUS 订阅 8s→退订→断开。
零写入铁律（写侧验证由配网 E2E 的合法 candidate 帧承担）。
"""
import asyncio
import sys
from bleak import BleakScanner, BleakClient

TARGET_NAME = "SHID-00000001"
ADDR = "10:B4:1D:CD:23:8E"
SVC = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"
INFO = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04"
STATUS = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04"


async def main():
    print("[probe] scanning 5s ...")
    found = await BleakScanner.discover(timeout=5.0, return_adv=True)
    hits = [(d.name, d.address, adv.rssi) for d, adv in found.values() if d.name]
    shid = [(d, adv) for d, adv in found.values() if d.name == TARGET_NAME]
    for n, a, r in sorted(hits, key=lambda x: -1 * (x[2] or -200)):
        print(f"[probe]   {n}  {r} dBm  {a}")
    if not shid:
        print("FAIL_SHID_NOT_FOUND")
        return 1
    addr = shid[0][0].address
    print(f"[probe] target: {TARGET_NAME} @ {addr}")

    async with BleakClient(addr) as client:
        print(f"[probe] connected: {client.is_connected} (mtu={client.mtu_size})")
        svc = client.services.get_service(SVC)
        if svc is None:
            print("FAIL_SVC_NOT_FOUND — 断电重启后 GATT 丢失")
            return 1
        chars = svc.characteristics
        print(f"[probe] enumeration: 1 service, {len(chars)} char(s)")
        for c in chars:
            print(f"[probe]   CHAR {c.uuid} props={sorted(c.properties)}")
        if len(chars) != 3:
            print("FAIL_CHAR_COUNT")
            return 1

        data = await client.read_gatt_char(INFO)
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = repr(data)
        print(f"[probe] INFO read: {len(data)}B text={text}")

        events = []

        def on_notify(_s, data):
            events.append(data)

        await client.start_notify(STATUS, on_notify)
        print("[probe] STATUS subscribed, wait 8s ...")
        await asyncio.sleep(8)
        print(f"[probe] notify events: {len(events)}")
        await client.stop_notify(STATUS)
        print("[probe] unsubscribed; disconnect — probe OK")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
