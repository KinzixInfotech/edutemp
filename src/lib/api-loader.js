
// Simple event emitter for API loader state
class ApiLoaderState {
    listeners = new Set();
    loadingCount = 0;

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach((listener) => listener(this.loadingCount > 0));
    }

    start() {
        this.loadingCount++;
        if (this.loadingCount === 1) {
            this.notify();
        }
    }

    stop() {
        if (this.loadingCount > 0) {
            this.loadingCount--;
            if (this.loadingCount === 0) {
                this.notify();
            }
        }
    }
}

export const apiLoader = new ApiLoaderState();
