# Q-WIN F004 真机取证：真实 bleak 扫描（Q 同款 discover(return_adv=True) 合并口径）
# → ScanHit → AdvDialog 渲染 → widget.grab() PNG + 复制文本/分段 dump。
# 用法: python q-advdialog-real-evidence.py（需 SHID 设备在广播）
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, r"E:\project\xf\smart-ble\apps\desktop\qt")

from ble_service import ScanHit  # noqa: E402
from main import AdvDialog, build_ad_segments  # noqa: E402


async def scan_shid() -> ScanHit | None:
    from bleak import BleakScanner

    found = await BleakScanner.discover(timeout=6.0, return_adv=True)
    for dev, adv in found.values():
        if dev.name and dev.name.startswith("SHID"):
            mfr_id = None
            mfr_data = b""
            if adv.manufacturer_data:
                mfr_id = next(iter(adv.manufacturer_data))
                mfr_data = bytes(adv.manufacturer_data[mfr_id])
            return ScanHit(
                address=str(dev.address),
                name=dev.name or "",
                rssi=adv.rssi if adv.rssi else -100,
                manufacturer_id=mfr_id,
                manufacturer_data=mfr_data,
                service_uuids=[str(u) for u in adv.service_uuids],
                service_data=[(str(u), bytes(d)) for u, d in adv.service_data.items()],
            )
    return None


def main() -> int:
    hit = asyncio.run(scan_shid())
    if not hit:
        print("NO_SHID_DEVICE")
        return 2
    print(f"HIT: {hit.address} {hit.name} rssi={hit.rssi} uuids={hit.service_uuids}")
    print(f"mfg_id={hit.manufacturer_id} mfg_data={hit.manufacturer_data.hex()} service_data={hit.service_data}")

    from PySide6.QtWidgets import QApplication

    app = QApplication([])
    dlg = AdvDialog(hit, None)
    dlg.show()
    app.processEvents()
    out = Path(__file__).parent / "q-advdialog-real-shid.png"
    dlg.grab().save(str(out))
    print(f"PNG: {out}")
    print("--- COPY_TEXT ---")
    print(dlg._copy_text())
    print("--- SEGMENTS ---")
    for seg in build_ad_segments(hit):
        print(seg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
