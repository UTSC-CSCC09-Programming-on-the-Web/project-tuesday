
## Basic Flow
### Step 1: Start the Backend
Go into ./server and run `node server.js` to start the backend

### Step 2: Start the Frontend
Go into ./game-stash and run `ng serve` to start the frontend

## Public Domain Hosting (ngrok) Flow
### Step 1: Setup 
Refer to the steps given at the bottom. Setup will only have to be done once.

### Step 2: Start the ngrok reverse-proxy
Open a terminal and run `ngrok start --all`, this should start 2 HTTPS tunnels

### Step 3: Modify SERVER_ADDRESS
in `socket.service.ts` change the value of `SERVER_ADDRESS` to be the ngrok tunnel entrypoint address for http://localhost:3000. It should look something like `https://067f-135-0-196-98.ngrok-free.app`. We are pointing our frontend to our backend.

### Step 4: Start the Backend
Go into ./server and run `node server.js` to start the backend

### Step 5: Start the Frontend
Go into ./game-stash and run `ng serve --disable-host-check` to start the frontend

### Setting up ngrok

1. Make an [ngrok account](https://ngrok.com/)

2. From the same website, **download and install ngrok** (don't use the chocolatey install)

	*ngrok is sometimes used by malicious actors to develop viruses, so it will probably get flagged as a trojan by windows security. It is not.*

3. On the ngrok website again, find your **auth token**, and copy it down

4. We are going to change our ngrok configuration in order to serve our webapp. Run `ngrok config check` to find the location of your ngrok.yml configuration file, and **replace it with the one found in this repository** (don't forget to paste in your auth token as well).
