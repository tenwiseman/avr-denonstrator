// Denon receivers process commands sequentially.
// To avoid overlapping commands, we implement a command queue:

class CommandQueue {
    constructor(socketClient) {
        this.queue = [];
        this.processing = false;
        this.socketClient = socketClient;
    }

    
    enqueue(command, expectRegex = null, timeout = 5000) {
        return new Promise((resolve, reject) => {
            this.queue.push({ command, expectRegex, timeout, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const { command, expectRegex, timeout, resolve, reject } = this.queue.shift();

        try {
            
            if (expectRegex) {
                const response = await this.socketClient.expectResponse(command, expectRegex, timeout);
                resolve(response);
            } else {
            
                await this.socketClient.ensureSocketAndSend(command);
                resolve();
            }

        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            this.processQueue(); // Process the next command
        }
    }
}

module.exports = CommandQueue;


