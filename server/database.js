import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "gamestash",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
  // SSL disabled for secure internal Docker network
  ssl: false,
  application_name: 'gamestash-api',
  statement_timeout: 300000,
  query_timeout: 300000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
pool.on("connect", (client) => {
  console.log("Connected to PostgreSQL database");
  client.query('SELECT NOW()'); // Keep connection alive
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  console.error("Attempting to reconnect...");
  // Don't exit the process, let it retry
});

pool.on("acquire", (client) => {
  console.log("Client acquired from pool");
});

pool.on("remove", (client) => {
  console.log("Client removed from pool");
});

// Initialize database tables
export async function initializeDatabase() {
  try {
    const client = await pool.connect();

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        auth_provider VARCHAR(50) DEFAULT 'local',
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create subscription_events table for tracking Stripe webhooks
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        event_type VARCHAR(100) NOT NULL,
        stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
        data JSONB,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
    `);

    client.release();
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

export default pool;
