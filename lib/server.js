const express = require('express');

const SocketClient = require('./SocketClient.js');
const CommandQueue = require('./CommandQueue.js');

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
