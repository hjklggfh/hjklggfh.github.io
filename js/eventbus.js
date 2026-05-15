/**
 * Simple publish/subscribe event bus.
 * Used throughout the game for decoupled communication.
 */
class EventBus {
    constructor() {
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    off(event, callback) {
        const list = this._listeners[event];
        if (!list) return;
        const idx = list.indexOf(callback);
        if (idx !== -1) list.splice(idx, 1);
    }

    emit(event, ...args) {
        const list = this._listeners[event];
        if (!list) return;
        for (const cb of list) {
            try { cb(...args); } catch (e) { console.error(`[EventBus] ${event} handler error:`, e); }
        }
    }

    clear() {
        this._listeners = {};
    }
}

const Events = new EventBus();
