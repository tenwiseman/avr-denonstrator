const net = require('net');
const readline = require('readline');

class SocketClient {
    constructor(host, port, maxRetries = 3, retryDelay = 1000) {
        this.host = host;
        this.port = port;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.socket = null;
        this.lineReader = null;
        this.onLineCallback = null;
        this.receivedLines = []; // Store received lines
    }

    // Connect to the socket server
    connectSocket() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();

            this.socket.connect(this.port, this.host, () => {
                console.log('Connected to the socket server');
                this.setupLineReader();
                resolve();
            });

            this.socket.on('error', (err) => {
                console.error(`Socket error: ${err.message}`);
                this.socket.destroy();
            });

            this.socket.on('close', () => {
                console.log('Socket connection closed');
                this.socket = null;
                this.lineReader = null;
            });

            this.socket.on('timeout', () => {
                console.error('Socket timeout');
                this.socket.destroy();
            });
        });
    }

    // Set up the line-by-line reader
    setupLineReader() {
        if (this.socket) {
            this.lineReader = readline.createInterface({
                input: this.socket,
            });

            this.lineReader.on('line', (line) => {
                console.log(`Received line: ${line}`);
                this.receivedLines.push(line); // Store received lines
                if (this.onLineCallback) {
                    this.onLineCallback(line);
                }
            });
        }
    }

    // Ensure the socket is connected and send data
    async ensureSocketAndSend(message, retries = 0) {
        if (!this.socket || this.socket.destroyed) {
            console.log('Socket is not connected. Attempting to reconnect...');
            try {
                await this.connectSocket();
            } catch (error) {
                if (retries < this.maxRetries) {
                    console.log(`Retrying to connect... (${retries + 1}/${this.maxRetries})`);
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                    return this.ensureSocketAndSend(message, retries + 1);
                } else {
                    throw new Error('Failed to reconnect to socket after retries');
                }
            }
        }

        return new Promise((resolve, reject) => {
            this.socket.write(message, (err) => {
                if (err) {
                    reject(new Error(`Error writing to socket: ${err.message}`));
                } else {
                    console.log(`Message sent: ${message}`);
                    resolve();
                }
            });
        });
    }

    // Get the last received lines
    getLastLines(count = 10) {
        return this.receivedLines.slice(-count);
    }

    // Set callback to handle received lines
    setLineCallback(callback) {
        this.onLineCallback = callback;
    }

    // Check if the socket is connected
    isConnected() {
        return this.socket && !this.socket.destroyed;
    }
}

module.exports = SocketClient;
