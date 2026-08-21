/**
 * 通用 BLE 配网分帧传输（纯逻辑，无 uni.* / 平台依赖）
 *
 * 帧格式（与 Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md §3 一致，
 * 但本模块本身不绑定 Smart HID——任何「大 payload 分多次写特征」的配网
 * 档案都可复用）：
 *
 *   帧 = [seq:u8][total:u8][len:u8][payload:len 字节]
 *
 * 约定：
 *   - seq 从 0 起，顺序递增；total = 总块数（1–MAX_FRAMES）
 *   - 每块 payload ≤ MAX_CHUNK_BYTES；按协商 MTU 切小块同样合法
 *     （设备端不假设单包成功；MTU 23 时每块 17B 也是合法实现）
 *   - 接收方收到 seq=0 视为新传输开始（出错可整体从 0 重发）
 *   - 乱序/跳号由接收方丢弃报错；组装上限 MAX_ASSEMBLED_BYTES
 *
 * @module core/ble-core/provisioning/framing
 */

/** 帧头字节数：seq + total + len */
export const FRAME_HEADER_SIZE = 3;

/** 每帧 payload 上限（字节） */
export const MAX_CHUNK_BYTES = 128;

/** 组装后的总 payload 上限（字节） */
export const MAX_ASSEMBLED_BYTES = 1024;

/** 最大帧数（= ceil(MAX_ASSEMBLED_BYTES / 1B 最小块) 的保护上限） */
export const MAX_FRAMES = 64;

/** 默认 ATT MTU（未协商成功时的保守值） */
export const DEFAULT_ATT_MTU = 23;

/**
 * 依据协商 MTU 计算安全的每帧 payload 尺寸。
 *
 * ATT write 每次可发 (MTU - 3) 字节，其中 3 字节是帧头，故 payload 上限
 * 为 MTU - 3 - 3；同时不超过协议规定的 MAX_CHUNK_BYTES。
 *
 * @param {number} mtu 协商到的 ATT MTU（未知传 23）
 * @returns {number} 每帧 payload 字节数（≥1）
 */
export function chunkSizeForMtu(mtu) {
	const m = Number(mtu);
	if (!Number.isFinite(m) || m < DEFAULT_ATT_MTU) return DEFAULT_ATT_MTU - FRAME_HEADER_SIZE - 3;
	return Math.max(1, Math.min(MAX_CHUNK_BYTES, m - FRAME_HEADER_SIZE - 3));
}

/**
 * 将完整 payload（字节序列）切成帧数组。
 *
 * @param {Uint8Array|number[]} bytes 完整 payload
 * @param {number} chunkSize 每帧 payload 尺寸（建议来自 chunkSizeForMtu）
 * @returns {Uint8Array[]} 帧数组，已带 [seq][total][len] 头
 * @throws {Error} payload 为空 / 超过 MAX_ASSEMBLED_BYTES / 帧数超过 MAX_FRAMES
 */
export function buildFrames(bytes, chunkSize) {
	const src = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
	if (src.length === 0) throw new Error('framing: empty payload');
	if (src.length > MAX_ASSEMBLED_BYTES) {
		throw new Error(`framing: payload ${src.length}B exceeds ${MAX_ASSEMBLED_BYTES}B`);
	}
	const chunk = Math.max(1, Math.min(MAX_CHUNK_BYTES, Number(chunkSize) || MAX_CHUNK_BYTES));
	const total = Math.ceil(src.length / chunk);
	if (total > MAX_FRAMES) throw new Error(`framing: needs ${total} frames > ${MAX_FRAMES}`);

	const frames = [];
	for (let seq = 0; seq < total; seq++) {
		const off = seq * chunk;
		const len = Math.min(chunk, src.length - off);
		const frame = new Uint8Array(FRAME_HEADER_SIZE + len);
		frame[0] = seq;
		frame[1] = total;
		frame[2] = len;
		frame.set(src.subarray(off, off + len), FRAME_HEADER_SIZE);
		frames.push(frame);
	}
	return frames;
}

/**
 * 接收侧组装器（测试与桌面端调试用；小程序侧组装发生在设备端）。
 * 语义与固件一致：seq=0 重启；乱序/跳号报错；超上限报错。
 */
export class FrameAssembler {
	constructor(maxBytes = MAX_ASSEMBLED_BYTES) {
		this.maxBytes = maxBytes;
		this._buf = null;
		this._expect = 0;
		this._total = 0;
		this._written = 0;
	}

	/** 喂入一帧；完整时返回 Uint8Array，未完整返回 null，非法抛错 */
	feed(frame) {
		const f = frame instanceof Uint8Array ? frame : Uint8Array.from(frame);
		if (f.length < FRAME_HEADER_SIZE) throw new Error('framing: short frame');
		const seq = f[0];
		const total = f[1];
		const len = f[2];
		if (total < 1 || total > MAX_FRAMES) throw new Error(`framing: bad total ${total}`);
		if (f.length !== FRAME_HEADER_SIZE + len) throw new Error('framing: len mismatch');
		if (seq === 0) {
			// 新传输开始（也允许出错后整体从 0 重发）
			this._buf = new Uint8Array(this.maxBytes);
			this._expect = 0;
			this._total = total;
			this._written = 0;
		}
		if (this._buf === null) throw new Error('framing: frame before start (seq!=0)');
		if (seq !== this._expect) throw new Error(`framing: out of order (expect ${this._expect}, got ${seq})`);
		if (this._total !== total) throw new Error('framing: total changed mid-transfer');
		if (this._written + len > this.maxBytes) throw new Error('framing: exceed max bytes');
		this._buf.set(f.subarray(FRAME_HEADER_SIZE), this._written);
		this._written += len;
		this._expect++;
		if (this._expect === this._total) {
			const out = this._buf.subarray(0, this._written);
			this._buf = null;
			return out;
		}
		return null;
	}
}

/**
 * UTF-8 编解码（微信小程序环境无 TextEncoder 保证，手写可移植实现）
 */
export function utf8Encode(str) {
	const out = [];
	for (let i = 0; i < str.length; i++) {
		let code = str.codePointAt(i);
		if (code > 0xffff) i++; // 代理对占 2 个 char
		if (code < 0x80) {
			out.push(code);
		} else if (code < 0x800) {
			out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0x10000) {
			out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			out.push(
				0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)
			);
		}
	}
	return Uint8Array.from(out);
}

export function utf8Decode(bytes) {
	const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
	let out = '';
	let i = 0;
	while (i < arr.length) {
		const b = arr[i];
		let code = 0;
		if (b < 0x80) {
			code = b; i += 1;
		} else if (b < 0xe0) {
			code = ((b & 0x1f) << 6) | (arr[i + 1] & 0x3f); i += 2;
		} else if (b < 0xf0) {
			code = ((b & 0x0f) << 12) | ((arr[i + 1] & 0x3f) << 6) | (arr[i + 2] & 0x3f); i += 3;
		} else {
			code = ((b & 0x07) << 18) | ((arr[i + 1] & 0x3f) << 12) | ((arr[i + 2] & 0x3f) << 6) | (arr[i + 3] & 0x3f); i += 4;
		}
		out += String.fromCodePoint(code);
	}
	return out;
}
