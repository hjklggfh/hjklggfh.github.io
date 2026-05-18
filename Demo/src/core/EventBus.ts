export type EventMap = Record<string, unknown>;

export class EventBus<TEvents extends EventMap> {
  private readonly listeners = new Map<keyof TEvents, Set<(payload: TEvents[keyof TEvents]) => void>>();

  on<TKey extends keyof TEvents>(type: TKey, listener: (payload: TEvents[TKey]) => void): () => void {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener as (payload: TEvents[keyof TEvents]) => void);
    return () => bucket?.delete(listener as (payload: TEvents[keyof TEvents]) => void);
  }

  emit<TKey extends keyof TEvents>(type: TKey, payload: TEvents[TKey]): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const listener of bucket) {
      listener(payload as TEvents[keyof TEvents]);
    }
  }
}
