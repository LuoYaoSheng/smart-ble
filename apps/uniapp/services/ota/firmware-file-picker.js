/** Local file selection; file contents stay in memory and never leave device. */
let androidPickerActive = false;

async function chooseAndroidFile(extension) {
  if (androidPickerActive) throw new Error('请先完成当前文件选择');
  androidPickerActive = true;
  const bridge = globalThis.plus.android;
  let activity;
  try { activity = bridge.runtimeMainActivity(); bridge.importClass(activity); }
  catch (error) { androidPickerActive = false; throw error; }
  const previous = activity.onActivityResult;
  const request = 0x4f54;
  return new Promise((resolve, reject) => {
    const finish = (value, error) => {
      activity.onActivityResult = previous;
      androidPickerActive = false;
      error ? reject(error) : resolve(value);
    };
    activity.onActivityResult = (requestCode, resultCode, result) => {
      if (requestCode !== request) { previous?.(requestCode, resultCode, result); return; }
      if (resultCode !== -1 || !result) { finish(null); return; }
      let stream, output, cursor;
      try {
        const uri = bridge.invoke(result, 'getData');
        const resolver = bridge.invoke(activity, 'getContentResolver');
        cursor = bridge.invoke(resolver, 'query', uri, null, null, null, null);
        let name = '';
        if (cursor && bridge.invoke(cursor, 'moveToFirst')) {
          const index = bridge.invoke(cursor, 'getColumnIndex', '_display_name');
          if (index >= 0) name = bridge.invoke(cursor, 'getString', index);
        }
        if (!name.toLowerCase().endsWith(extension)) throw new Error(`请选择 ${extension} 文件`);
        stream = bridge.invoke(resolver, 'openInputStream', uri);
        output = bridge.newObject('java.io.ByteArrayOutputStream');
        const byteType = bridge.getAttribute('java.lang.Byte', 'TYPE');
        const buffer = bridge.invoke('java.lang.reflect.Array', 'newInstance', byteType, 8192);
        let count, total = 0;
        while ((count = bridge.invoke(stream, 'read', buffer)) !== -1) {
          total += count;
          if (total > 16 * 1024 * 1024) throw new Error('固件包不能超过 16 MB');
          bridge.invoke(output, 'write', buffer, 0, count);
        }
        const base64 = bridge.invoke('android.util.Base64', 'encodeToString', bridge.invoke(output, 'toByteArray'), 2);
        const data = uni.base64ToArrayBuffer(base64);
        let decoded = data;
        if (extension === '.json') {
          const bytes = new Uint8Array(data);
          let text = '';
          for (const byte of bytes) text += String.fromCharCode(byte);
          decoded = decodeURIComponent(escape(text));
        }
        finish({ name, data: decoded });
      } catch (error) { finish(null, error); }
      finally {
        for (const handle of [cursor, stream, output]) {
          if (handle) { try { bridge.invoke(handle, 'close'); } catch (_) {} }
        }
      }
    };
    try {
      const intent = bridge.newObject('android.content.Intent', 'android.intent.action.OPEN_DOCUMENT');
      bridge.invoke(intent, 'addCategory', 'android.intent.category.OPENABLE');
      bridge.invoke(intent, 'setType', '*/*');
      bridge.invoke(intent, 'addFlags', 1); // Temporary read grant; no broad storage permission.
      activity.startActivityForResult(intent, request);
    } catch (error) { finish(null, error); }
  });
}

export async function chooseFirmwareFile(extension) {
  if (globalThis.plus?.os?.name === 'Android' && globalThis.plus?.android) return chooseAndroidFile(extension);
  if (typeof document === 'undefined' || typeof FileReader === 'undefined') {
    throw new Error('当前容器不提供本地文件读取，请使用原生 Apple 客户端或 Android App');
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = extension; input.style.display = 'none';
    const finish = (value, error) => { input.remove(); error ? reject(error) : resolve(value); };
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { finish(null); return; }
      if (!file.name.toLowerCase().endsWith(extension)) { finish(null, new Error(`请选择 ${extension} 文件`)); return; }
      if (file.size > 16 * 1024 * 1024) { finish(null, new Error('固件包不能超过 16 MB')); return; }
      const reader = new FileReader();
      reader.onerror = () => finish(null, new Error('文件读取失败'));
      reader.onload = () => finish({ name: file.name, data: reader.result });
      extension === '.json' ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    }, { once: true });
    document.body.appendChild(input); input.click();
  });
}
