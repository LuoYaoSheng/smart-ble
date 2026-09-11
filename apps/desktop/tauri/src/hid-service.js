//
// SmartBLE Desktop - Smart HID 桌面传输编排（PARITY-002 桌面接入 · P5 第二步）
//
// uniapp services/smart-hid/index.js + services/provisioning/{transport,orchestrator}.js
// + services/smart-hid/provision-form.js 的桌面投影（E-WIN / T-WIN 共用同一字节）：
//   - GATT 原语走注入的 bleAPI（E-WIN preload / T-WIN invoke 适配层）；
//     读回值为 hex 字符串 → 字节 → bundle codec 解析；写入走 writeRaw 字节数组。
//   - MTU：桌面无协商接口，按 ATT 默认 23 保守分帧（chunkSizeForMtu）。
//   - 广告匹配把桌面扫描设备（noble：advertisement.serviceUuids）投影到
//     uniapp 设备形状（advertisServiceUUIDs）后交 profile.matchAdvertisement。
//   - 重连所有权（U-REC-001 同型预防）：会话存活期间 ownsDevice 为真，
//     宿主 App 不得对该设备发起自动重连（P002 向导自管重连入口）。
// F023 红线：token / 密码仅作 submit 参数在内存中流转，不写任何存储 / 日志。
//
'use strict';
(function (root) {
  if (!root.SmartHid) throw new Error('hid-service.js requires smart-hid.bundle.js (window.SmartHid)');

  const HID = root.SmartHid;

  // ---- 基础工具 --------------------------------------------------------

  const normalizeUuid = (value) => String(value || '').toLowerCase().replace(/-/g, '');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function hexToBytes(hex) {
    const s = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
    const out = [];
    for (let i = 0; i + 1 < s.length; i += 2) out.push(parseInt(s.slice(i, i + 2), 16));
    return out;
  }

  // ---- ControlHub 地址 / 表单（镜像 provision-form.js） ------------------

  const DEFAULT_PAIRING_PORT = HID.PROVISIONING_CONSTANTS.DEFAULT_PAIRING_PORT;

  function parseControlHubAddress(value) {
    const address = String(value || '').trim();
    if (!address) throw new Error('请输入 ControlHub 地址');
    if (/[\s/?#]/.test(address)) throw new Error('ControlHub 主机名格式不正确');

    const separator = address.lastIndexOf(':');
    const hasPort = separator > 0 && address.indexOf(':') === separator;
    const host = (hasPort ? address.slice(0, separator) : address).trim();
    const portText = hasPort ? address.slice(separator + 1) : '';
    if (hasPort && !portText) throw new Error('ControlHub 端口不正确');
    const port = portText ? Number(portText) : DEFAULT_PAIRING_PORT;

    if (!host || host.includes(':')) throw new Error('ControlHub 主机名格式不正确');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('ControlHub 端口不正确');
    return { host, port };
  }

  function formatControlHubAddress(info) {
    const host = String(info && info.host || '').trim();
    const port = Number((info && info.port) || DEFAULT_PAIRING_PORT);
    return host ? `${host}:${port}` : '';
  }

  function buildProvisionFormCandidate({ wifiSsid, wifiPassword, hubAddress, token } = {}) {
    const { host, port } = parseControlHubAddress(hubAddress);
    return {
      wifi_ssid: String(wifiSsid || '').trim(),
      wifi_password: String(wifiPassword || ''),
      hub_host: host,
      hub_port: port,
      token: String(token || '').trim()
    };
  }

  // ---- 配网进度投影（镜像 uniapp store/hid.js applyProvisionStatus） ------

  const PROGRESS_KEYS = ['wifi', 'hub', 'conn', 'usb'];
  const initialProgress = () => ({ wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' });

  const PROGRESS_ROW_BY_ERROR = {
    wifi_failed: 'wifi',
    invalid_payload: 'wifi',
    controlhub_unreachable: 'hub',
    pairing_invalid: 'hub',
    pairing_expired: 'hub',
    pairing_used: 'hub',
    mqtt_invalid: 'conn',
    storage_failed: 'conn'
  };

  const PROGRESS_BY_STATE = {
    ready: { wifi: 'done', hub: 'done', conn: 'done', usb: 'done' },
    mqtt_connecting: { wifi: 'done', hub: 'done', conn: 'active', usb: 'pending' },
    pairing: { wifi: 'done', hub: 'active', conn: 'pending', usb: 'pending' },
    connecting_wifi: { wifi: 'active', hub: 'pending', conn: 'pending', usb: 'pending' },
    provisioning: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
    unprovisioned: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
    recovery: { wifi: 'warn', hub: 'warn', conn: 'warn', usb: 'pending' },
    error: { wifi: 'warn', hub: 'warn', conn: 'warn', usb: 'pending' }
  };

  const PROGRESS_BY_STEP = {
    received: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
    connecting_wifi: { wifi: 'active' },
    wifi_connected: { wifi: 'done', hub: 'pending', conn: 'pending', usb: 'pending' },
    pairing: { wifi: 'done', hub: 'active' },
    pairing_success: { wifi: 'done', hub: 'done', conn: 'pending', usb: 'pending' },
    mqtt_connecting: { wifi: 'done', hub: 'done', conn: 'active' },
    ready: { wifi: 'done', hub: 'done', conn: 'done', usb: 'done' }
  };

  /**
   * 配网进度投影（镜像 uniapp store/hid.js applyProvisionStatus 的就地突变语义：
   * 以 base（上一次进度，缺省全 pending）为底，错误只落对应行、其余保留）。
   */
  function deriveProgress(status, base) {
    const progress = Object.assign(initialProgress(), base || null);
    if (!status || !status.state) return progress;
    const { state, step, error } = status;
    if (error) {
      const row = PROGRESS_ROW_BY_ERROR[error];
      if (row) progress[row] = 'fail';
      return progress;
    }
    Object.assign(progress, PROGRESS_BY_STATE[state]);
    const byStep = PROGRESS_BY_STEP[step];
    if (byStep) Object.assign(progress, byStep);
    return progress;
  }

  // ---- 扫描匹配（noble → uniapp 设备形状投影） --------------------------

  function matchScannedDevice(device) {
    if (!device) return HID.PROFILE_MATCH.NONE;
    const advertised = (device.advertisement && device.advertisement.serviceUuids) // E-WIN noble
      || device.serviceUuids // uniapp 形状
      || device.service_uuids // T-WIN btleplug（serde snake_case）
      || [];
    const projected = {
      name: device.name || device.localName || '',
      advertisServiceUUIDs: advertised
    };
    return HID.smartHidProfile.matchAdvertisement(projected);
  }

  // ---- 会话服务 ---------------------------------------------------------

  function createHidService(bleAPI) {
    if (!bleAPI) throw new Error('createHidService requires a bleAPI instance');

    let session = null;          // { deviceId, serviceUuid, chars{alias→uuid}, charAliases{norm→alias}, mtu, dead, lastStatus }
    let infoSnapshot = null;     // 最近一次 Device Info（内存）
    let knownDevice = null;      // P003 会话内存快照（零本地持久化）
    let unbindValueChanged = null;
    let unbindDisconnected = null;

    const statusWaiters = HID.createSmartHidStatusWaiters();
    const disconnectListeners = new Set();
    const statusListeners = new Set();

    const profile = () => HID.smartHidProfile;

    const isAlive = () => Boolean(session && !session.dead);

    function notifyStatus(status) {
      for (const callback of [...statusListeners]) {
        try { callback(status); } catch { /* listener 自理 */ }
      }
    }

    function notifyPassiveDisconnect(reason) {
      for (const callback of [...disconnectListeners]) {
        try { callback(reason); } catch { /* listener 自理 */ }
      }
    }

    function handleValueChange(payload) {
      if (!isAlive() || !payload || payload.deviceId !== session.deviceId) return;
      const alias = session.charAliases[normalizeUuid(payload.characteristicUuid)];
      if (!alias) return;
      const bytes = hexToBytes(payload.value);
      if (alias === 'STATUS') {
        const status = profile().codec.parseStatus(bytes);
        if (status && status.state) {
          session.lastStatus = status;
          statusWaiters.emit(status);
          notifyStatus(status);
        }
      } else if (alias === 'INFO') {
        const info = profile().codec.parseDeviceInfo(bytes);
        if (info) infoSnapshot = Object.assign({}, infoSnapshot || {}, info);
      }
    }

    function handleDisconnected(payload) {
      const deviceId = payload && (payload.id || payload.deviceId);
      if (!isAlive() || deviceId !== session.deviceId) return;
      const dead = session;
      session = null;
      dead.dead = true;
      releaseBindings();
      statusWaiters.failAll('BLE 连接已断开');
      notifyPassiveDisconnect('BLE 连接已断开');
    }

    function releaseBindings() {
      if (unbindValueChanged) { try { unbindValueChanged(); } catch { } unbindValueChanged = null; }
      if (unbindDisconnected) { try { unbindDisconnected(); } catch { } unbindDisconnected = null; }
    }

    async function enableNotify(alias) {
      const result = await bleAPI.notifyCharacteristic(session.deviceId, session.serviceUuid, session.chars[alias], true);
      if (!result || result.success !== true) {
        throw new Error(`订阅 ${alias} 通知失败: ${(result && result.error) || '未知错误'}`);
      }
    }

    // 服务发现结果要求特征值已解析（ble:discoverServices 在特征循环完成后 resolve）。
    async function discoverProfileService(deviceId) {
      const result = await bleAPI.discoverServices(deviceId);
      if (!result || result.success !== true) throw new Error((result && result.error) || '服务发现失败');
      const services = result.services || [];
      const service = services.find((item) => normalizeUuid(item.uuid) === normalizeUuid(profile().serviceUuid));
      if (!service) throw new Error('目标设备上未找到 Smart HID 配网服务（UUID 不匹配或设备固件过旧）');

      const byNorm = new Map((service.characteristics || []).map((char) => [normalizeUuid(char.uuid), char]));
      const chars = {};
      const charAliases = {};
      for (const alias of profile().required) {
        const uuid = profile().characteristics[alias];
        const hit = byNorm.get(normalizeUuid(uuid));
        if (!hit) throw new Error(`配网特征缺失：${alias} (${uuid})`);
        chars[alias] = hit.uuid;
        charAliases[normalizeUuid(hit.uuid)] = alias;
      }
      return { serviceUuid: service.uuid, chars, charAliases };
    }

    async function readInfo() {
      if (!isAlive()) throw new Error('BLE 未连接');
      const result = await bleAPI.readCharacteristic(session.deviceId, session.serviceUuid, session.chars.INFO);
      if (!result || result.success !== true) throw new Error((result && result.error) || '读取 Device Info 失败');
      const info = profile().codec.parseDeviceInfo(hexToBytes(result.value));
      if (!info) throw new Error('Device Info 解析失败（设备固件协议不兼容）');
      return info;
    }

    /**
     * 建立 Smart HID GATT 会话：连接 → 服务/特征确认 → 订阅 STATUS/INFO →
     * 读 Device Info 并验证身份。失败自动断开。
     */
    async function connect(deviceId) {
      if (!deviceId) throw new Error('未选择设备，请返回扫描页选择 Smart HID 设备。');

      if (isAlive() && session.deviceId === deviceId) {
        const info = await readInfo();
        if (!profile().verifyDeviceInfo(info)) {
          await disconnect().catch(() => { });
          throw new Error('目标设备不是兼容的 Smart HID Profile');
        }
        infoSnapshot = info;
        return { deviceId, info };
      }
      if (isAlive()) await disconnect().catch(() => { });

      const connectResult = await bleAPI.connect(deviceId);
      if (!connectResult || connectResult.success !== true) {
        throw new Error((connectResult && connectResult.error) || 'BLE 连接失败，请靠近设备后重试。');
      }

      session = { deviceId, mtu: HID.DEFAULT_ATT_MTU, dead: false, lastStatus: null };
      try {
        Object.assign(session, await discoverProfileService(deviceId));
        releaseBindings();
        unbindValueChanged = bleAPI.onCharacteristicValueChanged
          ? bleAPI.onCharacteristicValueChanged(handleValueChange)
          : null;
        unbindDisconnected = bleAPI.onDeviceDisconnected
          ? bleAPI.onDeviceDisconnected(handleDisconnected)
          : null;

        // 先订阅再读（WIN-FAND-004 同型教训：订阅前首推会丢）；两次订阅间留间隔。
        await enableNotify('STATUS');
        await sleep(150);
        await enableNotify('INFO');

        const info = await readInfo();
        if (!profile().verifyDeviceInfo(info)) {
          throw new Error('目标设备不是兼容的 Smart HID Profile，已断开连接');
        }
        infoSnapshot = info;
        return { deviceId, info };
      } catch (error) {
        if (session && session.deviceId === deviceId) await disconnect().catch(() => { });
        throw error;
      }
    }

    function getDeviceInfo() {
      return infoSnapshot;
    }

    async function getStatus() {
      if (!isAlive()) return null;
      const result = await bleAPI.readCharacteristic(session.deviceId, session.serviceUuid, session.chars.STATUS);
      if (!result || result.success !== true) throw new Error((result && result.error) || '读取 Provision Status 失败');
      const status = profile().codec.parseStatus(hexToBytes(result.value));
      if (status) session.lastStatus = status;
      return status;
    }

    /** 分帧写入 candidate（framed-v1 · writeRaw 字节数组 · 帧间 30ms）。 */
    async function writeCandidate(input) {
      if (!isAlive()) throw new Error('BLE 未连接');
      const bytes = profile().codec.buildCandidate(input);
      const frames = HID.encodePayloadFrames(bytes, profile().transport.framing, session.mtu);
      for (let index = 0; index < frames.length; index++) {
        if (index > 0) await sleep(30);
        const result = await bleAPI.writeRaw(
          session.deviceId, session.serviceUuid, session.chars.INPUT,
          Array.from(frames[index]), false
        );
        if (!result || result.success !== true) {
          throw new Error(`写入配网帧失败（第 ${index + 1}/${frames.length} 帧）: ${(result && result.error) || '未知错误'}`);
        }
      }
      return { frames: frames.length, bytes: bytes.length };
    }

    function waitForProvisionResult(timeoutMs = 60000) {
      const raw = statusWaiters.waitFor(
        (status) => profile().workflow.classifyStatus(status).terminal,
        timeoutMs
      );
      // 保留 cancel 通道：.then() 链会产生无 cancel 的新 Promise，须显式桥接
      const shaped = raw.then((status) => ({
        ok: status.state === 'ready' && status.error == null,
        status
      }));
      shaped.cancel = (reason) => raw.cancel(reason);
      shaped.catch(() => {}); // 写入期间被拒（断链/取消）时防止 unhandledRejection 窗口
      return shaped;
    }

    /** 先建 terminal waiter 再写 candidate，避免设备快速终态丢失。 */
    async function provisionAndWait(input, timeoutMs = 60000) {
      const waiter = waitForProvisionResult(timeoutMs);
      try {
        await writeCandidate(input);
      } catch (error) {
        waiter.cancel((error && error.message) || '候选写入失败');
        await waiter.catch(() => { });
        throw error;
      }
      return waiter;
    }

    function waitForStatus(predicate, timeoutMs = 60000) {
      return statusWaiters.waitFor(predicate, timeoutMs);
    }

    function cancelProvisionWait(reason = '用户已取消等待') {
      statusWaiters.failAll(reason);
    }

    /** Smart HID 诊断五项（镜像 uniapp diagnose 映射）。 */
    async function diagnose() {
      const items = [
        { key: 'ble', label: 'BLE 链路', state: isAlive() ? 'ok' : 'fail', detail: isAlive() ? '已连接' : '未连接（请重新连接设备）' },
        { key: 'wifi', label: 'Wi-Fi 连接', state: 'pending', detail: '' },
        { key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
        { key: 'conn', label: '控制连接 (MQTT)', state: 'pending', detail: '' },
        { key: 'usb', label: '设备 Ready 状态', state: 'pending', detail: 'BLE 状态不等同于 USB HID 真机验收' }
      ];
      if (!isAlive()) return items;

      const [info, status] = await Promise.all([
        readInfo().catch(() => null),
        getStatus().catch(() => null)
      ]);
      const state = (status && status.state) || '';
      const step = (status && status.step) || '';
      const error = (status && status.error) || null;
      const wifiReady = ['wifi_connected', 'pairing', 'pairing_success', 'mqtt_connecting', 'ready'].includes(step)
        || ['pairing', 'mqtt_connecting', 'ready'].includes(state);
      const hubReady = ['pairing_success', 'mqtt_connecting', 'ready'].includes(step)
        || ['mqtt_connecting', 'ready'].includes(state);

      items[1].state = error === 'wifi_failed' ? 'fail' : wifiReady ? 'ok' : state === 'connecting_wifi' ? 'active' : 'warn';
      items[2].state = ['pairing_invalid', 'pairing_expired', 'pairing_used', 'controlhub_unreachable'].includes(error)
        ? 'fail' : hubReady ? 'ok' : state === 'pairing' ? 'active' : 'warn';
      items[3].state = error === 'mqtt_invalid' ? 'fail' : state === 'ready' ? 'ok' : state === 'mqtt_connecting' ? 'active' : 'warn';
      items[4].state = state === 'ready' ? 'ok' : state ? 'warn' : 'pending';
      if (error) {
        const failed = items.find((item) => item.state === 'fail');
        if (failed) failed.detail = error;
      }
      if (info) {
        items[0].detail = `${info.device_id} fw=${info.firmware} state=${info.state}${info.provisioned ? ' (已配网)' : ''}`;
      }
      return items;
    }

    async function disconnect() {
      statusWaiters.failAll('BLE 已主动断开');
      const active = session;
      session = null;
      releaseBindings();
      if (active) {
        active.dead = true;
        const deviceId = active.deviceId;
        try { await bleAPI.disconnect(deviceId); } catch { /* 对端可能已拆链 */ }
      }
    }

    // ---- P003 会话内存快照（commit 由 P002 成功后调用；零持久化） --------

    function commitKnownDevice(snapshot) {
      knownDevice = Object.assign({}, knownDevice || {}, snapshot, {
        deviceId: snapshot && snapshot.deviceId,
        updatedAt: Date.now()
      });
    }

    function getKnownDevice() {
      return knownDevice;
    }

    function getSessionState() {
      return {
        connected: isAlive(),
        deviceId: isAlive() ? session.deviceId : ''
      };
    }

    /** U-REC-001 同型预防：会话存续期间该设备的重连/断开由本服务独占。 */
    function ownsDevice(deviceId) {
      return isAlive() && session.deviceId === deviceId;
    }

    function onSessionDisconnect(callback) {
      if (typeof callback !== 'function') throw new Error('disconnect listener must be a function');
      disconnectListeners.add(callback);
      return () => disconnectListeners.delete(callback);
    }

    function onStatus(callback) {
      if (typeof callback !== 'function') throw new Error('status listener must be a function');
      statusListeners.add(callback);
      return () => statusListeners.delete(callback);
    }

    return {
      connect,
      getDeviceInfo,
      getStatus,
      writeCandidate,
      provisionAndWait,
      waitForProvisionResult,
      waitForStatus,
      cancelProvisionWait,
      diagnose,
      disconnect,
      commitKnownDevice,
      getKnownDevice,
      getSessionState,
      isConnected: () => isAlive(),
      ownsDevice,
      onSessionDisconnect,
      onStatus,
      parseQr: (text) => HID.parsePairingQrPayload(text)
    };
  }

  // ---- 全局挂载（bleAPI 由宿主注入：E-WIN preload / T-WIN 适配层） -------

  function attach(bleAPI) {
    root.SmartHidService = createHidService(bleAPI);
    return root.SmartHidService;
  }

  root.SmartHidDesktop = {
    attach,
    createHidService,
    // 纯函数（供页面 / 测试直接使用）
    parseControlHubAddress,
    formatControlHubAddress,
    buildProvisionFormCandidate,
    deriveProgress,
    matchScannedDevice,
    initialProgress,
    PROGRESS_KEYS
  };
})(typeof window !== 'undefined' ? window : globalThis);
