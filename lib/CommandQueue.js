// Denon receivers process commands sequentially.
// To avoid overlapping commands, we implement a command queue:

class CommandQueue {
    constructor(socketClient) {
        this.queue = [];
        this.processing = false;
        this.socketClient = socketClient;
    }

    async enqueue(command) {
        return new Promise((resolve, reject) => {
            this.queue.push({ command, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const { command, resolve, reject } = this.queue.shift();
        try {
            await this.socketClient.ensureSocketAndSend(command);
            resolve();
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            this.process(); // Process the next command
        }
    }
}

module.exports = CommandQueue;


