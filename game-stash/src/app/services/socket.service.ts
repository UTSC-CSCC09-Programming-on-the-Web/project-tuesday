import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';

interface GameResults {
  gameId: string;
  responses: Record<string, number>;
  targetNumber?: number;
}

interface MagicNumberRankings {
  name: string;
  playerId: string;
  guess: number;
  points: number;
  rank: number;
  isRoundWinner: boolean;
}

@Injectable({
  providedIn: 'root'
})

export class SocketService {

  private socket: any = null;

  private lobbyName: string = '';
  private lobbyCode: string = '';

  private playersSubject = new BehaviorSubject<string[]>([]);
  players$ = this.playersSubject.asObservable();

  private respondedSubject = new BehaviorSubject<string[]>([]);
  responded$ = this.respondedSubject.asObservable();

  private selectedGameSubject = new BehaviorSubject<string>('');
  selectedGame$ = this.selectedGameSubject.asObservable();

  private magicNumberRankingsSubject = new BehaviorSubject<MagicNumberRankings[]>([]);
  magicNumberRankings$ = this.magicNumberRankingsSubject.asObservable();

  private targetNumberSubject = new BehaviorSubject<number>(0);
  targetNumber$ = this.targetNumberSubject.asObservable();

  private joinLobbySuccessSubject = new Subject<void>();
  joinLobbySuccess$ = this.joinLobbySuccessSubject.asObservable();

  private joinLobbyDeniedSubject = new Subject<{ reason: string }>();
  joinLobbyDenied$ = this.joinLobbyDeniedSubject.asObservable();

  // Subject for when game round is complete (all players submitted)
  private gameRoundCompleteSubject = new Subject<void>();
  gameRoundComplete$ = this.gameRoundCompleteSubject.asObservable();

  constructor() { }

  startGame(gameId: string) {
    if (gameId === 'Magic Number') {
      this.socket.emit("startGame", {
        gameId: gameId,
        lobbyCode: this.lobbyCode
      })
    }
  }
  connectToSocket() {
    console.log('SocketService: connectToSocket called');
    // Initialize socket for admin/desk if not already created
    if (!this.socket) {
      console.log('SocketService: Creating new socket connection for admin');
      this.socket = io("http://localhost:3000/");
    }

    this.socket.on("welcome", (res: any) => {
        console.log(res.message);
    });

    // Create a new lobby
    this.socket.on("connect", () => {
      console.log("Creating lobby with lobbyCode: ", this.lobbyCode)
        this.socket.emit("createLobby", {
          lobbyCode: this.lobbyCode,
          admin: this.socket.id,
        });
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userJoinedLobby", (arg: any) => {
        const userId = arg.user;
        this.addPlayer(userId);
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userLeftLobby", (message: any) => {
        const userId = message.split(" ")[0];
        this.removePlayer(userId);
        console.log("user left lobby:", message);
    });

    this.socket.on("gameResponseReceived", (arg: any) => {
      const currentResponses = this.respondedSubject.value;
      console.log(currentResponses, arg.playerId);
      if (!currentResponses.includes(arg.playerId)) {
        console.log("Adding player response:", arg.playerId);
        currentResponses.push(arg.playerId);
        this.setResponded(currentResponses);
      }
      console.log("player with id:", arg.playerId, "has submitted their response");
    });

    this.socket.on("gameResults", (arg: GameResults) => {
      console.log("SocketService received gameResults for gameId:", arg.gameId);
      console.log("SocketService gameResults data:", arg);

      switch (arg.gameId) {
        case 'Magic Number':
          const answerNumber = arg.targetNumber || 50; // Use server-provided target number, fallback to 50
          this.targetNumberSubject.next(answerNumber);
          let lowestDifference: number = 100;
          const winners: string[] = [];
          const responses = arg.responses;

          // Calculate the difference between each player's response and the answer number
          const playerDifferences: Record<string, number> = {};
          for (const [player, response] of Object.entries(responses)) {
            let difference = Math.abs(response - answerNumber);
            playerDifferences[player] = difference;

            if (difference < lowestDifference) {
              lowestDifference = difference;
            }
          }

          // Find all the winning players
          for (const [player, difference] of Object.entries(playerDifferences)) {
            if (difference === lowestDifference) {
              winners.push(player);
            }
          }

          console.log("Answer number:", answerNumber);
          console.log("Winners:", winners);

          this.updateMagicNumberRankings(responses, winners);

          break;
        default:
          console.log("Unknown game ID:", arg.gameId);
          break;
      }
    });
  }

  connectToSocketPhone() {
    console.log('SocketService: connectToSocketPhone called');

    // Disconnect any existing socket first to avoid conflicts
    if (this.socket) {
      console.log('SocketService: Disconnecting existing socket');
      this.socket.disconnect();
      this.socket = null;
    }

    // Create a fresh socket for phone client
    console.log('SocketService: Creating new socket connection for phone');
    this.socket = io("http://localhost:3000/", {
      forceNew: true,  // Force a new connection
      reconnection: true,
      timeout: 5000
    });

    this.socket.on("welcome", (res: any) => {
      console.log('SocketService: Received welcome:', res.message);
    });

    this.socket.on("connect", () => {
      console.log("SocketService: Phone connected, socket ID:", this.socket.id);
      console.log("SocketService: Joining lobby:", this.lobbyCode);
      this.socket.emit("joinLobby", {
        lobbyCode: this.lobbyCode,
        client: this.socket.id
      });
    });

    this.socket.on("connect_error", (error: any) => {
      console.error("SocketService: Socket connection error:", error);
    });

    this.socket.on('joinLobbySuccess', () => {
      console.log('SocketService: Join lobby successful');
      this.joinLobbySuccessSubject.next();
    });

    this.socket.on('joinLobbyDenied', (data: any) => {
      console.log('SocketService: Join lobby denied:', data);
      this.joinLobbyDeniedSubject.next(data);
    });

    // Listen for game start event
    this.socket.on("startGamePlayer", (arg: any) => {
      console.log("SocketService: received ping to start ", arg.gameId)
      this.selectedGameSubject.next(arg.gameId);
    });

    this.socket.on("gameResults", (arg: GameResults) => {
      console.log("SocketService received gameResults for gameId:", arg.gameId);
      console.log("SocketService gameResults data:", arg);

      switch (arg.gameId) {
        case 'Magic Number':
          const answerNumber = arg.targetNumber || 50; // Use server-provided target number, fallback to 50
          this.targetNumberSubject.next(answerNumber);
          let lowestDifference: number = 100;
          const winners: string[] = [];
          const responses = arg.responses;

          // Calculate the difference between each player's response and the answer number
          const playerDifferences: Record<string, number> = {};
          for (const [player, response] of Object.entries(responses)) {
            let difference = Math.abs(response - answerNumber);
            playerDifferences[player] = difference;

            if (difference < lowestDifference) {
              lowestDifference = difference;
            }
          }

          // Find all the winning players
          for (const [player, difference] of Object.entries(playerDifferences)) {
            if (difference === lowestDifference) {
              winners.push(player);
            }
          }

          console.log("Answer number:", answerNumber);
          console.log("Winners:", winners);

          this.updateMagicNumberRankings(responses, winners);

          break;
        default:
          console.log("Unknown game ID:", arg.gameId);
          break;
      }

      console.log("SocketService: Game round complete, all players submitted");
      this.gameRoundCompleteSubject.next();
    });

    console.log("SocketService: Socket connection initiated");
  }

  getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  get players(): string[] {
    return this.playersSubject.value;
  }

  setPlayers(players: string[]) {
    this.playersSubject.next(players);
  }

  addPlayer(player: string) {
    const updated = [...this.playersSubject.value, player];
    this.playersSubject.next(updated);
    this.addMagicNumberPlayer(player, this.getPlayerName(player));
  }

  removePlayer(player: string) {
    const updated = this.playersSubject.value.filter(p => p !== player);
    this.playersSubject.next(updated);
    this.removeMagicNumberPlayer(player);
  }

  get responded(): string[] {
    return this.respondedSubject.value;
  }

  setResponded(responded: string[]) {
    this.respondedSubject.next(responded);
  }

  getLobbyName(): string {
    return this.lobbyName;
  }

  getLobbyCode(): string {
    return this.lobbyCode;
  }

  setLobby(lobbyName: string, lobbyCode: string) {
    this.lobbyName = lobbyName;
    this.lobbyCode = lobbyCode;
  }

  joinLobby(lobbyCode: string, playerName: string) {
    console.log('SocketService: Starting joinLobby process', { lobbyCode, playerName });
    this.lobbyCode = lobbyCode;
    this.lobbyName = playerName;
    this.connectToSocketPhone();
  }

  leaveLobby() {
    console.log('SocketService: Leaving lobby', this.lobbyCode);
    if (this.socket && this.lobbyCode) {
      this.socket.emit('leaveLobby', { lobbyCode: this.lobbyCode });
    }
    this.disconnect();
  }

  // Method to disconnect the socket
  disconnect() {
    if (this.socket) {
      console.log('SocketService: Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  submitGameResponse(gameId: string, response: number) {
    if (this.socket && this.socket.connected) {
      console.log('SocketService: Submitting game response', { gameId, response });
      this.socket.emit('gameResponse', {
        gameId: gameId,
        lobbyCode: this.lobbyCode,
        playerId: this.socket.id,
        response: response
      });
    } else {
      console.error('SocketService: Cannot submit game response - socket not connected');
    }
  }

  // Method to get current socket ID
  getSocketId(): string | null {
    return this.socket && this.socket.id ? this.socket.id : null;
  }

  emitGameEnded() {
    if (this.socket && this.socket.connected) {
      console.log('SocketService: Emitting gameEnded event');
      this.socket.emit('gameEnded', {
        lobbyCode: this.lobbyCode
      });
    } else {
      console.error('SocketService: Cannot emit gameEnded - socket not connected');
    }
  }

  // MagicNumberRankings management methods
  private updateMagicNumberRankings(
    responses: Record<string, number>,
    winners: string[],
  ) {
    const currentRankings = this.magicNumberRankingsSubject.value;
    const updatedRankings: MagicNumberRankings[] = [];

    // Create or update rankings for each player
    for (const [playerId, guess] of Object.entries(responses)) {
      const isWinner = winners.includes(playerId);

      // Find existing ranking or create new one
      let existingRanking = currentRankings.find(r => r.playerId === playerId);

      if (existingRanking) {
        existingRanking.guess = guess;
        existingRanking.points += isWinner ? 1 : 0;
        existingRanking.isRoundWinner = isWinner;
        updatedRankings.push({ ...existingRanking });
      } else {
        const newRanking: MagicNumberRankings = {
          name: this.getPlayerName(playerId),
          playerId: playerId,
          guess: guess,
          points: isWinner ? 1 : 0,
          rank: 0, // Will be calculated below
          isRoundWinner: isWinner
        };
        updatedRankings.push(newRanking);
      }
    }

    updatedRankings.sort((a, b) => {
      return b.points - a.points; // Higher points first
    });

    // Assign Olympic-style ranks based on points
    let currentRank = 1;
    for (let i = 0; i < updatedRankings.length; i++) {
      if (i > 0) {
        const current = updatedRankings[i];
        const previous = updatedRankings[i - 1];

        if (current.points === previous.points) {
          // Same points, same rank
          current.rank = previous.rank;
        } else {
          // Different points, increment rank by position
          currentRank = i + 1;
          current.rank = currentRank;
        }
      } else {
        // First player always gets rank 1
        updatedRankings[i].rank = 1;
      }
    }

    this.magicNumberRankingsSubject.next(updatedRankings);
    console.log("Updated Magic Number Rankings:", updatedRankings);
  }

  private getPlayerName(playerId: string): string {
    // TODO: Implement player name lookup
    // For now, return a shortened version of playerId
    return playerId.substring(0, 8) + '...';
  }

  // Public methods for MagicNumberRankings management
  getMagicNumberRankings(): MagicNumberRankings[] {
    return this.magicNumberRankingsSubject.value;
  }

  clearMagicNumberRankings() {
    this.magicNumberRankingsSubject.next([]);
  }

  addMagicNumberPlayer(playerId: string, playerName: string) {
    const currentRankings = this.magicNumberRankingsSubject.value;
    const existingPlayer = currentRankings.find(r => r.playerId === playerId);

    if (!existingPlayer) {
      const newRanking: MagicNumberRankings = {
        name: playerName,
        playerId: playerId,
        guess: 0,
        points: 0,
        rank: 0, // Will be calculated below
        isRoundWinner: false
      };

      const updatedRankings = [...currentRankings, newRanking];

      // Sort by points and recalculate all ranks using Olympic-style ranking
      updatedRankings.sort((a, b) => {
        return b.points - a.points; // Higher points first
      });

      let currentRank = 1;
      for (let i = 0; i < updatedRankings.length; i++) {
        if (i > 0 && updatedRankings[i].points !== updatedRankings[i - 1].points) {
          currentRank = i + 1;
        }
        updatedRankings[i].rank = currentRank;
      }

      this.magicNumberRankingsSubject.next(updatedRankings);
    }
  }

  removeMagicNumberPlayer(playerId: string) {
    const currentRankings = this.magicNumberRankingsSubject.value;
    const updatedRankings = currentRankings.filter(r => r.playerId !== playerId);

    // Recalculate Olympic-style ranks
    if (updatedRankings.length > 0) {
      updatedRankings.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return 0; // Keep existing order for tied points
      });

      let currentRank = 1;
      for (let i = 0; i < updatedRankings.length; i++) {
        if (i > 0 && updatedRankings[i].points !== updatedRankings[i - 1].points) {
          currentRank = i + 1;
        }
        updatedRankings[i].rank = currentRank;
      }
    }

    this.magicNumberRankingsSubject.next(updatedRankings);
  }
}
