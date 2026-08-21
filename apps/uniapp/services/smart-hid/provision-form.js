const DEFAULT_PAIRING_PORT = 17892;

export function parseControlHubAddress(value) {
  const address = String(value || '').trim();
  if (!address) throw new Error('请输入 ControlHub 地址');
  if (/\s|[/?#]/.test(address)) throw new Error('ControlHub 主机名格式不正确');

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

export function formatControlHubAddress(info) {
  const host = String(info?.host || '').trim();
  const port = Number(info?.port || DEFAULT_PAIRING_PORT);
  return host ? `${host}:${port}` : '';
}

export function buildProvisionFormCandidate({ wifiSsid, wifiPassword, hubAddress, token }) {
  const { host, port } = parseControlHubAddress(hubAddress);
  return {
    wifi_ssid: String(wifiSsid || '').trim(),
    wifi_password: String(wifiPassword || ''),
    hub_host: host,
    hub_port: port,
    token: String(token || '').trim()
  };
}
