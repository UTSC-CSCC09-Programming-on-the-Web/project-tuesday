-- This script will be automatically run when the PostgreSQL container starts

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE gamestash TO postgres;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by the Node.js application using the initializeDatabase() function
