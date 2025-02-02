const net = require('net');



class SocketClient {

    constructor(host, port, stream, maxRetries = 3, retryDelay = 1000) {
        this.host = host;
        this.port = port;
        this.maxRetries = maxRetries
        this.retryDelay = 1000
        this.stream = stream

        // open net socket
        this.socket = new net.Socket();
        this.socket.setKeepAlive(true, 10000);

         // handle errors
        this.socket.on('error', (err) => {
            console.error(`Socket error: ${err.message}`);
            this.write(`Socket error: ${err.message}`);
        });
       
        // handle timeouts
        this.socket.on('timeout', () => {
            console.error('Socket timeout');
            //this.socket.destroy();
        });

        // connect it
        this.ensureConnect().then(
            (resolve) => {
                console.log('ensureConnect OK');
            },

            (reject) => {
                console.log('send failed');
            }
        )
    }

    // Connect to the socket server

    connectSocket() {
        
        return new Promise((connected, closed) => {

            this.socket.connect(this.port, this.host, () => {
                this.setupLineReader();
                connected();
            });

            this.socket.on('close', () => {
                console.log('close fired?');
                closed();
            });
            
        });
    }


    // Ensure the socket is connected with retries if not
    async ensureConnect(retries = 0) {

        await this.connectSocket().then(
            (connected) => {
                this.write('es:Connected');
            },
            (closed) => {
                if (retries < this.maxRetries) {
                    this.write(`Trying to reconnect... (${retries + 1}/${this.maxRetries})`);

                    new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                    return this.ensureConnect(retries + 1);
                } 
            }

        )

        return new Promise((resolve, reject) => {
            if (retries < this.maxRetries) {
                resolve();
            } else {
                reject();
            }
        });

      
    }

    // read socket input line by line, discard empty lines and resolve on expectations
    setupLineReader() {
        
        this.receivedLines = []; // Store received lines
        let buffer = '';

        this.socket.on('data', (chunk) => {

            //  if (!this.stream) {
            //      this.stream = new RealTimeStream();
            //  }
            console.log("got");

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
            }
        });

        this.socket.on('close', () => {
            console.log('this socket closed');
            // Handle any remaining buffered data
            if (buffer) {
                console.log(`Processing remaining buffered line: ${buffer}`);

                this.stream.sendData(buffer);

                buffer = ''; // Clear the buffer
            }
        });
    }

    write(message) {
        console.log(message);
        this.socket.write(`${message}\r`);
        this.stream.sendData(message);
    }

    


}

module.exports = SocketClient;


