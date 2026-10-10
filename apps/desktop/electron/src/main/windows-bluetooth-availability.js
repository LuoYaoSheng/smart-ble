'use strict';
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const STATES = new Set(['poweredOn', 'poweredOff', 'noAdapter', 'unsupportedAdapter', 'unauthorized', 'unavailable']);
function parseAvailability(output) {
  try { const value = JSON.parse(String(output).trim()); return STATES.has(value.state) ? value.state : 'unavailable'; }
  catch (_) { return 'unavailable'; }
}
function queryWindowsAvailability() {
  const script = fs.readFileSync(path.join(__dirname, 'windows-bluetooth-availability.ps1'), 'utf8');
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 8000, maxBuffer: 65536 }, (error, stdout) => resolve(error ? 'unavailable' : parseAvailability(stdout)));
  });
}
function availabilityError(state) {
  return { noAdapter: 'NO_ADAPTER: No Bluetooth adapter was found', poweredOff: 'BLUETOOTH_OFF: Bluetooth is turned off', unsupportedAdapter: 'UNSUPPORTED_ADAPTER: The adapter does not support BLE', unauthorized: 'BLUETOOTH_UNAUTHORIZED: Bluetooth access is denied', unavailable: 'BLUETOOTH_UNAVAILABLE: Bluetooth availability could not be confirmed', unknown: 'BLUETOOTH_UNAVAILABLE: Bluetooth driver is not ready' }[state] || 'BLUETOOTH_UNAVAILABLE: Bluetooth is not ready';
}
module.exports = { parseAvailability, queryWindowsAvailability, availabilityError };
