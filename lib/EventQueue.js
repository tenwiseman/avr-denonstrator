class EventQueue {

    constructor(socketClient) {
        this.queue = [];
        this.processing = false;
        this.socketClient = socketClient;
    }

    enqueue(event) {
        return new Promise((resolve, reject) => {
            this.queue.push({ event, resolve, reject });
        });
    }

    dequeue(event) {
        return new Promise((resolve, reject) => {
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const { event, resolve, reject } = this.queue.shift();

        try {
            resolve(event);
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            this.processQueue(); // Process the next command
        }
    }
}

module.exports = EventQueue;

