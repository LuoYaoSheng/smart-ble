const BleUtils = require('../ble-core/desktop-shared/BleUtils');

describe('BleUtils Stability & Core Algorithms', () => {
    
    describe('HEX conversions', () => {
        test('bytesToHex correctly formats Uint8Array', () => {
            const bytes = new Uint8Array([1, 2, 10, 255]);
            expect(BleUtils.bytesToHex(bytes)).toBe('01 02 0A FF');
            expect(BleUtils.bytesToHex(bytes, '')).toBe('01020AFF');
        });

        test('hexToBytes converts strict hex string correctly', () => {
            expect(BleUtils.hexToBytes('01020AFF')).toEqual(new Uint8Array([1, 2, 10, 255]));
        });

        test('hexToBytes tolerates spaces and prefixes', () => {
            expect(BleUtils.hexToBytes('0x01 0XFF')).toEqual(new Uint8Array([1, 255]));
            expect(BleUtils.hexToBytes(' 01  0A FF')).toEqual(new Uint8Array([1, 10, 255]));
        });

        test('hexToBytes throws on odd length hex', () => {
            expect(() => BleUtils.hexToBytes('0FF')).toThrow(/odd length/);
        });

        test('isValidHex strict validation', () => {
            expect(BleUtils.isValidHex('01 0A FF')).toBe(true);
            expect(BleUtils.isValidHex('0XFF')).toBe(false); // isValidHex doesn't strip prefixes intentionally before
            expect(BleUtils.isValidHex('0Z FF')).toBe(false);
        });
    });

    describe('UUID Normalization & Resolution', () => {
        test('normalizeUuid handles full and short form', () => {
            expect(BleUtils.normalizeUuid('180D')).toBe('180d');
            expect(BleUtils.normalizeUuid('4fafc201-1fb5-459e-8fcc-c5c9c331914d'))
                .toBe('4fafc201-1fb5-459e-8fcc-c5c9c331914d');
            expect(BleUtils.normalizeUuid('00002A1900001000800000805F9B34FB'))
                .toBe('00002a19-0000-1000-8000-00805f9b34fb');
        });

        test('uuidEqual ignores case and dashes', () => {
            expect(BleUtils.uuidEqual('00002a00-0000-1000-8000-00805f9b34fb', '00002A0000001000800000805F9B34FB')).toBe(true);
        });

        test('getServiceName standard fallback', () => {
            expect(BleUtils.getServiceName('0000180D-0000-1000-8000-00805F9B34FB')).toBe('心率服务');
            expect(BleUtils.getServiceName('4FAFC201-1FB5-459E-8FCC-C5C9C331914D')).toBe('OTA 升级服务');
            expect(BleUtils.getServiceName('9999-9999')).toBe('未知服务');
        });
    });

    describe('Concurrency Watchdog & Throttler', () => {
        beforeAll(() => {
            jest.useFakeTimers();
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        test('withTimeout passes cleanly if resolved in time', async () => {
            const rawPromise = new Promise(resolve => setTimeout(() => resolve('OK'), 1000));
            const p = BleUtils.withTimeout(rawPromise, 3000);
            
            jest.advanceTimersByTime(1000);
            await expect(p).resolves.toBe('OK');
        });

        test('withTimeout throws Timeout explicitly if watchdog triggers', async () => {
            const rawPromise = new Promise(resolve => setTimeout(() => resolve('OK'), 5000));
            const p = BleUtils.withTimeout(rawPromise, 3000, 'BLE Deadlock Timeout');
            
            jest.advanceTimersByTime(3000);
            await expect(p).rejects.toThrow('BLE Deadlock Timeout');
        });

        test('createThrottler debounces 10 calls down to 1 per frame', () => {
            const throttled = BleUtils.createThrottler();
            const mockupCallback = jest.fn();

            // Fire 10 times synchronously
            for(let i=0; i<10; i++) {
                throttled(mockupCallback, i);
            }

            expect(mockupCallback).toHaveBeenCalledTimes(0);
            
            // In Node, createThrottler falls back to setTimeout(cb, 16)
            jest.advanceTimersByTime(16);
            
            // Only the final invocation (args: 9) should trigger precisely once
            expect(mockupCallback).toHaveBeenCalledTimes(1);
            expect(mockupCallback).toHaveBeenCalledWith(9);
        });
    });
});
