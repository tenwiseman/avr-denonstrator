const net = require('net');
const readline = require('readline');
const { Readable } = require('stream');

class RealTimeStream extends Readable {
    constructor(options) {
        super(options);
        this.counter = 0; // Simulating a counter for real-time data
    }

    _read() {}

    /*
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

     */

     sendData(line) {

        /*
        if (this.counter < 10) {
            // Push a chunk of real-time data
            this.push(`Real-time data chunk ${this.counter + 1}\n ${line}`);
            this.counter++;
        } else {
            // End the stream after sending 10 chunks
            this.push(null);
        }
        */
        this.push(line);
    }
}

class SocketClient {
    constructor(host, port, maxRetries = 3, retryDelay = 1000) {
        this.host = host;
        this.port = port;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.socket = null;
        this.lineReader = null;
        this.onLineCallback = null;
        this.stream = null;
    }

    // Connect to the socket server
    connectSocket() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();

            this.socket.setKeepAlive(true, 10000);
            
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

    // read socket input line by line, discard empty lines and resolve on expectations
    setupLineReader() {
        if (this.socket) {

            this.stream = new RealTimeStream();

            this.receivedLines = []; // Store received lines
            let buffer = '';
    
            this.socket.on('data', (chunk) => {
                buffer += chunk; // Append incoming data to the buffer
                let lines = buffer.split('\r'); // Split buffer on '\r'
    
                // Process complete lines and leave the rest in the buffer
                buffer = lines.pop();
    
                for (const line of lines) {
                    const trimmedLine = line.trim(); // Remove leading/trailing whitespace

                    if (!trimmedLine) {
                        // Skip received blank lines
                        continue;
                    }

                    this.stream.sendData(line);

                    
                            
                    // Call the line callback if set
                    if (this.onLineCallback) {
                        this.onLineCallback(line);
                    }


                }
            });
    
            this.socket.on('close', () => {
                // Handle any remaining buffered data
                if (buffer) {
                    console.log(`Processing remaining buffered line: ${buffer}`);

                    // Call the line callback if set
                    //if (this.onLineCallback) {
                    //    this.onLineCallback(buffer);
                    //}

                    // this.receivedLines.push(buffer);
                    buffer = ''; // Clear the buffer
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
                    //console.log(`Message sent: ${message}`);
                    resolve();
                }
            });
        });
    }


    getStream() {

        return this.stream;

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
