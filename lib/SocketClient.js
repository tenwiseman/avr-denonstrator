const net = require('net');
const Buffer = require('node:buffer').Buffer;



class SocketClient {

    constructor(host, port, stream) {
        this.host = host;
        this.port = port;
        this.stream = stream;
        
       
        this.mytimeout = null;
        this.pwcheck = false;
        this.cmd = 'event';

        // open net socket
        this.socket = new net.Socket();
        this.socket.setKeepAlive(true, 10000);
        this.socket.setTimeout(3000);
        //this.socket.setEncoding('ASCII');

        this.buffer = Buffer.alloc(256);

         // handle errors
        this.socket.on('error', (err) => {
            this.writelog('error', err.message);
            this.socket.destroy();
        });
       
        // handle timeouts
        //this.socket.on('timeout', () => {
        //    this.writelog('Socket timeout - refresh recommended');
        //    this.socket.destroy();
        //});

        this.socket.on('connect', (connect) => {
            this.writelog('OK','connected');
        });


        // connect socket
        this.socket.connect(this.port, this.host, () => {

            this.setupLineReader();
            // connected();
        });

        
    }

    // read socket input line by line, discard empty lines
    setupLineReader() {
        
        this.receivedLines = []; // Store received lines
        let buffer = '';

        this.socket.on('data', (chunk) => {

            clearTimeout(this.mytimeout); // clear timeout
            this.pwcheck = false;

            this.buffer = Buffer.concat([this.buffer, chunk]);

            let eol = -1;
            let nd = -1;

            while ((eol = this.buffer.indexOf('\r')) > -1) {
                // read to next end of line position
                var line = this.buffer.subarray(0, eol);

                // if 'Onscreen Display Information' Stream
                if (line.includes('NS','ascii')) {

                    var info = line.toString('ascii', 0, 2);
                    var linenum = line.toString('ascii', 3, 3);
                    var ofst = ['0','7','8'].includes(linenum) ? 4 : 5;

                    // find nd delimiter
                    if ((nd = line.indexOf('\0','ascii')) > -1) {
                        console.log(`nd ${linenum} found ${ofst} ${nd}` + line.toString('ascii', ofst, nd));
                        
                        // info = info + line.toString('ascii', 5, nd);

                    };

                    console.log(info);




                    
                }


                console.log(line.toString());










                // leave remains
                this.buffer = this.buffer.subarray(eol + 1);
                
                console.log(`hes ${eol}`);
            }

            /*
                while buffer.contains \r
                    line = buffer read up to \r
                    buffer = remains
                do
            */



            buffer += chunk; // Append incoming data to the buffer
            let lines = buffer.split('\r'); // Split buffer on '\r'

            // Process complete lines and leave the rest in the buffer
            buffer = lines.pop();

            for (var line of lines) {
                const trimmedLine = line.trim(); // Remove leading/trailing whitespace

                if (!trimmedLine) {
                    // Skip received blank lines
                    continue;
                }

                if (line.startsWith('NS')){
                    const regex = /(NS.).([^\0]*)/g;
                    const r = line.match(regex);
                    line = r[0] + r[1] + '|' + '####' + line;
                }



                this.stream.sendData(`${this.cmd},${line}`);
                this.cmd = 'event';
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
            console.log('socket destroyed');
        });
    }

    write(message) {

        this.mytimeout = setTimeout(() => {
            clearTimeout(this.mytimeout);
            if (this.pwcheck) {
                // pw check failed, kill socket
                this.writelog('error','no response - try again');
                this.socket.destroy();
            } else {
                // initial write failed, so send pw check
                console.log('sending pwcheck');
                this.pwcheck = true;
                this.write('PW?\r');
            }
            return;
        }, parseInt(200));

        this.cmd = message;
        this.socket.write(`${message}\r`);    
    }

    writelog(event, message) {
        console.log(`${event},${message}`);
        this.stream.sendData(`${event},${message}`);
    }

}

module.exports = SocketClient;


