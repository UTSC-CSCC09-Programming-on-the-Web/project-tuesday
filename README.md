## Step 1: Start the Backend
Go into ./server and run `node server.js` to start the backend

## Step 2: Start the Frontend
Go into ./game-stash and run `ng serve --disable-host-check` to start the frontend

## Step 3: Start the ngrok reverse-proxy
run `ngrok http 4200` the port should be the port that the frontend is hosted on. /
The mobile link will display on the terminal running ngrok /
/
If you want, you can also rename the server to be easier to type out with `ngrok http 4200 --url https://example.ngrok.app`

## Setting up ngrok

1. Make an [ngrok account](https://ngrok.com/)

2. From the same website, ownload and install ngrok (don't use the chocolatey install)

ngrok is often used by malicious actors to develop viruses, so it will most likely get flagged as a trojan by windows security.

3. On the ngrok website again, find your authoken, and type the following into your commandline

ngrok config add-authtoken $YOUR_AUTHTOKEN
