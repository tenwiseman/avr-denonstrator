const express = require('express');

const SocketClient = require('./lib/SocketClient.js');
// const CommandQueue = require('./lib/CommandQueue.js');
// const EventQueue = require('./lib/EventQueue.js');


const { Readable } = require('stream');




// Initialize the socket client and Express app
const app = express();
const PORT = 8000;
const HOST = '192.168.3.212'; // Replace with your server's address
const SOCKET_PORT = 23; // Replace with the server's port
const socketClient = new SocketClient(HOST, SOCKET_PORT);
// const commandQueue = new CommandQueue(socketClient);
// const eventQueue = new EventQueue(socketClient);

// Create a real-time readable stream
class RealTimeStream extends Readable {
    constructor(options) {
        super(options);
        this.counter = 0; // Simulating a counter for real-time data
    }

    _read() {
        // Simulate real-time data by periodically pushing data
        if (!this.interval) {
          this.interval = setInterval(() => {
            if (this.counter < 10) {
              // Push a chunk of real-time data
              this.push(`Real-time data chunk ${this.counter + 1}\n`);
              this.counter++;
            } else {
              // End the stream after sending 10 chunks
              this.push(null);
              clearInterval(this.interval);
            }
          }, 1000); // Emit data every 1 second
        }
      }
  /*
    _read() {}

    sendData() {
        if (this.counter < 10) {
            // Push a chunk of real-time data
            this.push(`Real-time data chunk ${this.counter + 1}\n`);
            this.counter++;
        } else {
            // End the stream after sending 10 chunks
            this.push(null);
        }
    }
        */
}




// Set up a listener for incoming lines from the socket
socketClient.setLineCallback((line) => {
    
    console.log(`Processed event: ${line}`);

});

// Middleware to parse JSON requests
app.use(express.json());

// Middleware to serve static assets
app.use(express.static('wwwroot'));

// Enable urlencoded parsing
app.use(express.urlencoded({
    extended: true
  }));

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

// Get the last received lines from the socket
app.get('/test', (req, res) => {
    res.send('this is a test');
})

app.get('/realtime-stream', (req, res) => {

    // Set response headers for streaming
    //  
    res.set({
        'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    });


    // Create an instance of the real-time readable stream
    const stream = new RealTimeStream();


    //await socketClient.readSocket();




    /*

    // Send data periodically
  const interval = setInterval(() => {
    if (!stream.readableEnded) {
      stream.sendData();
    } else {
      clearInterval(interval);
    }
  }, 1000); // Emit data every 1 second

  */


  
    // Pipe the stream to the response
    stream.pipe(res);
  
    // Handle stream errors
    stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).end('Stream error occurred.');
    });

    // End response when the stream is destroyed
    req.on('close', () => {
       // stream.destroy();
    });
});

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
