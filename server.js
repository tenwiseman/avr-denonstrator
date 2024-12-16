const express = require('express');

const SocketClient = require('./lib/SocketClient.js');
const CommandQueue = require('./lib/CommandQueue.js');

// Initialize the socket client and Express app
const app = express();
const PORT = 8000;
const HOST = '192.168.3.212'; // Replace with your server's address
const SOCKET_PORT = 23; // Replace with the server's port
const socketClient = new SocketClient(HOST, SOCKET_PORT);
const commandQueue = new CommandQueue(socketClient);

// Set up a listener for incoming lines from the socket
socketClient.setLineCallback((line) => {
    //console.log(`Processed line: ${line}`);
});

// Middleware to parse JSON requests
app.use(express.json());

// REST API endpoints

// Send a message through the socket
app.post('/send', async (req, res) => {
    const message = req.body.message;

    if (!message) {
        return res.status(400).send('Message is required');
    }

    try {
        await socketClient.ensureSocketAndSend(`${message}\r`);
        res.send('{"success": "true"}');
    } catch (error) {
        console.error(error.message);
        res.status(500).send(error.message);
    }
});

// Send a message through the socket via both POST and GET methods
// Optionaly request a regex
app.all('/expect', async (req, res) => {

    if (req.method === 'POST') {
        var { command, expected, timeout } = req.body;
        if (!command || !expected) {
            return res.status(400).send('Command and expected response pattern are required');
        }
        
    } else { // GET
        var command = req.query.command || 'PW?'
        var expected = req.query.expected || "(PWON|PWSTANDBY)";
        var timeout = 5000;
    }

    var timeout = timeout || 2000;

    try {
        const regex = new RegExp(expected); // Convert expected string to regex
        const response = await commandQueue.enqueue(`${command}\r`, regex, timeout || 5000);
        console.log(`HTTP(/expect) method:${req.method}, request:${command}, response:${response}`);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
