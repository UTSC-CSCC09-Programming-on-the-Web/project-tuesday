import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { loadBalancing } from "./load_balancing.js";
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';

// Import custom modules
import { initializeDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import stripeRoutes from './routes/stripe.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration with flexible CORS for containerized deployment
const socketAllowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',')
  : [process.env.FRONTEND_URL || "http://localhost:4200"];

const io = new Server(server, {
  cors: {
    origin: socketAllowedOrigins,
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Stripe
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration - support multiple frontend URLs for containerized deployment
const allowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',')
  : [process.env.FRONTEND_URL || "http://localhost:4200"];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' })); // Raw for Stripe webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple route
app.get("/", (req, res) => {
  res.json({ message: "Game Stash API Server" });
});

// Initialize database
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

// Socket.IO connection ---------------------------------------------------
const lobbies = {}; 
// Following dictionary structure
// lobby-code
//     |
//     |- players // bool on whether or not they have responded
//     |
//     |- responses // response value
//     |
//     |- score // player score
//     |
//     |- admin // id of admin socket

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Admin listeners and emitters-------------------------------------------------------

  // Client is asking to create a lobby with a given name, should  only be called from lobby screen
  socket.on("createLobby", (arg) => {
    socket.join(arg.lobbyCode); //add client to lobby lobby
    lobbies[arg.lobbyCode] = {
      admin: arg.admin, // Store the admin of the lobby
      players: {}, // Track who is in the lobby, as well as whether or not they have responded
      responses: {}, // Store player response messages
      score: {},
    };
  });

  // Catch a game response from a player
  socket.on("gameResponse", (arg) => {
    console.log(
      `Received gameResponse from ${arg.playerId} in lobby ${arg.lobbyCode}`,
    );

    // Ensures admin is always ready, even if the admin's id somehow changes
    const adminId = lobbies[arg.lobbyCode].admin;

    lobbies[arg.lobbyCode].players[arg.playerId] = true;
    lobbies[arg.lobbyCode].responses[arg.playerId] = arg.response;
    lobbies[arg.lobbyCode].players[adminId] = true;

    io.to(arg.lobbyCode).emit("gameResponseReceived", {
      playerId: arg.playerId,
    });
    console.log("game response")

    // Check if all players have responded (admin is always true, so only real players need to respond)
    const allResponded = Object.values(lobbies[arg.lobbyCode].players).every(
      (v) => v === true,
    );
    console.log(`All players responded: ${allResponded}`);
    console.log(`Player response status:`, lobbies[arg.lobbyCode].players);

    // All players have responded. Calculate the winner and emit
    if (allResponded) {
      
      if (arg.gameId === "Magic Number") {
        // Calculate GameResults object for admin
        const targetNumber= Math.floor(Math.random() * 100) + 1; // Generate 1-100

        // Calculate the difference between each player's response and the answer number
        let lowestDifference = 100;
        const responses = lobbies[arg.lobbyCode].responses;
        
        const playerDifferences = {};
        for (const [player, response] of Object.entries(responses)) {
          let difference = Math.abs(response - targetNumber);
          playerDifferences[player] = difference;

          if (difference < lowestDifference) {
            lowestDifference = difference;
          }
        }

        // Calculate the rankings      
        const rankings = Object.entries(playerDifferences)
        .sort(([, a], [, b]) => a - b)  // Sort by value (ascending)
        .map(([key, value]) => key);

        // Calculate the winners
        const winners = Object.entries(playerDifferences)
        .filter(([key, value]) => value === lowestDifference)
        .map(([key, value]) => key);

        // Update score
        for (let i=0; i<winners.length; i++) {
          if (lobbies[arg.lobbyCode].score[winners[i]]) {
            lobbies[arg.lobbyCode].score[winners[i]] += 1
          } else {
            lobbies[arg.lobbyCode].score[winners[i]] = 1
          }
        }

        let gameResult = {
          winners: winners,
          responses: responses,
          rankings: rankings,
          gameId: "Magic Number",
          targetNumber: targetNumber
        }

        io.to(adminId).emit("gameResults", gameResult)

        // Calculate PlayerRanking
        
        for (const [key, value] of Object.entries(lobbies[arg.lobbyCode].players)) {
          let playerId = key

          const playerRanking = {
            player: {
              name: "John Doe", //needs to be replaced with player name on frontend
              playerId: playerId,
            },
            points: lobbies[arg.lobbyCode].score[playerId] ?? 0,
            rank: rankings.indexOf(playerId) + 1,
            isRoundWinner: winners.includes(playerId),
            response: lobbies[arg.lobbyCode].responses[playerId],
            data: targetNumber
          }

          io.to(playerId).emit("gameResults", playerRanking)
        }
      }

      // Reset non-admin players status for next round (keep admin as true)
      Object.keys(lobbies[arg.lobbyCode].players).forEach((playerId) => {
        if (playerId !== adminId) {
          lobbies[arg.lobbyCode].players[playerId] = false;
        }
      });
    }
  });

  // Player listeners and emitters -----------------------------------------------------

  // Client is asking to join a lobby, join and notify other clients in the lobby
  socket.on("joinLobby", (arg) => {
    // If the lobby does not exist, reject
    if (!lobbies[arg.lobbyCode]) {
      socket.emit("joinLobbyDenied", { reason: "Lobby does not exist." });
      return;
    }
    // If the game has started, reject
    if (lobbies[arg.lobbyCode].gameStarted) {
      socket.emit("joinLobbyDenied", {
        reason: "Wait for the current game to end before joining lobby",
      });
      return;
    }
    socket.join(arg.lobbyCode);
    socket.to(arg.lobbyCode).emit("userJoinedLobby", {
      user: socket.id,
      playerName: arg.playerName || "Default",
    });

    lobbies[arg.lobbyCode].players[socket.id] = false;
    // Notify the joining client that join was successful
    socket.emit("joinLobbySuccess");
  });

  // Client explicitly leaves lobby
  socket.on("leaveLobby", (arg) => {
    console.log(
      "User explicitly leaving lobby:",
      socket.id,
      "from lobby:",
      arg.lobbyCode,
    );
    if (
      lobbies[arg.lobbyCode] &&
      lobbies[arg.lobbyCode].players[socket.id] !== undefined
    ) {
      // Remove player from lobby
      delete lobbies[arg.lobbyCode].players[socket.id];
      delete lobbies[arg.lobbyCode].responses[socket.id];

      // Notify other clients in the lobby
      socket
        .to(arg.lobbyCode)
        .emit("userLeftLobby", `${socket.id} has left the lobby`);

      // Leave the socket room
      socket.leave(arg.lobbyCode);

      console.log("User", socket.id, "left lobby", arg.lobbyCode);
    }
  });

  // Client disconnects, automatically leaves lobby, but need to notify admin to update lobby frontend
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    // Find and remove player from any lobby they were in
    for (const [lobbyCode, lobby] of Object.entries(lobbies)) {
      if (lobby.players[socket.id] !== undefined) {
        console.log(
          "Removing disconnected user",
          socket.id,
          "from lobby",
          lobbyCode,
        );
        delete lobby.players[socket.id];
        delete lobby.responses[socket.id];

        // Notify other clients in the lobby
        socket
          .to(lobbyCode)
          .emit("userLeftLobby", `${socket.id} has left the lobby`);
        break; // Player should only be in one lobby at a time
      }
    }

    // Also emit the general message for any remaining cleanup
    io.emit("userLeftLobby", `${socket.id} has left a lobby`);
  });

  socket.on('startGame', (arg) => {
    if (lobbies[arg.lobbyCode]) {
      lobbies[arg.lobbyCode].gameStarted = true;
    }
    if (arg.gameId === 'Load Balancing')
      loadBalancing(socket);

    console.log(`Lobby: ${arg.lobbyCode} has requested to start the game: ${arg.gameId}`);
    io.to(arg.lobbyCode).emit('startGamePlayer', {
      gameId: arg.gameId
    })
  });

  socket.on('playerStart', (arg) => {
    loadBalancing(socket);
    io.to(arg.lobbyCode).emit('playerStart', {
      playerId: socket.id,
      gameId: arg.gameId
    });
    console.log(`Player ${socket.id} has started the game in lobby ${arg.lobbyCode}`);
  });

  socket.on('gameEnded', (arg) => {
    if (lobbies[arg.lobbyCode]) {
        lobbies[arg.lobbyCode].gameStarted = false;
    }
    socket.to(arg.lobbyCode).emit("gameEnded");
});

  socket.on('gameReset', (arg) => {
    console.log(`Resetting game state for lobby ${socket.id}`);
    if (lobbies[arg.lobbyCode] && lobbies[arg.lobbyCode].admin === socket.id) {
      console.log(`Resetting game state for lobby ${socket.id}`);
      lobbies[arg.lobbyCode].gameStarted = false;
      lobbies[arg.lobbyCode].responses = {};
    }
    socket.to(arg.lobbyCode).emit("gameReset");
  });
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
