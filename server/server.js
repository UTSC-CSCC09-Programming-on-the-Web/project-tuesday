import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { loadBalancing } from "./load_balancing.js";
import { makeId } from "./codeGenerator.js"; // Import the code generator function
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// NO-AUTH BRANCH: Comment out session and passport imports
// import session from 'express-session';
// import passport from 'passport';

// NO-AUTH BRANCH: Comment out custom modules for auth and stripe
// import { initializeDatabase } from './database.js';
// import authRoutes from './routes/auth.js';
// import stripeRoutes from './routes/stripe.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for Stripe
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:4200",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Body parsing middleware
// NO-AUTH BRANCH: Comment out Stripe webhook handling
// app.use('/api/stripe/webhook', express.raw({ type: 'application/json' })); // Raw for Stripe webhooks
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// NO-AUTH BRANCH: Comment out session configuration
// Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-session-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// NO-AUTH BRANCH: Comment out Passport initialization
// Initialize Passport
// app.use(passport.initialize());
// app.use(passport.session());

// NO-AUTH BRANCH: Comment out auth and stripe routes
// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/stripe', stripeRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Simple route
app.get("/", (req, res) => {
  res.json({ message: "Game Stash API Server" });
});

// NO-AUTH BRANCH: Comment out database initialization
// Initialize database
// initializeDatabase().catch(error => {
//   console.error('Failed to initialize database:', error);
//   process.exit(1);
// });

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

  socket.on("stats", (arg, callback) => {
    console.log('request for stats received', arg);
    const lobbyCode = arg.lobbyCode;
    if (!lobbies[lobbyCode]) {
      console.log(`Lobby ${lobbyCode} does not exist.`);
      callback({ status: 404, message: "Lobby not found." });
      return;
    } else {
      const lobby = lobbies[lobbyCode];
      callback({ status: 200, data: lobby });
    }
  });

  // Client is asking to create a lobby with a given name, should  only be called from lobby screen
  socket.on("createLobby", (arg, callback) => {
    const id = makeId(6);
    console.log("Creating lobby with admin:", arg.admin, "and lobby code:", id);
    socket.join(id); //add client to lobby lobby
    lobbies[id] = {
      admin: arg.admin, // Store the admin of the lobby
      players: {}, // Track who is in the lobby, as well as whether or not they have responded
      responses: {}, // Store player response messages
      score: {},
    };

    callback({
      lobbyCode: id,
      status: 200,
    })
  });

  // Catch a game response from a player
  socket.on("gameResponse", (arg) => {
    console.log(
      `Received gameResponse from ${arg.playerId} in lobby ${arg.lobbyCode}`,
      arg,
    );

    // Ensures admin is always ready, even if the admin's id somehow changes
    const adminId = lobbies[arg.lobbyCode].admin;

    lobbies[arg.lobbyCode].players[arg.playerId] = true;
    lobbies[arg.lobbyCode].responses[arg.playerId] = arg.data.data;
    lobbies[arg.lobbyCode].players[adminId] = true;

    io.to(arg.lobbyCode).emit("gameResponseReceived", {
      playerId: arg.playerId,
      data: arg.data.data,
    });
    console.log("game response");

    // Check if all players have responded (admin is always true, so only real players need to respond)
    const allResponded = Object.values(lobbies[arg.lobbyCode].players).every(
      (v) => v === true,
    );
    console.log(`All players responded: ${allResponded}`);
    console.log(`Player response status:`, lobbies[arg.lobbyCode].players);

    // All players have responded. Calculate the winner and emit
    if (allResponded) {
      if (arg.data.gameId === "Magic Number") {
        // Calculate GameResults object for admin
        const targetNumber = Math.floor(Math.random() * 100) + 1; // Generate 1-100

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
          .sort(([, a], [, b]) => a - b) // Sort by value (ascending)
          .map(([key, value]) => key);

        // Calculate the winners
        const winners = Object.entries(playerDifferences)
          .filter(([key, value]) => value === lowestDifference)
          .map(([key, value]) => key);

        // Update score
        for (let i = 0; i < winners.length; i++) {
          if (lobbies[arg.lobbyCode].score[winners[i]]) {
            lobbies[arg.lobbyCode].score[winners[i]] += 1;
          } else {
            lobbies[arg.lobbyCode].score[winners[i]] = 1;
          }
        }

        let gameResult = {
          winners: winners,
          responses: responses,
          rankings: rankings,
          gameId: "Magic Number",
          targetNumber: targetNumber,
        };

        console.log(`Game results for lobby ${arg.lobbyCode}:`, gameResult);
        io.to(adminId).emit("gameResults", gameResult);

        // Calculate PlayerRanking

        for (const [key, value] of Object.entries(
          lobbies[arg.lobbyCode].players,
        )) {
          let playerId = key;
          if (playerId === adminId) continue; // Skip admin
          const playerRanking = {
            player: {
              name: "John Doe", //needs to be replaced with player name on frontend
              playerId: playerId,
            },
            points: lobbies[arg.lobbyCode].score[playerId] ?? 0,
            rank: rankings.indexOf(playerId) + 1,
            isRoundWinner: winners.includes(playerId),
            response: lobbies[arg.lobbyCode].responses[playerId],
            data: responses[playerId],
          };
          console.log(
            `Player ${playerId} has score ${lobbies[arg.lobbyCode].score[playerId]}`,
          );
          io.to(playerId).emit("gameResults", {
            ranking: playerRanking,
            data: targetNumber,
          });
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
  socket.on("joinLobby", (arg, callback) => {
    console.log("User requesting to join lobby:", arg.lobbyCode, "with name:", arg.playerName);
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

    if (lobbies[arg.lobbyCode].players.length >= 8) {
      // If the player is already in the lobby, reject
      socket.emit("joinLobbyDenied", {
        reason: "Lobby is full.",
      });
      return;
    }

    const admin = lobbies[arg.lobbyCode].admin;

    socket.join(arg.lobbyCode);
    io.to(admin).emit("userJoinedLobby", {
      user: socket.id,
      playerName: arg.playerName || "Default",
    });

    lobbies[arg.lobbyCode].players[socket.id] = false;

    callback({status: 200, lobbyCode: arg.lobbyCode});
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

      const adminId = lobbies[arg.lobbyCode].admin;

      // Notify other clients in the lobby
      io.to(adminId).emit("userLeftLobby", `${socket.id} has left the lobby`);

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
      if (lobby.admin === socket.id) {
        console.log(
          "Admin disconnected, removing lobby",
          lobbyCode,
          "and notifying players",
        );
        io.to(lobbyCode).emit("lobbyClosed", {
          message: "The lobby has been closed because the admin has disconnected.",
        });
        delete lobbies[lobbyCode]; // Remove the lobby
      }
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

    console.log("update to lobbies", lobbies);
    // Also emit the general message for any remaining cleanup
    io.emit("userLeftLobby", `${socket.id} has left a lobby`);
  });

  socket.on("startGame", (arg) => {
    if (lobbies[arg.lobbyCode]) {
      lobbies[arg.lobbyCode].gameStarted = true;
    }

    if (arg.gameId === "Magic Number") {
      io.to(arg.lobbyCode).emit("startGamePlayer", {
        gameId: arg.gameId,
      });
    } else if (arg.gameId === "Load Balancing") {
      loadBalancing(socket);
      io.to(arg.lobbyCode).emit("startGamePlayer", {
        gameId: arg.gameId,
      });
    } else if (arg.gameId === "Throw and Catch") {
      io.to(arg.lobbyCode).emit("startGamePlayer", {
        gameId: arg.gameId,
      });
    }

    console.log(
      `Lobby: ${arg.lobbyCode} has requested to start the game: ${arg.gameId}`,
    );
  });

  socket.on("playerStart", (arg) => {
    loadBalancing(socket);
    io.to(arg.lobbyCode).emit("playerStart", {
      playerId: socket.id,
      gameId: arg.gameId,
    });
    console.log(
      `Player ${socket.id} has started the game in lobby ${arg.lobbyCode}`,
    );
  });

  // For mobile throw and catch, indicate that the player is ready to play
  socket.on("playerReady", (arg) => {
    lobbies[arg.lobbyCode].players[socket.id] = true;

    const allResponded = Object.values(lobbies[arg.lobbyCode].players).every(
      (v) => v === true,
    );

    // query the first player to throw a ball
    if (allResponded) {
      socket.to(lobbies[arg.lobbyCode].admin).emit("playersReady");
    }
  });

  // player has thrown the ball, forward data to the frontend
  socket.on("playerThrowData", (arg) => {
    // set player as having thrown the ball
    lobbies[arg.lobbyCode].players[arg.playerId] = false;
    lobbies[arg.lobbyCode].responses[arg.playerId] = arg.data.throwData;

    console.log("server received force: ", arg);
    // alert the frontend that the player has thrown the ball
    socket.to(lobbies[arg.lobbyCode].admin).emit("playerThrowData", {
      playerId: arg.playerId,
      throwData: arg.data.throwData,
    });
  });

  // frontend is asking for the next player to throw, forward query
  socket.on("queryNextPlayerThrow", (arg) => {
    console.log("querying next player to throw");
    // update values
    if (arg.previousPlayerId) {
      lobbies[arg.lobbyCode].responses[arg.previousPlayerId] =
        arg.throwDistance;
    }

    console.log(lobbies[arg.lobbyCode].players);
    const nextPlayer = Object.entries(lobbies[arg.lobbyCode].players).find(
      ([playerId, hasResponded]) => hasResponded && playerId !== lobbies[arg.lobbyCode].admin, // Exclude admin
    )?.[0];
    // everyone has thrown the ball, so end the game
    if (nextPlayer === undefined) {
      // alert frontend that the game has ended, and it now needs to call gameResults
      console.log("no next player found, ending the game")
      io.to(lobbies[arg.lobbyCode].admin).emit("playerThrowData", {
        playerId: null,
        throwData: -1,
      });
    } else {
      socket.to(nextPlayer).emit("queryPlayerThrow", {
        playerId: nextPlayer,
      });

      io.to(lobbies[arg.lobbyCode].admin).emit("nextPlayerId", {
        playerId: nextPlayer
      });
    }
  });

  socket.on("nextRound", (arg) => {
    console.log(`Next round requested for lobby ${arg.lobbyCode}: round number ${arg.roundNumber}, final round: ${arg.finalRound}`);
    if (!lobbies[arg.lobbyCode]) {
      console.log(`Lobby ${arg.lobbyCode} does not exist.`);
      return;
    }
    io.to(arg.lobbyCode).emit("nextRound", {
      roundNumber: arg.roundNumber,
      finalRound: arg.finalRound,
    });
  });

  socket.on('gameEnded', (arg) => {
    console.log(`Game ended for lobby ${arg.lobbyCode} with gameId ${arg.gameId}`);
    if (lobbies[arg.lobbyCode]) {
        lobbies[arg.lobbyCode].gameStarted = false;
    }
    socket.to(arg.lobbyCode).emit("gameEnded");
    if (arg.gameId === 'Load Balancing') {
      console.log(`Game ended for lobby ${arg.lobbyCode}`);
      socket.removeAllListeners("spawnBox");
      socket.removeAllListeners("scoreUpdate");

      arg.players.sort((a, b) => {
        return b.points - a.points; // Sort players by points in descending order
      });

      const max = arg.players[0].points || 0;

      const rankings  = arg.players.map((player) => (player.player.playerId));
      const winners = arg.players.filter(player => player.points === max).map(player => (player.player.playerId));
      const responses = lobbies[arg.lobbyCode].responses;

      const winner = winners[0];

      let gameResult = {
        winners: winners,
        responses: responses,
        rankings: rankings,
        gameId: "Load Balancing",
        targetNumber: 0
      }

      const adminId = lobbies[arg.lobbyCode].admin;

      io.to(adminId).emit("gameResults", gameResult)
      
      for (const [key, value] of Object.entries(lobbies[arg.lobbyCode]?.players)) {
        let playerId = key
        if (playerId === lobbies[arg.lobbyCode].admin) continue; // Skip admin
        console.log("players", arg.players, playerId, arg.players.find((player) => {
          console.log("player", player, player.player.playerId, playerId);
          return player.player.playerId === playerId
        }));
        const rank = arg.players.findIndex((player) => player.player.playerId === playerId) + 1;
        const score = arg.players.find((player) => player.player.playerId === playerId).points || 0;
        const playerRanking = {
          player: {
            name: "John Doe", //needs to be replaced with player name on frontend
            playerId: playerId,
          },
          points: 1,
          rank: winners.find((winner) => winner === playerId) !== undefined ? 1 : rank,
          isRoundWinner: winners.find((winner) => winner === playerId) !== undefined,
          data: score,
        }
        console.log(`Sending game results to player ${playerId} in lobby ${arg.lobbyCode}`, playerRanking);

        io.to(playerId).emit("gameResults", { ranking: playerRanking, data: 0 });
      }
    } else if (arg.gameId === 'Throw and Catch') {  
      if (lobbies[arg.lobbyCode]) {
        lobbies[arg.lobbyCode].gameStarted = false;
      }
      
      // Calculate the rankings
      const rankings = Object.entries(lobbies[arg.lobbyCode].responses)
        .sort(([, a], [, b]) => a - b) // Sort by value (ascending)
        .map(([key, value]) => value);

      const lowestDifference = rankings[0];

      console.log("lowest difference", lowestDifference);
      // Calculate the winners
      const winners = Object.entries(lobbies[arg.lobbyCode].responses)
        .filter(([key, value]) => value === lowestDifference)
        .map(([key, value]) => key);

        console.log("winners", winners);
        console.log("score")
      // Update score
      for (let i = 0; i < winners.length; i++) {
        if (lobbies[arg.lobbyCode].score[winners[i]]) {
          lobbies[arg.lobbyCode].score[winners[i]] += 1;
        } else {
          lobbies[arg.lobbyCode].score[winners[i]] = 1;
        }
      }
      console.log("game result")
      let gameResult = {
        winners: winners,
        responses: lobbies[arg.lobbyCode].responses,
        rankings: rankings,
        gameId: "Throw and Catch",
        targetNumber: -1, // not neccessary for this game
      };
      console.log("emitting")
      console.log(arg.lobbyCode)
      io.to(lobbies[arg.lobbyCode].admin).emit("gameResults", gameResult);

      // emitting for players
      for (const [key, value] of Object.entries(
        lobbies[arg.lobbyCode]?.players,
      )) {
        let playerId = key;
        console.log(playerId, lobbies[arg.lobbyCode].admin);
        if (playerId === lobbies[arg.lobbyCode].admin) continue; // Skip admin
        const rank = arg.players.findIndex((player) => player.playerId === playerId) + 1;
        
        const score =
          arg.players.find((player) => player.player.playerId === playerId)
            .points || 0;
          console.log("score", score, score.points);
        const playerRanking = {
          player: {
            name: "John Doe", //needs to be replaced with player name on frontend
            playerId: playerId,
          },
          points: 1,
          rank:
            winners.find((winner) => winner === playerId) !== undefined
              ? 1
              : rank,
          isRoundWinner:
            winners.find((winner) => winner === playerId) !== undefined,
          data: score,
        };

        playerRanking.data = Math.abs(Math.trunc(lobbies[arg.lobbyCode].responses[playerId]));

        console.log(
          `Sending game results to player ${playerId} in lobby ${arg.lobbyCode}`,
          playerRanking,
        );

        io.to(playerId).emit("gameResults", {
          ranking: playerRanking,
          data: Math.abs(Math.trunc(lobbies[arg.lobbyCode].responses[playerId])), //check if this value is in winners
        });
      }
    }
  });

  socket.on("gameReset", (arg) => {
    console.log(`Resetting game state for lobby ${socket.id}`);
    if (lobbies[arg.lobbyCode] && lobbies[arg.lobbyCode].admin === socket.id) {
      console.log(`Resetting game state for lobby ${socket.id}`);
      lobbies[arg.lobbyCode].gameStarted = false;
      lobbies[arg.lobbyCode].responses = {};
    }
    socket.to(arg.lobbyCode).emit("gameReset");
  });

  socket.on("countdownTick", (arg) => {
    if (lobbies[arg.lobbyCode]) {
      socket.to(arg.lobbyCode).emit("countdownTick", arg.countdown);
    }
  });

  socket.on("ping", (msg) => {
    console.log("Ping received from client:");
    console.log(msg.data);
  });
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
