const net = require('net');



class SocketClient {

    constructor(host, port, stream) {
        this.host = host;
        this.port = port;
        this.stream = stream

        this.mytimeout = null
        this.pwcheck = false

        // open net socket
        this.socket = new net.Socket();
        this.socket.setKeepAlive(true, 10000);
        this.socket.setTimeout(3000);

         // handle errors
        this.socket.on('error', (err) => {
            this.writelog(`Socket error: ${err.message} - refresh recommended`);
            this.socket.destroy();
        });
       
        // handle timeouts
        //this.socket.on('timeout', () => {
        //    this.writelog('Socket timeout - refresh recommended');
        //    this.socket.destroy();
        //});

        this.socket.on('connect', (connect) => {
            this.writelog(`Socket sucessfully connected`);
        });


        // connect socket
        this.socket.connect(this.port, this.host, () => {

            this.setupLineReader();
            // connected();
        });

        
    }

    // read socket input line by line, discard empty lines and resolve on expectations
    setupLineReader() {
        
        this.receivedLines = []; // Store received lines
        let buffer = '';

        this.socket.on('data', (chunk) => {

            clearTimeout(this.mytimeout); // clear timeout

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
            // Handle any remaining buffered data
            if (buffer) {
                console.log(`Processing remaining buffered line: ${buffer}`);

                this.stream.sendData(buffer);

                buffer = ''; // Clear the buffer
            }
            this.socket.destroy();
        });
    }

    write(message) {
        console.log(message);

        this.mytimeout = setTimeout(() => {
            clearTimeout(this.mytimeout);
            if (this.pwcheck) {
                // pw check failed, kill socket
                this.stream.sendData('[pwcheck failed]');
                this.socket.destroy();
            } else {
                // send pw check
                this.pwcheck = true
                this.write('PW?\r');
            }
            return;
        }, parseInt(3000));

        this.socket.write(`${message}\r`);
        
        if (!this.pwcheck) {
            this.stream.sendData('[out] ' +message);
        };
    }

    writelog(message) {
        this.stream.sendData('[log] ' +message);
    }



}

module.exports = SocketClient;


