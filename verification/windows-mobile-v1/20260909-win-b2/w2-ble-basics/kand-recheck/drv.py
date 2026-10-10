# -*- coding: utf-8 -*-
# K-AND W2 复验驱动辅助（2026-09-10，E5=R5CR1284Y7H，ESP32=BLEToolkit-Server）
# 用法：python drv.py <cmd> [args...]
#   state [filter]      列出全部文本节点（text/content-desc + bounds），可按子串过滤
#   tap-text TEXT [idx] 点击第 idx 个精确 text 节点中心（默认 0）
#   tap-desc DESC [idx] 同上，按 content-desc
#   tap X Y             几何直点
#   shot NAME           截图到本目录 NAME.png
#   key KEY             按键（back/home...）
#   text-count TEXT     统计精确 text 出现次数（服务行数判别用）
#   swipe X1 Y1 X2 Y2 [ms]
import re, subprocess, sys, os, time

SERIAL = 'R5CR1284Y7H'
HERE = os.path.dirname(os.path.abspath(__file__))
XML = os.path.join(os.environ.get('TEMP', '/tmp'), 'kand-recheck.xml')

def adb(*args, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    out = r.stdout.decode('utf-8', 'replace')
    if r.returncode != 0 and 'ERROR' in (r.stderr.decode('utf-8', 'replace') or '') + out:
        sys.stderr.write(r.stderr.decode('utf-8', 'replace'))
    return out

def dump():
    for attempt in range(3):
        adb('shell', 'uiautomator', 'dump', '/sdcard/kand-recheck.xml')
        adb('pull', '/sdcard/kand-recheck.xml', XML)
        try:
            with open(XML, encoding='utf-8') as f:
                return f.read()
        except OSError:
            time.sleep(1.5)
    raise SystemExit('dump failed')

NODE_RE = re.compile(r'<node[^>]*?/?>')
ATTR_RE = re.compile(r'(\w+)="([^"]*)"')

def nodes(xml):
    for m in NODE_RE.finditer(xml):
        attrs = dict(ATTR_RE.findall(m.group(0)))
        yield attrs

def bounds_center(b):
    nums = re.findall(r'\d+', b)
    if len(nums) != 4:
        return None
    x1, y1, x2, y2 = map(int, nums)
    return (x1 + x2) // 2, (y1 + y2) // 2

def visible(attrs):
    b = attrs.get('bounds', '')
    nums = re.findall(r'\d+', b)
    if len(nums) != 4:
        return False
    x1, y1, x2, y2 = map(int, nums)
    return x2 > x1 and y2 > y1 and y2 > 0 and y1 < 2400 and x2 > 0 and x1 < 1080

def collect(key):
    out = []
    for attrs in nodes(dump()):
        v = attrs.get(key, '')
        if v and v not in ('', ' ') and visible(attrs) and attrs.get('class', '').endswith(('TextView', 'Button', 'View', 'CheckBox', 'Switch', 'ImageButton', 'EditText')):
            c = bounds_center(attrs.get('bounds', ''))
            if c:
                out.append((v, c, attrs.get('class', '').split('.')[-1]))
    return out

def tap(x, y, wait=1.2):
    adb('shell', 'input', 'tap', str(x), str(y))
    time.sleep(wait)

def main():
    cmd = sys.argv[1]
    if cmd == 'state':
        flt = sys.argv[2] if len(sys.argv) > 2 else ''
        for v, c, cls in collect('text'):
            if flt in v:
                print(f'{v!r} @ {c} [{cls}]')
    elif cmd == 'state-desc':
        flt = sys.argv[2] if len(sys.argv) > 2 else ''
        for v, c, cls in collect('content-desc'):
            if flt in v:
                print(f'{v!r} @ {c} [{cls}]')
    elif cmd == 'tap-text':
        want = sys.argv[2]; idx = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        hits = [c for v, c, _ in collect('text') if v == want]
        if idx >= len(hits):
            print(f'MISS: {want!r} hits={len(hits)}'); raise SystemExit(2)
        tap(*hits[idx])
        print(f'TAP {want!r} #{idx} @ {hits[idx]}')
    elif cmd == 'tap-desc':
        want = sys.argv[2]; idx = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        hits = [c for v, c, _ in collect('content-desc') if v == want]
        if idx >= len(hits):
            print(f'MISS: {want!r} hits={len(hits)}'); raise SystemExit(2)
        tap(*hits[idx])
        print(f'TAP {want!r} #{idx} @ {hits[idx]}')
    elif cmd == 'tap':
        tap(int(sys.argv[2]), int(sys.argv[3]))
        print('OK')
    elif cmd == 'shot':
        name = sys.argv[2]
        adb('shell', 'screencap', '-p', '/sdcard/kand-shot.png')
        adb('pull', '/sdcard/kand-shot.png', os.path.join(HERE, name + '.png'))
        print('SHOT', name)
    elif cmd == 'key':
        adb('shell', 'input', 'keyevent', 'KEYCODE_' + sys.argv[2].upper())
        time.sleep(1.0)
        print('OK')
    elif cmd == 'text-count':
        want = sys.argv[2]
        print(sum(1 for v, _, _ in collect('text') if v == want))
    elif cmd == 'swipe':
        args = sys.argv[2:7]
        adb('shell', 'input', 'swipe', *args)
        time.sleep(1.0)
        print('OK')
    else:
        raise SystemExit('unknown cmd: ' + cmd)

if __name__ == '__main__':
    main()
