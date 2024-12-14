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
    console.log(`Processed line: ${line}`);
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

// Queue commands to be processed sequentially through the socket
/*
app.all('/send-Xcommand', async (req, res) => {

    if (req.method === 'POST') {
        var command = req.body.command;
        if (!command) {
            return res.status(400).send('Command is required');
        }
    } else {
        res.send('{"success": "true"}');
        return
        // var command = "PW?\\r"; // default GET to asking PW?
    }

    try {
        await commandQueue.enqueue(`${command}`);
        res.send('{"success": "true"}');
    } catch (error) {
        res.status(500).send(error.message);
    }
});
*/


app.post('/expect', async (req, res) => {
    const { command, expected, timeout } = req.body;

    if (!command || !expected) {
        return res.status(400).send('Command and expected response pattern are required');
    }

    try {
        const regex = new RegExp(expected); // Convert expected string to regex
        const response = await commandQueue.enqueue(`${command}\r`, regex, timeout || 5000);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.all('/send-command', async (req, res) => {

    if (req.method === 'POST') {
        const { command, expected, timeout } = req.body;
        if (!command || !expected) {
            return res.status(400).send('Command and expected response pattern are required');
        }
    } else {
        var command = req.query.command;
        var expected = req.query.expected || "(PWON|PWSTANDBY)";
        var timeout = 5000;
    }

    try {
        const regex = new RegExp(expected); // Convert expected string to regex
        const response = await commandQueue.enqueue(`${command}\r`, regex, timeout || 5000);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});





// RESTFUL Queue commands to be processed sequentially through the socket
/*
app.all('/send-command', async (req, res) => {

    if (req.method === 'POST') {
        var command = req.body.command;
        if (!command) {
            return res.status(400).send('Command is required');
        }
    } else {
        var command = req.query.command || 'PW?';

    }

    try {
        await commandQueue.enqueue(`${command}\r`);

        await socketClient.expectResponseAfterWait(command, 20).then((resolve) => {
            res.send('{"success": "' + resolve + '"}');
        });
*/
        /*



        await new Promise((resolve, reject) => {
            var response = socketClient.expectResponseAfterWait(command, 20);
            console.log(`Resolving: ${response}`);

            resolve(response);
        }).then((resolve) => {
            res.send('{"success": "' + resolve + '"}');
        });

        */
        
        //await socketClient.expectResponseAfterWait(command, 20)
        
        
        // not here - wait for response after queue drains
        //var response = await socketClient.expectResponseAfterWait(command)

        /*

        await commandQueue.enqueue(`${command}\r`).then(() => {

            return socketClient.expectResponseAfterWait(command, 20);
            
          }).then((response) => {
            res.send('{"success": "' + response + '"}');
          });

        */
  /*      
    } catch (error) {
        res.status(500).send(error.message);
    }
});

*/

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
