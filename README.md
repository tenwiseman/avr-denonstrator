# denon-avr-rest-api

Expose a REST API for a Denon web-enabled AVR receiver

## Summary
This application creates a REST API that can be used to send commands to a Denon AV receiver over
a network connection.

## Configuration

Change the ip address of the AVR and REST port in server.js (default: 8000) 

## Running in Docker
The included Dockerfile will install the dependencies and run up an Alpine image.

## Running from comamnd line
1) Navigate to the root of this project in the command line.
1) Install Node (http://nodejs.org) and execute `npm install`. 
2) Run `node .` to launch the web server.

## Executing commands
Send POST requests to http://localhost:[port]/[endpoint]

## Endpoints

Here are some Bash test scripts for each, with some examples of output.

### send-command

Sends commands to the connected AVR. These enter a queue and are processed in order.

demo script_
- command_api
``` bash
#!/bin/bash
cmd=$1
curl --header "Content-Type: application/json" \
  --request POST \
  --data "{\"command\":\"$cmd\r\"}" \
  http://localhost:8000/send-command
```
_example output_
``` bash
$ ./message_api PWON
Message sent successfully
```

### send

Send a message straight through to the AVR, bypassing the queue

_demo script_
- message_api
``` bash
#!/bin/bash
cmd=$1
curl --header "Content-Type: application/json" \
  --request POST \
  --data "{\"message\":\"$cmd\r\"}" \
  http://localhost:8000/send
```
_example output_
``` bash
$ ./message_api PWSTANDBY
Message sent successfully
```

### lines n

List last n lines of data received from the AVR

_demo script_
- lines_api {lines}
``` bash
#!/bin/bash
count=$1
curl --header "Content-Type: application/json" \
  http://localhost:8000/lines?count=$count
```
_example output_
``` bash
$ ./lines_api 2
["ZMOFF","PWSTANDBY"]
```

### status

Show connected status of AVR

_demo script_
- status_api
``` bash
#!/bin/bash
curl --header "Content-Type: application/json" \
  http://localhost:8000/status
```
_example output_
``` bash
$ ./status_api
{"status":"connected"}
```





``` Javascript
'http://localhost:8000/api/SIDVD'     //Sets Input to DVD   
'http://localhost:8000/api/SITUNER'   //Sets Input to TUNER   
'http://localhost:8000/api/PWON'      //turns PoWer ON   
```

## Notes
- The full list of valid commands is available in the included protocol PDF from Denon.
- You may need to adjust settings on your receiver to allow remote network control of your device.
- This application communicates with the receiver via the factory-provided telnet API.

## Acknoledgemnts

- This project is a respin of https://github.com/bencouture/denon-rest-api, I needed something
  to talk to my 16yr old Denon AVR-3808 from Home Assistant, mainly to ask nicely if it was
  powered up or not; so that I could switch on a sub-woofer on the other side of the room.

