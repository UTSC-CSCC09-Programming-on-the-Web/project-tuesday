import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults, PlayerRanking } from './socket.service.constants';

export interface GameState {
  players: string[];
  responded: string[];
  selectedGame: string;
  playerRankings: PlayerRanking[];

  data: number; //implicit value for different games
}



@Injectable({
  providedIn: 'root',
})
export class AdminSocketService {
  private socket: any = null;

  private lobbyName: string = '';
  private lobbyCode: string = '';

  private gameStateSubject = new BehaviorSubject<GameState>({
    players: [],
    responded: [],
    selectedGame: '',
    playerRankings: [],

    data: 0,
  });

  gameState$ = this.gameStateSubject.asObservable();

  // Subject for when game round is complete (all players submitted)
  private gameRoundCompleteSubject = new Subject<void>();
  gameRoundComplete$ = this.gameRoundCompleteSubject.asObservable();

  constructor() {}

  lobbyEmit(event: string, data: any) {
    data.lobbyCode = this.lobbyCode; // Ensure lobbyCode is included in the data
    this.socket.emit(event, data);
  }

  useEffect(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, (arg: any) => { callback(arg) });
    } else {
      console.error("Socket not initialized. Call connectToSocket() first.");
    }
  }

  removeEffect(event: string) {
    if (this.socket) {
      this.socket.off(event);
    } else {
      console.error("Socket not initialized. Call connectToSocket() first.");
    }
  }

  startGame(gameId: string) {
    // if (gameId === 'Magic Number') {
      this.socket.emit('startGame', {
        gameId: gameId,
        lobbyCode: this.lobbyCode,
      });
    // }
  }

  endGame(gameId: string) {
    if (gameId === 'Magic Number') {
      this.setResponded([]);
    }
  }

  connectToSocket() {
    console.log('AdminSocketService: connectToSocket called');
    // Initialize socket for admin/desk if not already created
    if (!this.socket) {
      console.log(
        'AdminSocketService: Creating new socket connection for admin',
      );
      this.socket = io(SERVER_ADDRESS, {
        transports: ['websocket', 'polling'],
      });
    }

    this.socket.on('welcome', (res: any) => {
    });

    // Create a new lobby
    this.socket.on('connect', () => {
      this.socket.emit('createLobby', {
        lobbyCode: this.lobbyCode,
        admin: this.socket.id,
      });
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on('userJoinedLobby', (arg: any) => {
      const userId = arg.user;
      this.addPlayer(userId);
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on('userLeftLobby', (message: any) => {
      const userId = message.split(' ')[0];
      this.removePlayer(userId);
      console.log('user left lobby:', message);
    });

    this.socket.on('gameResponseReceived', (arg: any) => {
      const currentResponses = this.gameStateSubject.value.responded;
      console.log(currentResponses, arg.playerId);
      if (!currentResponses.includes(arg.playerId)) {
        console.log('Adding player response:', arg.playerId);
        currentResponses.push(arg.playerId);
        this.setResponded(currentResponses);
      }
      console.log(
        'player with id:',
        arg.playerId,
        'has submitted their response',
      );
    });

    this.socket.on('gameResults', (arg: GameResults) => {
      switch (arg.gameId) {
        case 'Magic Number':
        
          this.updateState({ data: arg.targetNumber });

          console.log("GOING INTO UPDATE RANKINGS=--------", arg.responses, " and ", arg.winners)
          console.log(arg)
          this.updateRankings(arg.responses, arg.winners);
          break;
        default:
          console.log('Unknown game ID:', arg.gameId);
          break;
      }
    });
  }

  getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  get players(): string[] {
    return this.gameStateSubject.value.players;
  }

  setPlayers(players: string[]) {
    this.updateState({ players: players });
  }

  addPlayer(player: string) {
    const updated = [...this.gameStateSubject.value.players, player];
    this.updateState({ players: updated });
    this.addMagicNumberPlayer(player, this.getPlayerName(player));
  }

  removePlayer(player: string) {
    const updated = this.gameStateSubject.value.players.filter(
      (p) => p !== player,
    );
    this.updateState({ players: updated });
    this.removeMagicNumberPlayer(player);
  }

  get responded(): string[] {
    return this.gameStateSubject.value.responded;
  }

  setResponded(responded: string[]) {
    this.updateState({ responded: responded });
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

  // Method to disconnect the socket
  disconnect() {
    if (this.socket) {
      console.log('AdminSocketService: Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Method to get current socket ID
  getSocketId(): string | null {
    return this.socket && this.socket.id ? this.socket.id : null;
  }

  emitGameEnded() {
    if (this.socket && this.socket.connected) {
      console.log('AdminSocketService: Emitting gameEnded event');
      this.socket.emit('gameEnded', {
        lobbyCode: this.lobbyCode,
      });
    } else {
      console.error(
        'AdminSocketService: Cannot emit gameEnded - socket not connected',
      );
    }
  }

  // playerRankings management methods
  private updateRankings(
    responses: Record<string, number>,
    winners: string[],
  ) {
    console.log("UPDATE RANKINGS CALLED-------------------")
    const currentRankings = this.gameStateSubject.value.playerRankings;
    const updatedRankings: PlayerRanking[] = [];

     console.log("RESPONSES------------------------ ", responses)
    // Create or update rankings for each player
    for (const [playerId, guess] of Object.entries(responses)) {
      const isWinner = winners.includes(playerId);

      // Find existing ranking or create new one
      let existingRanking = currentRankings.find(
        (r) => r.playerId === playerId,
      );

      if (existingRanking) {
        console.log("UPDATING EXISTING RANKING--------------------------")
        existingRanking.points += isWinner ? 1 : 0;
        existingRanking.isRoundWinner = isWinner;
        updatedRankings.push({ ...existingRanking });
      } else {
        console.log("MAKING NEW RANKING--------------------------")
        const newRanking: PlayerRanking = {
          name: this.getPlayerName(playerId),
          playerId: playerId,
          points: isWinner ? 1 : 0,
          rank: 0, // Will be calculated below
          isRoundWinner: isWinner,
          response: responses[playerId].toString(),
          data: guess, // guess
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

    this.updateState({ playerRankings: updatedRankings });
    console.log('Updated Magic Number Rankings:', updatedRankings);
  }

  private getPlayerName(playerId: string): string {
    // TODO: Implement player name lookup
    // For now, return a shortened version of playerId
    return playerId.substring(0, 8) + '...';
  }

  // Public methods for playerRankings management
  getplayerRankings(): PlayerRanking[] {
    return this.gameStateSubject.value.playerRankings;
  }

  clearplayerRankings() {
    this.updateState({ playerRankings: [] });
  }

  addMagicNumberPlayer(playerId: string, playerName: string) {
    const currentRankings = this.gameStateSubject.value.playerRankings;
    const existingPlayer = currentRankings.find((r) => r.playerId === playerId);

    if (!existingPlayer) {
      const newRanking: PlayerRanking = {
        name: playerName,
        playerId: playerId,
        points: 0,
        rank: 0, // Will be calculated below
        isRoundWinner: false,
        response: "",
        data: 0, //Magic NUmber guess?
      };

      const updatedRankings = [...currentRankings, newRanking];

      // Sort by points and recalculate all ranks using Olympic-style ranking
      updatedRankings.sort((a, b) => {
        return b.points - a.points; // Higher points first
      });

      let currentRank = 1;
      for (let i = 0; i < updatedRankings.length; i++) {
        if (
          i > 0 &&
          updatedRankings[i].points !== updatedRankings[i - 1].points
        ) {
          currentRank = i + 1;
        }
        updatedRankings[i].rank = currentRank;
      }

      this.updateState({ playerRankings: updatedRankings });
    }
  }

  removeMagicNumberPlayer(playerId: string) {
    const currentRankings = this.gameStateSubject.value.playerRankings;
    const updatedRankings = currentRankings.filter(
      (r) => r.playerId !== playerId,
    );

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
        if (
          i > 0 &&
          updatedRankings[i].points !== updatedRankings[i - 1].points
        ) {
          currentRank = i + 1;
        }
        updatedRankings[i].rank = currentRank;
      }
    }

    this.updateState({ playerRankings: updatedRankings });
  }

  // update the game state
  private updateState(patch: Partial<GameState>) {
    this.gameStateSubject.next({
      ...this.gameStateSubject.value,
      ...patch,
    });
  }
}
