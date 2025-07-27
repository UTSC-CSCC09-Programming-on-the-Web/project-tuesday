import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults, PlayerRanking, Player, GlobalRanking } from './socket.service.constants';

// export interface GameState {
//   players: Player[];
//   responded: Player[];
//   selectedGame: string;
//   playerRankings: PlayerRanking[];
//   globalRankings: GlobalRanking;

//   data: number; //implicit value for different games
// }

export interface GameState {
  selectedGame: string;
  roundNumber: number;
  finalRound: number;
  playerRankings: PlayerRanking[];
  globalRankings: GlobalRanking;
  data: number | undefined;
}



@Injectable({
  providedIn: 'root',
})
export class AdminSocketService {
  private socket: any = null;

  private lobbyName: string = '';
  private lobbyCode: string = '';

  private gameStateSubject = new BehaviorSubject<GameState>({
    selectedGame: '',
    roundNumber: -1,
    finalRound: -1,
    playerRankings: [],
    globalRankings: {},
    data: undefined,
  });

  gameState$ = this.gameStateSubject.asObservable();

  // Subject for when game round is complete (all players submitted)
  private gameRoundCompleteSubject = new Subject<void>();
  gameRoundComplete$ = this.gameRoundCompleteSubject.asObservable();

  constructor() {}

  lobbyEmit(event: string, data: any) {
    data.lobbyCode = this.lobbyCode; // Ensure lobbyCode is included in the data
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.error("Socket not initialized. Call connectToSocket() first.");
    }
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

  connectToSocket() {
    // Initialize socket for admin/desk if not already created
    if (!this.socket) {
      this.socket = io(SERVER_ADDRESS, {
        transports: ['websocket', 'polling'],
      });
    }

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
      const playerName = arg.playerName;
      this.addPlayer({name: playerName, playerId: userId});
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on('userLeftLobby', (message: any) => {
      const userId = message.split(' ')[0];
      this.removePlayer(userId);
    });

    this.socket.on('gameResponseReceived', (arg: any) => {
      const playerRank = this.gameStateSubject.value.playerRankings.map((r) => {
        if (r.player.playerId === arg.playerId) {
          console.log("found it :)", arg.data);
          r.data = arg.data;
        }
        return r;
      });

      console.log("before", playerRank);
      this.gameStateSubject.next({ ...this.gameStateSubject.value, playerRankings: playerRank });
      console.log("after", this.gameStateSubject.value.playerRankings);

      console.log('Game response received:', arg);
    });

    this.socket.on('gameResults', (arg: GameResults) => {
      console.log('Game results received:', arg);
      this.updateState({ data: arg.targetNumber });
      this.updateRankings(arg.responses, arg.winners);
    });
  }

  getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  addPlayer(player: Player) {
    const globalRank = this.gameStateSubject.value.globalRankings;
    globalRank[player.playerId] = { playerId: player.playerId, points: 0 };
    this.updateState({ globalRankings: globalRank });

    const currentRankings = this.gameStateSubject.value.playerRankings;
    const existingPlayer = currentRankings.find((r) => r.player.playerId === player.playerId);

    if (!existingPlayer) {
      const newRanking: PlayerRanking = {
        player: player,
        points: 0,
        rank: 0,
        isRoundWinner: false,
        data: undefined,
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

  removePlayer(player: string) {
    const globalRank = this.gameStateSubject.value.globalRankings;
    delete globalRank[player];
    this.updateState({ globalRankings: globalRank });
    const currentRankings = this.gameStateSubject.value.playerRankings;
    const updatedRankings = currentRankings.filter(
      (r) => r.player.playerId !== player,
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

  // playerRankings management methods
  private updateRankings(
    responses: Record<string, number>,
    winners: string[],
  ) {
    console.log("UPDATE RANKINGS CALLED-------------------")
    const currentRankings = this.gameStateSubject.value.playerRankings;
    const updatedRankings: PlayerRanking[] = [];
    const globalRank = this.gameStateSubject.value.globalRankings;

     console.log("RESPONSES------------------------ ", responses, winners);
    // Create or update rankings for each player
    for (const [playerId, guess] of Object.entries(responses)) {
      const isWinner = winners.includes(playerId);

      if (isWinner && this.gameStateSubject.value.roundNumber === this.gameStateSubject.value.finalRound) {
        globalRank[playerId].points += 1;
      }

      // Find existing ranking or create new one
      let existingRanking = currentRankings.find(
        (r) => r.player.playerId === playerId,
      );

      if (existingRanking) {
        console.log("UPDATING EXISTING RANKING--------------------------")
        existingRanking.points += isWinner ? 1 : 0;
        existingRanking.isRoundWinner = isWinner;
        existingRanking.data = guess;
        updatedRankings.push({ ...existingRanking });
      } else {
        console.log("MAKING NEW RANKING--------------------------")
        const newRanking: PlayerRanking = {
          player: {
            name: this.getPlayerName(playerId),
            playerId: playerId,
          },
          points: isWinner ? 1 : 0,
          rank: 0, // Will be calculated below
          isRoundWinner: isWinner,
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

    this.updateState({ playerRankings: updatedRankings, globalRankings: globalRank });
    console.log('Updated Magic Number Rankings:', updatedRankings);
  }

  private getPlayerName(playerId: string): string {
    const player = this.gameStateSubject.value.playerRankings.find((p) => p.player.playerId === playerId)?.player.name || '';
    return player;
  }

  // update the game state
  private updateState(patch: Partial<GameState>) {
    this.gameStateSubject.next({
      ...this.gameStateSubject.value,
      ...patch,
    });
  }

  resetRoundState() {
    console.log('Resetting round state');
    const rankings = this.gameStateSubject.value.playerRankings.map((r) => {
      return {
        ...r,
        isRoundWinner: false,
        data: undefined, // Reset data for the new round
      }
    });
    this.updateState({
      playerRankings: rankings,
      data: 0,
    });
    this.gameRoundCompleteSubject.next();
  }

  resetGameState() {
    this.resetRoundState();
    const rankings = this.gameStateSubject.value.playerRankings.map((r) => {
      return {
        ...r,
        points: 0
      }
    });
    this.updateState({
      playerRankings: rankings,
      selectedGame: '',
      data: 0,
    });
    this.socket.emit('gameReset', {
      lobbyCode: this.lobbyCode,
    });
    console.log('Game state reset', this.gameStateSubject.value);
  }

  setRound(round: number, finalRound?: number) {
    console.log('Setting round:', round, 'Final round:', finalRound);
    if (finalRound)
      this.updateState({
        finalRound: finalRound,
        roundNumber: 1,
      });
    else
      this.updateState({
        roundNumber: round,
      });
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


  // Public methods for playerRankings management
  getPlayerRankings(): PlayerRanking[] {
    return this.gameStateSubject.value.playerRankings;
  }

  clearPlayerRankings() {
    this.updateState({ playerRankings: [] });
  }

  getGlobalRankings(): GlobalRanking {
    return this.gameStateSubject.value.globalRankings;
  }
}
