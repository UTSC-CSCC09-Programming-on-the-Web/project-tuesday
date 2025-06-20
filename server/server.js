import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200", // This must match the frontend's URL
  }
});
const PORT = process.env.PORT || 3000;

// Socket.IO connection ---------------------------------------------------

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Client is asking to join a lobby, join and notify other clients in the lobby
  socket.on('joinRoom', (arg) => {
    console.log(`request to join room: ${arg} `);
    socket.join(arg);
    socket.to(arg).emit('userJoinedRoom', `${socket.id} just joined the room: ${arg}`); // sent to everyone in the room
  })

  // Client is asking to create a lobby with a given name, should  only be called from lobby screen
  // TODO: this should make the client the lobby admin explicitly, somehow
  socket.on('createRoom', (arg) => {
    socket.join(arg);
  })

  // Client disconnects, automatically leaves room, but need to notify admin to update lobby frontend
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Ideally want to only emit to the room the user was in, but at the time of disconnect, socket.rooms is emptied
    io.emit('userLeftRoom', `${socket.id} has left a room`); 
  });
});

server.listen(3000, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});

// PostgreSQL Database endpoint connection --------------------------------

var corsOptions = {
  origin: "http://localhost:4200" // This must match the frontend's URL
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "hello from the backend!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
