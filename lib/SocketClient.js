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
        });

    }

    streamline(line) {

        var info = line.toString('ascii');

        // if 'Onscreen Display Information' Stream
        if (line.includes('NS','ascii')) {

            const evnt = line.toString('ascii', 0, 3);         // event
            const lnum = line.toString('ascii', 3, 4);         // line number
            const cuib = line[4];                              // 'Cursor Information Byte'
            const ofst = ['0','7','8'].includes(lnum) ? 4 : 5; // char offset for info

            let curs = ' ';
            let nd = 0;
            
            // 'Cursor Select'
            if ((ofst == 5) && (cuib & 0b1000 )) {
                curs = '*';
            }

            // Truncate info after \0 char
            if ((nd = line.indexOf('\0','ascii')) > -1) {
                var info = evnt + lnum + curs + line.toString('ascii', ofst, nd);
            } 
        } 
        
        // stream as CSV to browser
        this.stream.sendData(`${this.cmd},${info},`);
        this.cmd = 'event';

    }



    // read socket input line by line

    setupLineReader() {
        
        this.receivedLines = [];                              // Store received lines
        let buffer = '';

        this.socket.on('data', (chunk) => {

            clearTimeout(this.mytimeout); // clear timeout
            this.pwcheck = false;

            this.buffer = Buffer.concat([this.buffer, chunk]);

            let eol = -1;

            // process buffer contents line by line
            while ((eol = this.buffer.indexOf('\r')) > -1) {
                var line = this.buffer.subarray(0, eol);      // read to next end of line position
                this.streamline(line);                        // stream out this line to browser
                this.buffer = this.buffer.subarray(eol + 1);  // leave the remains in the buffer        
            }
        });

        if (this.buffer.length > 0) {
            this.streamline(this.buffer);                     // stream out to browser any remains in buffer
        
        }
            
        this.socket.on('close', () => {
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
        this.stream.sendData(`${event},${message},`);
    }

}

module.exports = SocketClient;


