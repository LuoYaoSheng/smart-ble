/** Smart HID Provision Status 的业务解释；不进入通用 BLE Runtime。 */

export function classifySmartHidStatus(status) {
  if (!status?.state) return { phase: 'unknown', terminal: false };
  if (status.error) return { phase: 'error', terminal: true, error: status.error };
  if (status.state === 'ready') return { phase: 'ready', terminal: true };
  if (status.state === 'recovery' || status.state === 'error') {
    return { phase: status.state, terminal: true };
  }
  return { phase: status.step || status.state, terminal: false };
}

export function smartHidRecoveryAction(status) {
  switch (status?.error) {
    case 'wifi_failed':
    case 'invalid_payload':
      return 'wifi';
    case 'pairing_invalid':
    case 'pairing_expired':
    case 'pairing_used':
    case 'controlhub_unreachable':
      return 'pairing_qr';
    case 'mqtt_invalid':
      return 'diagnostics';
    default:
      return 'retry';
  }
}
