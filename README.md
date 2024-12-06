# denon-avr-rest-api

Expose a REST API for a Denon web-enabled AVR receiver

## Summary
This application creates a REST API that can be used to send commands to a Denon AV receiver over
a network connection.

## Configuration
Change the ip address of the AVR and REST port in server.js (default: 8000) 

***

## Running in Docker
The included Dockerfile will install the dependencies and run up an Alpine image.

## Running from command line
1) Navigate to the root of this project in the command line.
1) Install Node (http://nodejs.org) and execute `npm install`. 
2) Run `node .` to launch the web server.

## Executing commands
Send POST requests to http://localhost:[port]/[endpoint]

***

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
***

## Notes
- The full list of valid commands is available in the included protocol PDF from Denon. You may
find a closer one matching your receiver on Google.
- You may need to adjust settings on your receiver to allow remote network control of your device.
- This application communicates with the receiver via the factory-provided telnet API.
- Beware, this is unsecured telnet. You do know that is NOT a good idea, and should be nowhere near
a live Internet interface, Use a disconected VLAN ;->

## Acknoledgemnts
- This project is a complete respin of https://github.com/bencouture/denon-rest-api, I needed something
  to talk to my 16yr old Denon AVR-3808 from Home Assistant, mainly to ask nicely if it was
  powered up or not; so that it could switch on a sub-woofer located on the other side of the room.

  TBH I wasn't that satisfied with the Denon/DenonAVR integration offered in HA. If someone wants to
  use this as a basic to rewrite that, knock yourself out! Beside ChatGPT wrote me most of the code.
  I just told it what I wanted. It works but YMMV. MIT Licence.

