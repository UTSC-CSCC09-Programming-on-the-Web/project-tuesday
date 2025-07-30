import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import pool from "../database.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// JWT Strategy for protecting routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const client = await pool.connect();
        const result = await client.query("SELECT * FROM users WHERE id = $1", [
          jwtPayload.userId,
        ]);
        client.release();

        if (result.rows.length > 0) {
          return done(null, result.rows[0]);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

// Helper function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" },
  );
}

// Helper function to format user data for response
function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    subscriptionStatus: user.subscription_status,
    subscriptionId: user.subscription_id,
    authProvider: user.auth_provider,
    createdAt: user.created_at
  };
}

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and username are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const client = await pool.connect();

    // Check if email already exists
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await client.query(
      'INSERT INTO users (email, username, password_hash, auth_provider) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, username, passwordHash, 'local']
    );

    client.release();

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      user: formatUserResponse(user),
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const client = await pool.connect();
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];
    
    // Check if user registered with Google OAuth
    if (user.auth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google. Please sign in with Google.',
        authProvider: 'google'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      user: formatUserResponse(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Protected route to get current user
router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      success: true,
      user: formatUserResponse(req.user),
    });
  },
);

// Logout endpoint (mainly for clearing frontend state)
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// Google OAuth ID token verification (modern approach)
router.post('/google/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    const dbClient = await pool.connect();
    
    // Check if user exists with Google ID
    let result = await dbClient.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    
    let user;
    
    if (result.rows.length > 0) {
      // Update existing user
      const updateResult = await dbClient.query(
        `UPDATE users 
         SET username = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE google_id = $2 
         RETURNING *`,
        [name, googleId]
      );
      user = updateResult.rows[0];
    } else {
      // Check if user exists with same email
      result = await dbClient.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length > 0) {
        // Link existing account
        const updateResult = await dbClient.query(
          `UPDATE users 
           SET google_id = $1, auth_provider = 'google', updated_at = CURRENT_TIMESTAMP 
           WHERE email = $2 
           RETURNING *`,
          [googleId, email]
        );
        user = updateResult.rows[0];
      } else {
        // Create new user
        const insertResult = await dbClient.query(
          `INSERT INTO users (email, username, google_id, auth_provider) 
           VALUES ($1, $2, $3, 'google') 
           RETURNING *`,
          [email, name, googleId]
        );
        user = insertResult.rows[0];
      }
    }
    
    dbClient.release();
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      user: formatUserResponse(user),
      token
    });
    
  } catch (error) {
    console.error('Google token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid Google token'
    });
  }
});

export default router;
