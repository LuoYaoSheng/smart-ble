/**
 * 配网档案（profile）注册表
 *
 * 「配网 + 扩展」的扩展点：每个设备家族一个 profile，声明自己的
 * UUID / 特征 / 广播名前缀 / QR scheme。通用 transport 与扫描过滤
 * 只认 profile，不认识具体设备——后续接入新设备家族时：
 *
 *   1. core/protocols/ 下写该家族的协议定义（UUID、候选 schema、错误码）
 *   2. defineProvisioningProfile({...}) 注册
 *   3. 扫描列表 / 向导即可发现并配网该家族，无需改框架
 *
 * Smart HID 是第一个注册的档案（见 services/smart-hid/index.js）。
 *
 * @module services/provisioning/profiles
 */

const registry = new Map();

/**
 * 注册一个配网档案。
 *
 * @param {object} p
 * @param {string} p.id 档案唯一 ID（如 'smart-hid'）
 * @param {string} p.serviceUuid Provisioning Service UUID
 * @param {object} p.characteristics 特征 UUID 映射（至少含 input；通常有 info/status）
 * @param {string} [p.namePrefix] 广播名前缀（辅助过滤，如 'SHID-'）
 * @param {string[]} [p.notifyUuids] 连接后立即订阅 notify 的特征
 * @param {number} [p.mtu] 期望 MTU（默认 247）
 * @param {function} [p.parseQr] (text)=>payload|null，识别本家族的配对 QR
 * @returns {object} 注册后的档案（幂等：重复注册同 id 覆盖）
 */
export function defineProvisioningProfile(p) {
  if (!p || !p.id || !p.serviceUuid) throw new Error('profile 需要 id 与 serviceUuid');
  const profile = {
    id: p.id,
    serviceUuid: p.serviceUuid,
    characteristics: p.characteristics || {},
    namePrefix: p.namePrefix || '',
    notifyUuids: p.notifyUuids || [],
    mtu: p.mtu || 247,
    parseQr: p.parseQr || null,
    ...p
  };
  registry.set(p.id, profile);
  return profile;
}

export function getProfile(id) {
  return registry.get(id) || null;
}

export function listProfiles() {
  return Array.from(registry.values());
}

/**
 * 通用扫描过滤器：按任一已注册档案匹配（serviceUuid 命中广播的
 * advertisServiceUUIDs，或 name 前缀命中）。
 * 返回 { device, profile } 列表。
 */
export function matchScannedDevices(devices) {
  const profiles = listProfiles();
  const out = [];
  (devices || []).forEach((d) => {
    const uuids = (d.advertisServiceUUIDs || []).map((u) => String(u).toLowerCase());
    const name = d.name || d.localName || '';
    for (const p of profiles) {
      const uuidHit = uuids.includes(String(p.serviceUuid).toLowerCase());
      const nameHit = p.namePrefix && name.toUpperCase().indexOf(p.namePrefix.toUpperCase()) === 0;
      if (uuidHit || nameHit) {
        out.push({ device: d, profile: p });
        return;
      }
    }
  });
  return out;
}
