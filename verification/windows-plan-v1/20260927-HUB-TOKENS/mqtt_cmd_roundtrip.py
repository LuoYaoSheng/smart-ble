# -*- coding: utf-8 -*-
"""20260927-HUB-TOKENS T-F: hub→MQTT command→设备→ACK→hub 同步闭环 + 幂等重放

设备侧由本脚本模拟：收 command(topic) 回 ACK(topic)。
判据：POST 200 终态 executed；同 request_id 重放不再触达设备（第二次
command_rx 不出现）且直接回既有终态。
"""
import json
import threading
import time
import urllib.request

import paho.mqtt.client as mqtt

CREDS = json.load(open("evidence/consume1.json"))
DEV = CREDS["device_id"]
BOOT = "boot-e2e-used-1"
T_STATUS = f"smart-hid/v1/devices/{DEV}/status"
T_CMD = f"smart-hid/v1/devices/{DEV}/command"
T_ACK = f"smart-hid/v1/devices/{DEV}/ack"

rx_log = []
rx_signal = threading.Event()


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        "http://127.0.0.1:17890" + path,
        data=data,
        method=method,
        headers={
            "X-ControlHub-Local": "1",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def on_connect(client, userdata, flags, rc):
    client.subscribe(T_CMD, qos=1)


def on_message(client, userdata, msg):
    if msg.topic != T_CMD:
        return
    cmd = json.loads(msg.payload.decode())
    rx_log.append(cmd["request_id"])
    ack = {
        "protocol": "1.0",
        "request_id": cmd["request_id"],
        "device_id": DEV,
        "boot_id": BOOT,
        "status": "executed",
        "code": 0,
        "execution_ms": 6,
    }
    client.publish(T_ACK, json.dumps(ack), qos=1)
    rx_signal.set()


c = mqtt.Client(client_id="simcmd-" + DEV)
c.username_pw_set(CREDS["mqtt_username"], CREDS["mqtt_credential"])
c.on_connect = on_connect
c.on_message = on_message
c.connect("127.0.0.1", CREDS["mqtt_port"], 30)
c.loop_start()
time.sleep(1.2)

c.publish(
    T_STATUS,
    json.dumps({
        "protocol": "1.0", "device_id": DEV, "online": True,
        "boot_id": BOOT, "usb_hid_ready": True,
        "firmware": "test-host-sim", "timestamp": int(time.time()),
    }),
    qos=1, retain=True,
).wait_for_publish()
time.sleep(1.0)

REQ = "e2e_20260927_tof_001"
cmd_body = {
    "protocol": "1.0",
    "request_id": REQ,
    "device_id": DEV,
    "target_boot_id": BOOT,
    "type": "keyboard",
    "action": "tap",
    "ttl_ms": 3000,
    "payload": {"key": "ENTER", "hold_ms": 40},
}

print("== 1) POST command #1 (expect 200 executed, device rx once) ==")
rx_signal.clear()
code, body = http("POST", f"/api/v1/devices/{DEV}/commands", cmd_body)
rx_signal.wait(timeout=5)
print(code, json.dumps(body, ensure_ascii=False)[:300])
print("device rx count:", len(rx_log), rx_log)

time.sleep(1)
print("\n== 2) idempotent replay same request_id (expect same terminal, NO new rx) ==")
code2, body2 = http("POST", f"/api/v1/devices/{DEV}/commands", cmd_body)
print(code2, json.dumps(body2, ensure_ascii=False)[:300])
print("device rx count after replay:", len(rx_log), rx_log)

print("\n== 3) cleanup: offline ==")
c.publish(
    T_STATUS,
    json.dumps({
        "protocol": "1.0", "device_id": DEV, "online": False,
        "boot_id": BOOT, "usb_hid_ready": False,
        "firmware": "test-host-sim", "timestamp": int(time.time()),
    }),
    qos=1, retain=True,
).wait_for_publish()
c.loop_stop()
c.disconnect()
print("done")
