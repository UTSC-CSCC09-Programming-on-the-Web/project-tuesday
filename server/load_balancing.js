export function loadBalancing(socket) {
  socket.on("spawnBox", (arg) => {
    console.log(`Spawning box for lobby ${arg.lobbyCode}`);
    socket.to(arg.lobbyCode).emit("spawnBox", {
      x: arg.x,
      y: arg.y,
      size: arg.size,
    });
  });

  socket.on("scoreUpdate", (arg) => {
    console.log(
      `Updating score for player ${arg.playerId} lobby ${arg.lobbyCode}`,
      arg,
    );
    lobbies[arg.lobbyCode].score[arg.playerId] = arg.data.points;
    socket.to(arg.lobbyCode).emit("scoreUpdate", {
      points: arg.data.points,
      playerId: arg.playerId,
    });
  });
}
