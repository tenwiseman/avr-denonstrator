const express = require('express');

const SocketClient = require('./lib/SocketClient.js');
// const CommandQueue = require('./lib/CommandQueue.js');
// const EventQueue = require('./lib/EventQueue.js');


// Initialize the socket client and Express app
const app = express();
const PORT = 8000;
const HOST = '192.168.3.212'; // Replace with your server's address
const SOCKET_PORT = 23; // Replace with the server's port
const socketClient = new SocketClient(HOST, SOCKET_PORT);
// const commandQueue = new CommandQueue(socketClient);
// const eventQueue = new EventQueue(socketClient);

// Set up a listener for incoming lines from the socket
socketClient.setLineCallback((line) => {
    
    console.log(`Processed event: ${line}`);
    
    eventQueue.enqueue(line);

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

/
// Get the last received lines from the socket
app.get('/lines', (req, res) => {
    const count = parseInt(req.query.count, 10) || 10; // Default to last 10 lines
    const lines = socketClient.getLastLines(count);
    res.json(lines);
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
