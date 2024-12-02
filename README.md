# denon-rest-api

Expose a REST API for a Denon web-enabled AVR receiver for Home Assistant

## Summary
This application creates a REST API that can be used to send commands to a Denon AV receiver over
a network connection. 

This git is a respin of https://github.com/bencouture/denon-rest-api
That github project is missing returning state information for telnet commands like PW?


## Running in Docker
The included Dockerfile will install the dependencies and run on an Ubuntu image. You must set the
ADDRESS environment variable to the IP address of the receiver you want to connect to. Port 8000
is exposed by default.

## Running from comamnd line
1) Navigate to the root of this project in the command line.
1) Install Node (http://nodejs.org) and execute `npm install`. 
2) Run `node . [ip address of receiver] [optional port]` to launch the web server. Port 8000 is used by default.

## Executing commands
Send GET requests to http://localhost:[port]/api/[command]

## Examples
``` Javascript
'http://localhost:8000/api/SIDVD'     //Sets Input to DVD   
'http://localhost:8000/api/SITUNER'   //Sets Input to TUNER   
'http://localhost:8000/api/PWON'      //turns PoWer ON   
```

## Notes
- The full list of valid commands is available in the included protocol PDF from Denon.
- You may need to adjust settings on your receiver to allow remote network control of your device.
- This application communicates with the receiver via the factory-provided telnet API.

