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
        this.expectations = []; // Track expected responses
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

    setupLineReader() {
        if (this.socket) {
            let buffer = '';
    
            this.socket.on('data', (chunk) => {
                console.log(`Received DATA`);
                buffer += chunk; // Append incoming data to the buffer
                let lines = buffer.split('\r'); // Split buffer on '\r'
    
                // Process complete lines and leave the rest in the buffer
                buffer = lines.pop();
    
                for (const line of lines) {
                    const trimmedLine = line.trim(); // Remove leading/trailing whitespace

                    if (!trimmedLine) {
                        // Skip blank lines
                        continue;
                    }

                    console.log(`Received line: ${trimmedLine}`);
                    this.receivedLines.push(trimmedLine);
    
                    // Process expectations
                    if (this.expectations.length > 0) {
                        const expectation = this.expectations[0];
                        if (expectation.regex.test(line)) {
                            console.log(`PASSED line: ${trimmedLine}`);     
                            expectation.resolve(line);
                            this.expectations.shift();
                        }
                    } else {
                        console.log(`No expectations line: ${trimmedLine}`);    
                    }
    
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
                    this.receivedLines.push(buffer);
                    buffer = ''; // Clear the buffer
                }
            });
        }
    }

    /*

    // Set up the line-by-line reader
    setupLineReader() {
        if (this.socket) {
            this.lineReader = readline.createInterface({
                input: this.socket,
            });

            this.lineReader.on('line', (line) => {
                console.log(`Received line: ${line}`);
                this.receivedLines.push(line); // Store received lines

                console.log(`expectations length: ${this.expectations.length}`);
                


                // Check for any pending expectations
                if (this.expectations.length > 0) {
                    const expectation = this.expectations[0];
                    if (expectation.regex.test(line)) {
                        expectation.resolve(line);
                        this.expectations.shift();
                        console.log(`PASSED regex:${expectation.regex} ${line}`);
                    } else {
                        console.log(`Failed regex:${expectation.regex} ${line}`);
                    }
                }

                if (this.onLineCallback) {
                    this.onLineCallback(line);
                }
            });
        }
    }

    */

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

    // Expect a particular response to a command
    async expectResponse(command, regex, timeout = 5000) {
        await this.ensureSocketAndSend(command);
        
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Expected response not received within ${timeout}ms`));
            }, timeout);

            this.expectations.push({
                regex,
                resolve: (response) => {
                    clearTimeout(timer);
                    resolve(response);
                },
                reject,
            });
        });
    }
    
    // Get the last received lines
    getLastLines(count = 10) {
        return this.receivedLines.slice(-count);
    }

    //
    /*
    async getResponseAfterWait(command) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.receivedLines.slice(-1);
    }

    */
    //

    /*
    async expectResponseAfterWait(expected, maxRetries, retries = 0) {

        // pause thread, increasing the delay with each attempt to reduce recursive calls  
        const waitdelay = 100 * (2 ** retries);
        new Promise((resolve) => {
            setTimeout(resolve, waitdelay);
        }).then((resolve) => {
    
            const re = new RegExp(expected);
            var receivedLine = this.receivedLines.slice(-1);

            if (!re.test(receivedLine)) {
                if (retries < maxRetries) {
                    console.log(`Got ${receivedLine}, Retrying for expected ${expected}... (${retries + 1}/${maxRetries})`);
                    this.expectResponseAfterWait(expected, maxRetries, retries + 1)
                } else {
                    console.log(`failed waiting for : ${expected}`);    
                }
            } else {
                console.log(`Returned: ${receivedLine}`);
                
            }

            return new Promise((resolve) => {
                resolve(receivedLine);
            });

            
        });

        

    }

    */




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
