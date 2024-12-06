const express = require('express');
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

// Denon receivers process commands sequentially.
// To avoid overlapping commands, we implement a command queue:

class CommandQueue {
    constructor(socketClient) {
        this.queue = [];
        this.processing = false;
        this.SocketClient = socketClient;
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
            await socketClient.ensureSocketAndSend(command);
            resolve();
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            this.process(); // Process the next command
        }
    }
}

// MAIN




// Initialize the socket client and Express app
const app = express();
const PORT = 8000;
const HOST = '192.168.3.212'; // Replace with your server's address
const SOCKET_PORT = 23; // Replace with the server's port
const socketClient = new SocketClient(HOST, SOCKET_PORT);

const commandQueue = new CommandQueue(socketClient);

// Set up a listener for incoming lines from the socket
socketClient.setLineCallback((line) => {
    console.log(`Processed line: ${line}`);
});

// Middleware to parse JSON requests
app.use(express.json());

// REST API endpoints

// Send a message through the socket
app.post('/send', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).send('Message is required');
    }

    try {
        await socketClient.ensureSocketAndSend(message);
        res.send('Message sent successfully');
    } catch (error) {
        console.error(error.message);
        res.status(500).send(error.message);
    }
});

// Queue commands to be processed sequentially through the socket
app.post('/send-command', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).send('Command is required');
    }

    try {
        await commandQueue.enqueue(`${command}`);
        res.send('Command sent successfully');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get the last received lines from the socket
app.get('/lines', (req, res) => {
    const count = parseInt(req.query.count, 10) || 10; // Default to last 10 lines
    const lines = socketClient.getLastLines(count);
    res.json(lines);
});

// Check the socket connection status
app.get('/status', (req, res) => {
    const status = socketClient.isConnected() ? 'connected' : 'disconnected';
    res.json({ status });
});




// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
