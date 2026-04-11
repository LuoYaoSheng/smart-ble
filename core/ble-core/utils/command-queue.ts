import { logger } from './logger';

export type CommandStatus = 'pending' | 'sending' | 'success' | 'failed';

export interface CommandItem {
    id: string;
    deviceId: string;
    serviceUuid: string;
    characteristicUuid: string;
    data: Uint8Array;
    withoutResponse?: boolean;
    displayHex: string;
    status: CommandStatus;
    error?: string;
    sentAt?: Date;
}

export type CommandSender = (command: CommandItem) => Promise<void>;

export interface CommandQueueOptions {
    intervalMs?: number;
    onCommandStart?: (command: CommandItem) => void;
    onCommandComplete?: (command: CommandItem) => void;
    onCommandError?: (command: CommandItem) => void;
    onQueueEmpty?: () => void;
    onQueueStateChanged?: () => void;
}

export class CommandQueue {
    private queue: CommandItem[] = [];
    private history: CommandItem[] = [];
    
    public intervalMs: number = 50;
    private _isRunning = false;
    private _isPaused = false;
    
    private _isLooping = false;
    private _targetLoopCount = 0;
    private _currentLoop = 0;
    private _loopTemplate: CommandItem[] | null = null;
    
    private sender: CommandSender;
    private options: CommandQueueOptions;
    
    constructor(sender: CommandSender, options: CommandQueueOptions = {}) {
        this.sender = sender;
        this.options = options;
        if (options.intervalMs !== undefined) {
            this.intervalMs = options.intervalMs;
        }
    }
    
    get pendingCount(): number { return this.queue.length; }
    get isRunning(): boolean { return this._isRunning; }
    get isPaused(): boolean { return this._isPaused; }
    get isLooping(): boolean { return this._isLooping; }
    get currentLoop(): number { return this._currentLoop; }
    get targetLoopCount(): number { return this._targetLoopCount; }
    get getQueue(): CommandItem[] { return [...this.queue]; }
    get getHistory(): CommandItem[] { return [...this.history]; }
    
    enqueue(command: CommandItem): void {
        this.queue.push(command);
        this.options.onQueueStateChanged?.();
        this.startProcessing();
    }
    
    enqueueBatch(commands: CommandItem[]): void {
        this.queue.push(...commands);
        this.options.onQueueStateChanged?.();
        this.startProcessing();
    }
    
    startLoop(commands: CommandItem[], loopCount: number = 0): void {
        this.stopLoop();
        this._isLooping = true;
        this._targetLoopCount = loopCount;
        this._currentLoop = 0;
        this._loopTemplate = commands;
        this.enqueueNextLoop();
        this.options.onQueueStateChanged?.();
    }
    
    stopLoop(): void {
        this._isLooping = false;
        this._loopTemplate = null;
        this._targetLoopCount = 0;
        this._currentLoop = 0;
        this.options.onQueueStateChanged?.();
    }
    
    pause(): void {
        this._isPaused = true;
        this.options.onQueueStateChanged?.();
    }
    
    resume(): void {
        this._isPaused = false;
        this.options.onQueueStateChanged?.();
        this.startProcessing();
    }
    
    clear(): void {
        this.queue = [];
        this.stopLoop();
        this._isRunning = false;
        this._isPaused = false;
        this.options.onQueueStateChanged?.();
    }
    
    clearHistory(): void {
        this.history = [];
    }
    
    private startProcessing(): void {
        if (this._isRunning || this._isPaused || this.queue.length === 0) {
            return;
        }
        this._isRunning = true;
        this.processNext().catch(e => logger.error(`Queue error: ${e}`));
    }
    
    private async processNext(): Promise<void> {
        if (this._isPaused || this.queue.length === 0) {
            this._isRunning = false;
            if (this.queue.length === 0 && !this._isLooping) {
                this.options.onQueueEmpty?.();
            }
            if (this.queue.length === 0 && this._isLooping) {
                this.enqueueNextLoop();
                if (this.queue.length > 0) {
                    await this.processNext();
                } else {
                    this._isRunning = false;
                }
            }
            return;
        }
        
        const command = this.queue.shift()!;
        command.status = 'sending';
        command.sentAt = new Date();
        this.options.onCommandStart?.(command);
        this.options.onQueueStateChanged?.();
        
        try {
            await this.sender(command);
            command.status = 'success';
            this.options.onCommandComplete?.(command);
        } catch (e) {
            command.status = 'failed';
            command.error = e instanceof Error ? e.message : String(e);
            this.options.onCommandError?.(command);
            logger.error(`指令发送失败: ${e}`, command.deviceId);
        }
        
        this.history.push(command);
        this.options.onQueueStateChanged?.();
        
        if (this.queue.length > 0 || this._isLooping) {
            await this.sleep(this.intervalMs);
            await this.processNext();
        } else {
            this._isRunning = false;
            this.options.onQueueEmpty?.();
            this.options.onQueueStateChanged?.();
        }
    }
    
    private enqueueNextLoop(): void {
        if (!this._isLooping || !this._loopTemplate) return;
        
        if (this._targetLoopCount > 0 && this._currentLoop >= this._targetLoopCount) {
            this._isLooping = false;
            this._loopTemplate = null;
            this.options.onQueueEmpty?.();
            this.options.onQueueStateChanged?.();
            return;
        }
        
        this._currentLoop++;
        
        const newCommands = this._loopTemplate.map(item => ({
            id: `${item.id}_loop${this._currentLoop}`,
            deviceId: item.deviceId,
            serviceUuid: item.serviceUuid,
            characteristicUuid: item.characteristicUuid,
            data: new Uint8Array(item.data),
            withoutResponse: item.withoutResponse,
            displayHex: item.displayHex,
            status: 'pending' as CommandStatus
        }));
        
        this.queue.push(...newCommands);
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
