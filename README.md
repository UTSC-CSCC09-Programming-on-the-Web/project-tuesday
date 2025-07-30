LIVE LINK: https://www.gamestash.live/ (credit card signup with 4242...) \
YOUTUBE LINK: https://youtu.be/9gFLDR9AR7U

## Basic Flow

### Step 1: Start the Backend

Go into ./server and run `node server.js` to start the backend (set up Postgres using the steps below if starting this app for the first time)
Go into ./server and run `node server.js` to start the backend (if starting this app for the first time, set up Postgres using the steps below and make sure to create a server/.env file based off of the server/.env.example file. Ask Alton for any secrets you don't have)

### Step 2: Start the Frontend

Go into ./game-stash and run `ng serve` to start the frontend

### Step 3: Start Stripe Webhooks Locally (remove this step once the web app is deployed)

Go to ./game-stash and run `stripe listen --forward-to localhost:3000/webhook/stripe` to start the Stripe webhooks

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

## First-time Setup Steps

### Setting up ngrok

1. Make an [ngrok account](https://ngrok.com/)

2. From the same website, **download and install ngrok** (don't use the chocolatey install)

   _ngrok is sometimes used by malicious actors to develop viruses, so it will probably get flagged as a trojan by windows security. It is not._

3. On the ngrok website again, find your **auth token**, and copy it down

4. We are going to change our ngrok configuration in order to serve our webapp. Run `ngrok config check` to find the location of your ngrok.yml configuration file, and **replace it with the following** (don't forget to paste in your auth token as well).

```
version: "3"
agent:
	authtoken: # AUTH TOKEN HERE
tunnels:
	frontend:
		proto: http
		addr: 4200
	backend:
		proto: http
		addr: 3000
```

### Setting up Stripe

1. **Create a Stripe Account**
   - Go to [Stripe](https://stripe.com/) and create a free account
   - Navigate to the Dashboard after signing in

2. **Get Your API Keys**
   - In the Stripe Dashboard, go to **Developers** → **API keys**
   - Copy the **Publishable key** (starts with `pk_test_`)
   - Copy the **Secret key** (starts with `sk_test_`)

3. **Create a Product and Price**
   - Go to **Products** in the Stripe Dashboard
   - Click **Add product**
   - Set name to "GameStash"
   - Set price (e.g., $9.99/month for our application)
   - Save the product and copy the **Price ID** (starts with `price_`)

4. **Set up Webhooks for Local Development (Update this step once the web app has been deployed)**
   - Download and install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
   - Login to your Stripe account via CLI: `stripe login`
   - In a new terminal window, start webhook forwarding:
     ```
     stripe listen --forward-to localhost:3000/webhook/stripe
     ```
   - Copy the **webhook signing secret** from the CLI output (starts with `whsec_`) - this will be displayed every time you run the listen command, but you only need to update the webhook constant in .env once
   - Keep this terminal window open while developing - it will forward Stripe webhook events to your local server
   - The CLI will automatically handle the webhook events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - You can use the credit card number 4242 4242 4242 4242 with any expiry date in the future and any CVC and ZIP code to emulate a successful payment. Check the Stripe docs for other fake card numbers you can use.

5. **Update Environment Variables**
   - Copy `server/.env.example` to `server/.env` (this file name is in .gitignore so it won't be committed)
   - Update the following values in `server/.env`:
     ```
     STRIPE_SECRET_KEY=sk_test_your_secret_key_here
     STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
     STRIPE_PRICE_ID=price_your_price_id_here
     ```

### Setting up Postgres

1. **Install PostgreSQL**
   - Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
   - During installation, remember the password you set for the `postgres` user
   - Make sure PostgreSQL service is running

2. **Create Database**
   - Open pgAdmin (comes with PostgreSQL) or use command line
   - Create a new database called `gamestash`
   - Using command line:
     ```bash
     psql -U postgres
     CREATE DATABASE gamestash;
     \q
     ```

3. **Update Environment Variables**
   - In your `server/.env` file, update the database configuration:
     ```
     DB_HOST=127.0.0.1
     DB_PORT=5432
     DB_NAME=gamestash
     DB_USER=postgres
     DB_PASSWORD=your_postgres_password
     ```

4. **Initialize Database Tables**
   - The application will automatically create the necessary tables when you first run it
   - Make sure your PostgreSQL service is running before starting the backend server

5. **Test Connection**
   - Start the backend server with `node server.js`
   - Check the console for "Connected to PostgreSQL database" message
   - If you see connection errors, verify your database credentials and that PostgreSQL is running
