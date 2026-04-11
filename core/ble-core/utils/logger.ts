import { LogEntry, LogType } from '../domain/device';

export type LogListener = (entry: LogEntry) => void;

class LoggerImpl {
    private readonly maxHistorySize = 1000;
    private history: LogEntry[] = [];
    private historyByDevice: Map<string, LogEntry[]> = new Map();
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

    private emit(message: string, type: LogType, deviceId?: string) {
        const entry: LogEntry = {
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.history.unshift(entry);
        if (this.history.length > this.maxHistorySize) {
            this.history.pop();
        }

        if (deviceId) {
            if (!this.historyByDevice.has(deviceId)) {
                this.historyByDevice.set(deviceId, []);
            }
            const devHistory = this.historyByDevice.get(deviceId)!;
            devHistory.unshift(entry);
            if (devHistory.length > this.maxHistorySize) {
                devHistory.pop();
            }
            this.deviceListeners.get(deviceId)?.forEach(listener => listener(entry));
        }

        this.listeners.forEach(listener => listener(entry));

        // Use standard console for debug printing
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
    receive(message: string, deviceId: string) { this.emit(message, 'receive', deviceId); }
    send(message: string, deviceId: string) { this.emit(message, 'send', deviceId); }

    getHistory(deviceId?: string): LogEntry[] {
        if (deviceId) {
            return this.historyByDevice.get(deviceId) || [];
        }
        return [...this.history];
    }

    clear(deviceId?: string) {
        if (deviceId) {
            this.historyByDevice.delete(deviceId);
        } else {
            this.history = [];
            this.historyByDevice.clear();
        }
    }
}

export const logger = new LoggerImpl();
