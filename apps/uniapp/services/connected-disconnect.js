/** Summarize Promise.allSettled results for batch disconnect. */

export function summarizeDisconnectAllResults(devices, results) {
  const list = Array.isArray(devices) ? devices : [];
  const outcomes = Array.isArray(results) ? results : [];
  let successCount = 0;
  const failures = [];

  outcomes.forEach((result, index) => {
    const device = list[index] || {};
    const label = device.name || device.deviceId || `设备 ${index + 1}`;
    if (result?.status === 'fulfilled') {
      successCount += 1;
      return;
    }
    const reason = result?.reason?.message || result?.reason?.errMsg || '断开失败';
    failures.push({ deviceId: device.deviceId || '', label, reason: String(reason) });
  });

  return {
    total: list.length,
    successCount,
    failureCount: failures.length,
    failures,
    allSucceeded: list.length > 0 && failures.length === 0,
    title: failures.length === 0
      ? '已全部断开'
      : `已断开 ${successCount}/${list.length}`,
    failureSummary: failures.map((item) => item.label).join('、')
  };
}
