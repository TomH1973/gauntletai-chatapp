import { EventEmitter } from 'events';
import { RateLimitEvent } from './events';

const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 1000; // 1 second

interface RateLimitEvents {
  'batch': RateLimitEvent[];
  [key: `batch:${string}`]: RateLimitEvent[];
}

export class RateLimitEventEmitter extends EventEmitter {
  private eventBatch: RateLimitEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Ensure clean shutdown
    process.on('SIGTERM', () => this.flush());
    process.on('SIGINT', () => this.flush());
  }

  emitEvent(event: RateLimitEvent): boolean {
    this.eventBatch.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    if (this.eventBatch.length >= BATCH_SIZE) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), FLUSH_INTERVAL);
    }

    return true;
  }

  on<K extends keyof RateLimitEvents>(eventName: K, listener: (events: RateLimitEvents[K]) => void): this {
    return super.on(eventName, listener as any);
  }

  private flush(): void {
    if (this.eventBatch.length === 0) return;

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Group events by type for efficient processing
    const eventsByType = this.eventBatch.reduce((acc, event) => {
      const events = acc.get(event.type) || [];
      events.push(event);
      acc.set(event.type, events);
      return acc;
    }, new Map<string, RateLimitEvent[]>());

    // Emit batched events
    eventsByType.forEach((events, type) => {
      super.emit(`batch:${type.toLowerCase()}`, events);
    });

    // Also emit the full batch for consumers that want everything
    super.emit('batch', this.eventBatch);

    this.eventBatch = [];
  }

  shutdown(): void {
    this.flush();
    this.removeAllListeners();
  }
} 