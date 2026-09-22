import { Ride, Driver } from '../types.ts';

export type LiveEventType =
  | 'RIDE_CREATED'
  | 'RIDE_UPDATED'
  | 'RIDE_DELETED'
  | 'DRIVER_UPDATED'
  | 'SYSTEM_PING'
  | 'CONNECTED';

export interface LiveEventPayload {
  type: LiveEventType;
  payload?: any;
  timestamp: string;
}

type EventListener = (event: LiveEventPayload) => void;

class RealtimeSyncManager {
  private listeners = new Set<EventListener>();
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected = false;
  private reconnectTimeout: any = null;

  constructor() {
    this.initBroadcastChannel();
    this.initEventSource();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('vaicar_realtime_sync');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data && ev.data.type) {
            this.notifyListeners(ev.data);
          }
        };
      } catch (err) {
        console.warn('[RealtimeSync] BroadcastChannel not supported:', err);
      }
    }
  }

  private initEventSource() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // ignore
      }
    }

    try {
      this.eventSource = new EventSource('/api/v1/live/stream');

      this.eventSource.onopen = () => {
        this.isConnected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: LiveEventPayload = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          // heartbeat or non-json message
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          try {
            this.eventSource.close();
          } catch {
            // ignore
          }
          this.eventSource = null;
        }

        // Auto-reconnect after 2 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.initEventSource();
          }, 2000);
        }
      };
    } catch (err) {
      console.warn('[RealtimeSync] SSE connection error:', err);
    }
  }

  private notifyListeners(event: LiveEventPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[RealtimeSync] Listener execution error:', err);
      }
    });
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcasts a ride change instantly locally and across tabs in the same browser
   */
  public broadcastLocalChange(type: LiveEventType, payload: any) {
    const message: LiveEventPayload = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    // 1. Notify listeners in current tab immediately
    this.notifyListeners(message);

    // 2. Notify other tabs in same browser via BroadcastChannel (< 1ms latency)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // ignore
      }
    }
  }

  public getConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimeSync = new RealtimeSyncManager();

export function broadcastLocalRideUpdate(ride: Ride) {
  realtimeSync.broadcastLocalChange('RIDE_UPDATED', ride);
}

export function broadcastLocalRideCreated(ride: Ride) {
  realtimeSync.broadcastLocalChange('RIDE_CREATED', ride);
}
