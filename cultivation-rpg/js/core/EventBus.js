class EventBus {
    constructor() {
        this._listeners = {};
    }

    on(event, callback, context) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push({ callback, context });
    }

    off(event, callback, context) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(
            l => !((callback === null || l.callback === callback) && (context === undefined || l.context === context))
        );
    }

    emit(event, ...args) {
        if (!this._listeners[event]) return;
        for (const l of this._listeners[event]) {
            l.callback.apply(l.context, args);
        }
    }

    clear() {
        this._listeners = {};
    }
}

const Events = new EventBus();
