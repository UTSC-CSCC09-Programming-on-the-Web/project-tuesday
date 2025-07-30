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
    console.log(
      'SocketService: playerEmit called with event:',
      event,
      'and data:',
      data,
    );
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
    console.log(
      'PlayerSocketService: Creating new socket connection for phone',
    );
    this.socket = io(SERVER_ADDRESS, {
      forceNew: true, // Force a new connection
      reconnection: true,
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('welcome', (res: any) => {
      console.log('PlayerSocketService: Received welcome:', res.message);
    });

    this.socket.on('connect', () => {
      console.log(
        'PlayerSocketService: Phone connected, socket ID:',
        this.socket.id,
      );
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

    this.socket.on('joinLobbySuccess', () => {
      console.log('PlayerSocketService: Join lobby successful');
      this.joinLobbySuccessSubject.next();
    });

    this.socket.on('joinLobbyDenied', (data: any) => {
      console.log('PlayerSocketService: Join lobby denied:', data);
      this.joinLobbyDeniedSubject.next(data);
    });

    this.socket.on('lobbyClosed', (data: any) => {
      console.log('PlayerSocketService: Lobby closed:', data);
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
      console.log('PlayerSocketService: received ping to start ', arg.gameId);
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
        console.log(
          'MobileSocketService received gameResults for gameId:',
          this.playerStateSubject.value.selectedGame,
        );
        console.log('MobileSocketService gameResults data:', arg);

        switch (this.playerStateSubject.value.selectedGame) {
          // case 'Magic Number':

          //   const newPlayerRanking = arg;
          //   newPlayerRanking.player.name = this.playerName
          //     this.updatePlayerRankings(newPlayerRanking);
          //   break;
          default:
            const newPlayerRanking = arg.ranking;
            newPlayerRanking.player.name = this.playerName;
            this.updatePlayerRankings({
              ranking: newPlayerRanking,
              data: arg.data,
            });
            // console.log('Unknown game ID:', this.playerStateSubject.value.selectedGame);
            break;
        }

        console.log(
          'PlayerSocketService: Game round complete, all players submitted',
        );
        this.gameRoundCompleteSubject.next();
      },
    );

    console.log('PlayerSocketService: Socket connection initiated');
  }

  updatePlayerRankings(arg: {
    ranking: PlayerRanking;
    data: number | undefined;
  }) {
    /*name: string;
  playerId: string;
  points: number;
  rank: number;
  isRoundWinner: boolean;

  data: number; //variable field used differently by different games
    */

    this.updatePlayerState({
      ranking: arg.ranking,
      data: arg.data,
    });
  }

  joinLobby(lobbyCode: string, playerName: string) {
    console.log('PlayerSocketService: Starting joinLobby process', {
      lobbyCode,
      playerName,
    });
    this.connectToSocket(lobbyCode, playerName);
  }

  leaveLobby() {
    console.log('PlayerSocketService: Leaving lobby', this.playerStateSubject.value.lobbyCode);
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
      console.log('PlayerSocketService: Disconnecting socket');
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
