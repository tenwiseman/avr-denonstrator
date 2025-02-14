const express = require('express');
const SocketClient = require('./lib/SocketClient.js');
const Readable = require('stream').Readable;


// sends data via readable stream to client  
class RealTimeStream extends Readable {
    constructor(options) {
        super(options);
    }

    _read() {}

    sendData(line) {
        this.push(line);
    }
}

// Replace with your receiver's address & port
const HOST = '192.168.3.212';
const SOCKET_PORT = 23;

// Initialize the socket client and Express app
const app = express();
const PORT = 8000;

// Middleware to parse JSON requests
app.use(express.json());

// Middleware to serve static assets
app.use(express.static('wwwroot', {
    setHeaders: function(res, path) {
        res.set("Access-Control-Allow-Origin", "*");
    }
}));


// Enable urlencoded parsing
app.use(express.urlencoded({
    extended: true
  }));

var socketClient = null;






// Connect a ReadableStream to the browser
app.get('/connect', async (req, res) => {

    // open new stream
    stream = new RealTimeStream();

    // Handle stream errors
    stream.on('error', (err) => {
        console.log('Stream error:', err);
        res.status(500).end('Stream error occurred.');  
    });

    // connect it to a new or existing serverside socketClient
    if (!socketClient || socketClient.socket.destroyed) {
        socketClient = new SocketClient(HOST, SOCKET_PORT, stream);
    } else {
        socketClient.stream = stream;
    }

// 'Content-Security-Policy': "default-src 'none'; img-src 'self'"

    // Set response headers for streaming
    res.set({
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*'
    });

    // Pipe the stream to the response
    stream.pipe(res);


    // End response when the stream is destroyed
    req.on('close', () => {
        console.log('webstream closed');
        // stream.destroy();
    });

});

app.post('/query', async (req, res) => {

    const message = req.body.message;

    if (typeof stream === 'undefined') {
        return res.status(400).send('Reconnect Stream');
    } else if (!message) {
        return res.status(400).send('Message is required');
    } else {

        if (!socketClient || socketClient.socket.destroyed) {
            socketClient = new SocketClient(HOST, SOCKET_PORT, stream);
        }

        socketClient.write(message);
         
    }

    res.end();


});




// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

