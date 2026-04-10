// OTA Manager for UniApp (ESP32 Firmware Flash Protocol)
// Matches Flutter's MTU 247 + 20ms chunk ruleset.

export const OTA_UUIDS = {
  SERVICE_OTA: "4fafc201-1fb5-459e-8fcc-c5c9c331914d",
  CHAR_CTRL: "beb5483e-36e1-4688-b7f5-ea07361b26c0",
  CHAR_DATA: "beb5483e-36e1-4688-b7f5-ea07361b26c1",
  CHAR_STATUS: "beb5483e-36e1-4688-b7f5-ea07361b26c2"
};

export class OtaManager {
  constructor(deviceId, logCallback) {
    this.deviceId = deviceId;
    this.logCallback = logCallback || (() => {});
    this.isTransmitting = false;
    this.totalBytes = 0;
    this.sentBytes = 0;
    this._statusCallback = null;
    this._progressCallback = null;
  }

  log(msg) {
    this.logCallback('OTA', msg);
  }

  // Request MTU expansion
  async requestMtu() {
    return new Promise((resolve) => {
      // WeChat Mini Program automatically handles MTU negotiated on iOS but on Android needs this:
      uni.setBLEMTU({
        deviceId: this.deviceId,
        mtu: 247,
        success: (res) => {
          this.log('MTU expanded to 247');
          resolve(true);
        },
        fail: (err) => {
          this.log(`MTU expansion failed (or not supported): ${JSON.stringify(err)}`);
          resolve(false); // Can still proceed, but slower chunks might be needed
        }
      });
    });
  }

  // Subscribe to status
  async setupStatusListener(onProgress, onError, onSuccess) {
    this._progressCallback = onProgress;
    
    // First, toggle notify
    await new Promise((resolve, reject) => {
      uni.notifyBLECharacteristicValueChange({
        deviceId: this.deviceId,
        serviceId: OTA_UUIDS.SERVICE_OTA,
        characteristicId: OTA_UUIDS.CHAR_STATUS,
        state: true,
        success: resolve,
        fail: reject
      });
    });

    // Then catch callbacks globally for this manager
    this._statusCallback = (res) => {
      if (res.deviceId === this.deviceId && res.characteristicId === OTA_UUIDS.CHAR_STATUS) {
        // Interpret status here if needed
        // The Flutter version often just auto-updates via chunks sent
        const value = Array.from(new Uint8Array(res.value));
        this.log(`OTA Status Data: ${value.join(',')}`);
      }
    };
    uni.onBLECharacteristicValueChange(this._statusCallback);
  }

  async startOta(fileBuffer, onProgress, onError, onSuccess) {
    try {
      this.isTransmitting = true;
      this.totalBytes = fileBuffer.byteLength;
      this.sentBytes = 0;

      await this.requestMtu();
      await this.setupStatusListener(onProgress, onError, onSuccess);

      this.log(`Starting OTA transfer: ${this.totalBytes} bytes`);

      // 1. Send start command to CTRL (Optional depending on ESP32 specific flash logic, we use standard start)
      // Usually, just sending to Data char is enough for basic OTA
      
      // 2. Start chunking (max 180 bytes per chunk as per Flutter spec)
      const CHUNK_SIZE = 180;
      const dataView = new Uint8Array(fileBuffer);
      
      for (let offset = 0; offset < this.totalBytes; offset += CHUNK_SIZE) {
        if (!this.isTransmitting) {
          throw new Error('OTA Cancelled');
        }

        const end = Math.min(offset + CHUNK_SIZE, this.totalBytes);
        const chunk = dataView.slice(offset, end);
        
        await this._writeChunk(chunk.buffer);
        
        this.sentBytes = end;
        if (this._progressCallback) {
          this._progressCallback(this.sentBytes, this.totalBytes);
        }

        // Mandatory 20ms delay
        await new Promise(r => setTimeout(r, 20));
      }

      this.log('OTA Flash successful!');
      if (onSuccess) onSuccess();

    } catch (e) {
      this.log(`OTA Error: ${e.message}`);
      if (onError) onError(e.message);
    } finally {
      this.isTransmitting = false;
    }
  }

  cancel() {
    this.isTransmitting = false;
  }

  _writeChunk(buffer) {
    return new Promise((resolve, reject) => {
      uni.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: OTA_UUIDS.SERVICE_OTA,
        characteristicId: OTA_UUIDS.CHAR_DATA,
        value: buffer,
        writeType: 'writeNoResponse', // Fast stream
        success: resolve,
        fail: reject
      });
    });
  }
}
