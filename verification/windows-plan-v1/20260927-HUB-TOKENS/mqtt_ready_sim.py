# -*- coding: utf-8 -*-
"""20260927-HUB-TOKENS T-E: MQTT READY 模拟（无 ESP32 的 hub+broker 半场）

用 pairing/device 签发的一次性凭据直连 broker（127.0.0.1:17891），
按 hid-command-schema 的 SmartHidStatus 发 retained online → 查 hub
设备视图 → 发 online=false → 复查。凭证只存本地，不进任何提交文件。
"""
import json
import time
import urllib.request

import paho.mqtt.client as mqtt

CREDS = json.load(open("evidence/consume1.json"))
DEV = CREDS["device_id"]
TOPIC_STATUS = f"smart-hid/v1/devices/{DEV}/status"
TOPIC_CMD = f"smart-hid/v1/devices/{DEV}/command"


def http(path):
    req = urllib.request.Request(
        "http://127.0.0.1:17890" + path, headers={"X-ControlHub-Local": "1"}
    )
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read().decode())


def status_payload(online):
    return json.dumps({
        "protocol": "1.0",
        "device_id": DEV,
        "online": online,
        "boot_id": "boot-e2e-used-1",
        "usb_hid_ready": online,
        "firmware": "test-host-sim",
        "timestamp": int(time.time()),
    })


events = []


def on_connect(client, userdata, flags, rc):
    events.append(("connect", rc))


def on_subscribe(client, userdata, mid, granted_qos):
    events.append(("subscribe_cmd", granted_qos))


def on_message(client, userdata, msg):
    events.append(("command_rx", msg.payload[:80].decode(errors="replace")))


c = mqtt.Client(client_id="sim-" + DEV)
c.username_pw_set(CREDS["mqtt_username"], CREDS["mqtt_credential"])
c.on_connect = on_connect
c.on_subscribe = on_subscribe
c.on_message = on_message
c.connect("127.0.0.1", CREDS["mqtt_port"], 30)
c.loop_start()
time.sleep(1.5)

print("== 1) connect + command topic subscribe (ACL) ==")
r = c.subscribe(TOPIC_CMD, qos=1)
time.sleep(0.8)
print("subscribe rc mid:", r)

print("\n== 2) publish retained READY (online=true) ==")
info = c.publish(TOPIC_STATUS, status_payload(True), qos=1, retain=True)
info.wait_for_publish()
print("published:", info.is_published())
time.sleep(1.2)

code, detail = http(f"/api/v1/devices/{DEV}")
print("\n== 3) hub device detail after READY ==")
print(code, json.dumps(detail, ensure_ascii=False)[:400])

c.publish(TOPIC_STATUS, status_payload(False), qos=1, retain=True)
time.sleep(1.2)
code2, detail2 = http(f"/api/v1/devices/{DEV}")
print("\n== 4) hub device detail after offline ==")
print(code2, json.dumps(detail2, ensure_ascii=False)[:300])

print("\n== events ==", events)
c.loop_stop()
c.disconnect()
