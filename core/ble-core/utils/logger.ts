export type LogType = 'info' | 'success' | 'error' | 'warning' | 'receive' | 'send';

export interface LogEntry {
    message: string;
    type: LogType;
    timestamp: string;
}

export type LogListener = (entry: LogEntry) => void;

class LoggerImpl {
    private readonly maxHistorySize = 500;
    private readonly maxDeviceHistorySize = 200;
    private readonly maxTrackedDevices = 40;
    private history: LogEntry[] = [];
    private historyByDevice: Map<string, LogEntry[]> = new Map();
    private deviceTouchOrder: string[] = [];
    private listeners: Set<LogListener> = new Set();
    private deviceListeners: Map<string, Set<LogListener>> = new Map();

    subscribe(listener: LogListener, deviceId?: string): () => void {
        if (deviceId) {
            if (!this.deviceListeners.has(deviceId)) {
                this.deviceListeners.set(deviceId, new Set());
            }
            this.deviceListeners.get(deviceId)!.add(listener);
            return () => this.deviceListeners.get(deviceId)!.delete(listener);
        } else {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }
    }

    private touchDevice(deviceId: string) {
        const index = this.deviceTouchOrder.indexOf(deviceId);
        if (index >= 0) this.deviceTouchOrder.splice(index, 1);
        this.deviceTouchOrder.push(deviceId);
        while (this.deviceTouchOrder.length > this.maxTrackedDevices) {
            const oldest = this.deviceTouchOrder.shift();
            if (!oldest) break;
            this.historyByDevice.delete(oldest);
        }
    }

    private emit(message: string, type: LogType, deviceId?: string) {
        const entry: LogEntry = {
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.history.unshift(entry);
        if (this.history.length > this.maxHistorySize) {
            this.history.length = this.maxHistorySize;
        }

        if (deviceId) {
            if (!this.historyByDevice.has(deviceId)) {
                this.historyByDevice.set(deviceId, []);
            }
            this.touchDevice(deviceId);
            const devHistory = this.historyByDevice.get(deviceId)!;
            devHistory.unshift(entry);
            if (devHistory.length > this.maxDeviceHistorySize) {
                devHistory.length = this.maxDeviceHistorySize;
            }
            this.deviceListeners.get(deviceId)?.forEach(listener => listener(entry));
        }

        this.listeners.forEach(listener => listener(entry));

        const prefix = `[BLE][${type.toUpperCase()}]`;
        switch (type) {
            case 'error': console.error(`${prefix} ${message}`); break;
            case 'warning': console.warn(`${prefix} ${message}`); break;
            case 'success':
            case 'info':
            case 'receive':
            case 'send':
            default:
                console.log(`${prefix} ${message}`);
                break;
        }
    }

    info(message: string, deviceId?: string) { this.emit(message, 'info', deviceId); }
    success(message: string, deviceId?: string) { this.emit(message, 'success', deviceId); }
    error(message: string, deviceId?: string) { this.emit(message, 'error', deviceId); }
    warning(message: string, deviceId?: string) { this.emit(message, 'warning', deviceId); }
    warn(message: string, deviceId?: string) { this.warning(message, deviceId); }
    receive(message: string, deviceId: string) { this.emit(message, 'receive', deviceId); }
    send(message: string, deviceId: string) { this.emit(message, 'send', deviceId); }

    getHistory(deviceId?: string): LogEntry[] {
        if (deviceId) {
            return [...(this.historyByDevice.get(deviceId) || [])];
        }
        return [...this.history];
    }

    clear(deviceId?: string) {
        if (deviceId) {
            this.historyByDevice.delete(deviceId);
            this.deviceTouchOrder = this.deviceTouchOrder.filter((id) => id !== deviceId);
        } else {
            this.history = [];
            this.historyByDevice.clear();
            this.deviceTouchOrder = [];
        }
    }
}

export const logger = new LoggerImpl();
