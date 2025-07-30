import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults } from './socket.service.constants';
import { PlayerRanking } from './socket.service.constants';

// unsure what to do with this yet
// interface PlayerState {
//   selectedGame: string;
//   data: number;
//   ranking: PlayerRanking;
// }

interface PlayerState {
  lobbyCode: string;
  playerName: string;
  selectedGame: string;
  roundNumber: number;
  finalRound: number;
  ranking: PlayerRanking;
  data: number;
}
@Injectable({
  providedIn: 'root',
})
export class PlayerSocketService {
  private socket: any = null;
  private playerName: string = '';

  private joinLobbySuccessSubject = new Subject<void>();
  joinLobbySuccess$ = this.joinLobbySuccessSubject.asObservable();

  private joinLobbyDeniedSubject = new Subject<{ reason: string }>();
  joinLobbyDenied$ = this.joinLobbyDeniedSubject.asObservable();

  private gameRoundCompleteSubject = new Subject<void>();
  gameRoundComplete$ = this.gameRoundCompleteSubject.asObservable();

  private playerStateSubject = new BehaviorSubject<PlayerState>({
    lobbyCode: '',
    playerName: '',
    selectedGame: '',
    roundNumber: -1,
    finalRound: -1,
    data: -1,
    ranking: {
      player: {
        name: '',
        playerId: '',
      },
      points: 0,
      rank: -1,
      isRoundWinner: false,
      data: undefined, //variable field used differently by different games
    },
  });
  playerState$ = this.playerStateSubject.asObservable();

  checkConnection(): boolean {
    return this.socket && this.socket.connected;
  }

  playerEmit(event: string, data: any) {

    this.socket.emit(event, {
      data,
      playerId: this.socket.id,
      lobbyCode: this.playerStateSubject.value.lobbyCode,
    });
  }

  useEffect(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, (arg: any) => {
        callback(arg);
      });
    } else {
      console.error('Socket not initialized. Call connectToSocket() first.');
    }
  }

  removeEffect(event: string) {
    if (this.socket) {
      this.socket.off(event);
    } else {
      console.error('Socket not initialized. Call connectToSocket() first.');
    }
  }

  connectToSocket(lobbyCode: string, playerName: string) {
    // Disconnect any existing socket first to avoid conflicts
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Create a fresh socket for phone client
    this.socket = io(SERVER_ADDRESS, {
      forceNew: true, // Force a new connection
      reconnection: true,
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });


    this.socket.on('connect', () => {
      this.socket.emit('joinLobby', {
        lobbyCode: lobbyCode,
        client: this.socket.id,
        playerName: playerName,
      }, (response: { status: number }) => {
        if (response.status === 200) {
          this.joinLobbySuccessSubject.next();
          this.updatePlayerState({
            lobbyCode: lobbyCode,
            playerName: playerName,
          });
        }
      });
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('PlayerSocketService: Socket connection error:', error);
    });

    this.socket.on('joinLobbyDenied', (data: any) => {
      this.joinLobbyDeniedSubject.next(data);
    });

    this.socket.on('lobbyClosed', (data: any) => {
      this.joinLobbyDeniedSubject.next({ reason: 'Lobby closed by admin' });
      this.updatePlayerState({
        lobbyCode: '',
        playerName: ''
      });
      this.resetGameState();
    });

    this.socket.on('gameReset', (data: any) => {
      this.resetGameState();
    });

    // Listen for game start event
    this.socket.on('startGamePlayer', (arg: any) => {
      if (arg.gameId === 'Magic Number') {
        this.updatePlayerState({
          selectedGame: arg.gameId,
          roundNumber: 1,
          finalRound: 3,
        });
      } else {
        this.updatePlayerState({
          roundNumber: 1,
          finalRound: 1,
          selectedGame: arg.gameId
        });
      }
    });

    this.socket.on(
      'gameResults',
      (arg: { ranking: PlayerRanking; data: number | undefined }) => {

        const newPlayerRanking = arg.ranking;
          newPlayerRanking.player.name = this.playerName;
          this.updatePlayerRankings({
            ranking: newPlayerRanking,
            data: arg.data,
          });
        this.gameRoundCompleteSubject.next();
      },
    );

  }

  updatePlayerRankings(arg: {
    ranking: PlayerRanking;
    data: number | undefined;
  }) {

    this.updatePlayerState({
      ranking: arg.ranking,
      data: arg.data,
    });
  }

  joinLobby(lobbyCode: string, playerName: string) {
    this.connectToSocket(lobbyCode, playerName);
  }

  leaveLobby() {
    if (this.socket && this.playerStateSubject.value.lobbyCode) {
      this.socket.emit('leaveLobby', { lobbyCode: this.playerStateSubject.value.lobbyCode });
    }
    this.disconnect();
  }

  // Method to get current socket ID
  getSocketId(): string | null {
    return this.socket && this.socket.id ? this.socket.id : null;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  resetRoundState() {
    const ranking = this.playerStateSubject.value.ranking;
    ranking.points = 0;
    ranking.isRoundWinner = false;
    ranking.data = undefined;
    this.updatePlayerState({
      data: -1,
      ranking: ranking,
    });
  }

  resetGameState() {
    this.resetRoundState();
    this.updatePlayerState({
      selectedGame: '',
    });
  }

  // update the player state
  updatePlayerState(patch: Partial<PlayerState>) {
    this.playerStateSubject.next({
      ...this.playerStateSubject.value,
      ...patch,
    });
  }
}
