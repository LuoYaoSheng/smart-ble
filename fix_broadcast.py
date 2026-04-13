#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix garbled text in apps/uniapp/pages/broadcast/index.vue (lines 79-81)."""

filepath = r'e:\project\xf\smart-ble\apps\uniapp\pages\broadcast\index.vue'

with open(filepath, 'rb') as f:
    content = f.read()

lines = content.split(b'\r\n')
print(f"Total lines: {len(lines)}")

# Lines 79-81 (1-indexed) = indices 78-80 (0-indexed) contain garbled content
# We keep lines 0-77, replace 78-80 with proper content, then keep 81+
before = lines[:77]   # includes </template> at idx 77
after = lines[81:]    # starts from the log-panel-brd line

new_section_str = """\t\t\t<!-- \u5382\u5546ID + \u5382\u5546\u6570\u636e\uff08\u901a\u7528\u5b57\u6bb5\uff0c\u5bf9\u9f50 Flutter BroadcastPage\uff09 -->
\t\t\t<view class="field-group">
\t\t\t\t<text class="field-label">\u5382\u5546ID (HEX)</text>
\t\t\t\t<input class="field-input" v-model="manufacturerId" :disabled="advertising" placeholder="\u5982\uff1a0001" />
\t\t\t</view>
\t\t\t<view class="field-group">
\t\t\t\t<text class="field-label">\u5382\u5546\u6570\u636e</text>
\t\t\t\t<input class="field-input" v-model="manufacturerData" :disabled="advertising" placeholder="\u5e7f\u64ad\u643a\u5e26\u7684\u6570\u636e" />
\t\t\t</view>
\t\t\t<!-- \u5e7f\u64ad\u5b57\u8282\u6570\u5b9e\u65f6\u63d0\u793a -->
\t\t\t<view class="bytes-hint" v-if="serviceUUID || manufacturerData">
\t\t\t\t<text class="bytes-hint-text">\u9884\u8ba1\u5e7f\u64ad\u5305\u5927\u5c0f\uff1a{{ calcAdvertiseBytes() }} / 31 \u5b57\u8282</text>
\t\t\t\t<text class="bytes-hint-warn" v-if="calcAdvertiseBytes() > 31">\u26a0 \u8d85\u51fa\u9650\u5236\uff01</text>
\t\t\t</view>
\t\t</view>

\t\t<!-- \u5e7f\u64ad\u64cd\u4f5c\u6309\u94ae -->
\t\t<view class="action-section">
\t\t\t<button
\t\t\t\tclass="btn-advertise"
\t\t\t\t:class="advertising ? 'btn-stop' : ''"
\t\t\t\t@click="toggleAdvertising">
\t\t\t\t<text>{{ advertising ? '\u505c\u6b62\u5e7f\u64ad' : '\u5f00\u59cb\u5e7f\u64ad' }}</text>
\t\t\t</button>
\t\t\t<button class="btn-check" @click="checkSupport">\u68c0\u67e5\u652f\u6301</button>
\t\t</view>

\t\t<!-- \u5e7f\u64ad\u72b6\u6001\u680f -->
\t\t<view
\t\t\tclass="broadcast-status-bar"
\t\t\t:class="advertising ? 'status-bar-active' : ''">
\t\t\t<view
\t\t\t\tclass="status-indicator-dot"
\t\t\t\t:class="advertising ? 'dot-active' : ''"></view>
\t\t\t<text class="status-bar-text">{{ advertising ? '\u5e7f\u64ad\u4e2d' : '\u5df2\u505c\u6b62' }}</text>
\t\t\t<text class="status-bar-tip" v-if="isSupported">{{ advertising ? '\u5176\u4ed6\u8bbe\u5907\u53ef\u626b\u63cf\u5230\u6b64\u8bbe\u5907' : '\u70b9\u51fb\u5f00\u59cb\u5e7f\u64ad' }}</text>
\t\t\t<text class="status-bar-tip status-bar-tip-warn" v-else>\u5f53\u524d\u5e73\u53f0\u4e0d\u652f\u6301\u5e7f\u64ad</text>
\t\t</view>"""

new_section_bytes = new_section_str.encode('utf-8')
new_section_lines = new_section_bytes.split(b'\n')

result_lines = before + new_section_lines + after
result = b'\r\n'.join(result_lines)

with open(filepath, 'wb') as f:
    f.write(result)

print(f"Fixed! Final byte count: {len(result)}")

# Verify
with open(filepath, 'rb') as f:
    verify = f.read()
vlines = verify.split(b'\r\n')
print(f"Verify total lines: {len(vlines)}")
for i, line in enumerate(vlines[75:125], start=76):
    try:
        print(f"{i}: {line.decode('utf-8')[:100]}")
    except Exception as e:
        print(f"{i}: <error: {e}> {repr(line[:40])}")
