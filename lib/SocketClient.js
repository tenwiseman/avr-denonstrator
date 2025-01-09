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
            this.receivedLines = []; // Store received lines
            this.expectations = []; // Track expected responses
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

                    // Process expectations
                    if (this.expectations.length > 0) {
                        const expectation = this.expectations[0];
                        if (expectation.regex.test(line)) {
                            //console.log(`PASSED line: ${trimmedLine}`);     
                            expectation.resolve(line);
                        }
                    }
                            
                    // Call the line callback if set
                    if (this.onLineCallback) {
                        this.onLineCallback(line);
                    }






                    /*

                    //console.log(`Received line: ${trimmedLine}`);
                    this.receivedLines.push(trimmedLine);
    
                    // Process expectations
                    if (this.expectations.length > 0) {
                        const expectation = this.expectations[0];
                        if (expectation.regex.test(line)) {
                            //console.log(`PASSED line: ${trimmedLine}`);     
                            expectation.resolve(line);
                            this.expectations.shift();
                        } 
                    }

                   



                    // limit receivedLines storage
                    while (this.receivedLines.length > 20) {
                        this.receivedLines.shift();
                    }
    
                    // Call the line callback if set
                    if (this.onLineCallback) {
                        this.onLineCallback(line);
                    }

                    */
                }
            });
    
            this.socket.on('close', () => {
                // Handle any remaining buffered data
                if (buffer) {
                    console.log(`Processing remaining buffered line: ${buffer}`);

                    // Call the line callback if set
                    if (this.onLineCallback) {
                        this.onLineCallback(buffer);
                    }



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

    // Expect a particular response to a command
    async expectResponse(command, regex, timeout = 5000) {
        await this.ensureSocketAndSend(command);
        
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Expected response not received within ${timeout}ms`));
                this.expectations.shift(); // Ditch the failed expectation
            }, timeout);

            this.expectations.push({
                regex,
                resolve: (response) => {
                    clearTimeout(timer);
                    resolve(response);
                },
                reject
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

    // Return Counts for receivedLines and expectations
    getCounts() {
        const counts = {
            receivedLines: this.receivedLines && this.receivedLines.length,
            expectations: this.expectations && this.expectations.length
         }
        return counts;
    }

}

module.exports = SocketClient;
