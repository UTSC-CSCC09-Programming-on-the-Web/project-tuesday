import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults } from './socket.service.constants';
import { PlayerRanking } from './socket.service.constants';

// unsure what to do with this yet
interface PlayerState {
  selectedGame: string;
  data: number;
  ranking: PlayerRanking;
}
@Injectable({
  providedIn: 'root',
})
export class PlayerSocketService {
  private socket: any = null;
  private lobbyCode: string = '';
  private playerName: string = '';

  private joinLobbySuccessSubject = new Subject<void>();
  joinLobbySuccess$ = this.joinLobbySuccessSubject.asObservable();

  private joinLobbyDeniedSubject = new Subject<{ reason: string }>();
  joinLobbyDenied$ = this.joinLobbyDeniedSubject.asObservable();

  private gameRoundCompleteSubject = new Subject<void>();
  gameRoundComplete$ = this.gameRoundCompleteSubject.asObservable();

  private playerStateSubject = new BehaviorSubject<PlayerState>({
    selectedGame: '',
    data: -1,
    ranking: {
      player: {
        name: "",
        playerId: "",
      },
      points: 0,
      rank: -1,
      isRoundWinner: false,
      response: "",
      data: -1, //variable field used differently by different games
    },
  });
  playerState$ = this.playerStateSubject.asObservable();

  playerEmit(event: string, data: any) {
    console.log('SocketService: playerEmit called with event:', event, 'and data:', data);
    this.socket.emit(event, {
      data,
      playerId: this.socket.id,
      lobbyCode: this.lobbyCode,
    });
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
      console.log('PlayerSocketService: Joining lobby:', this.lobbyCode);
      this.socket.emit('joinLobby', {
        lobbyCode: this.lobbyCode,
        client: this.socket.id,
        playerName: this.playerName,
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

    this.socket.on('gameReset', (data: any) => {
      this.resetState();
    })

    // Listen for game start event
    this.socket.on('startGamePlayer', (arg: any) => {
      console.log('PlayerSocketService: received ping to start ', arg.gameId);
      this.updatePlayerState({ selectedGame: arg.gameId });
    });

    this.socket.on('gameResults', (arg: PlayerRanking) => {
      console.log(
        'MobileSocketService received gameResults for gameId:',
        this.playerStateSubject.value.selectedGame,
      );
      console.log('MobileSocketService gameResults data:', arg);

      switch (this.playerStateSubject.value.selectedGame) {
        case 'Magic Number':

          const newPlayerRanking = arg;
          newPlayerRanking.player.name = this.playerName
            this.updatePlayerRankings(newPlayerRanking);
          break;
        default:
          console.log('Unknown game ID:', this.playerStateSubject.value.selectedGame);
          break;
      }

      console.log(
        'PlayerSocketService: Game round complete, all players submitted',
      );
      this.gameRoundCompleteSubject.next();
    });

    console.log('PlayerSocketService: Socket connection initiated');
  }

  updatePlayerRankings(
    arg: PlayerRanking) {



    /*name: string;
  playerId: string;
  points: number;
  rank: number;
  isRoundWinner: boolean;

  data: number; //variable field used differently by different games
    */


    this.updatePlayerState({
      ranking: arg,
      data: arg.data})
  }

  joinLobby(lobbyCode: string, playerName: string) {
    console.log('PlayerSocketService: Starting joinLobby process', {
      lobbyCode,
      playerName,
    });
    this.lobbyCode = lobbyCode;
    this.playerName = playerName;
    this.connectToSocket();
  }

  leaveLobby() {
    console.log('PlayerSocketService: Leaving lobby', this.lobbyCode);
    if (this.socket && this.lobbyCode) {
      this.socket.emit('leaveLobby', { lobbyCode: this.lobbyCode });
    }
    this.disconnect();
  }

  submitGameResponse(gameId: string, response: number) {
    if (this.socket && this.socket.connected) {
      console.log('PlayerSocketService: Submitting game response', {
        gameId,
        response,
      });
      this.socket.emit('gameResponse', {
        gameId: gameId,
        lobbyCode: this.lobbyCode,
        playerId: this.socket.id,
        response: response,
      });
    } else {
      console.error(
        'PlayerSocketService: Cannot submit game response - socket not connected',
      );
    }
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

  private resetState() {
    this.updatePlayerState({
      selectedGame: '',
      data: -1,
      ranking: {
        player: {
          name: "",
          playerId: "",
        },
        points: 0,
        rank: -1,
        isRoundWinner: false,
        response: "",
        data: -1, //variable field used differently by different games
      },
    });
  }

  // update the player state
  private updatePlayerState(patch: Partial<PlayerState>) {
    this.playerStateSubject.next({
      ...this.playerStateSubject.value,
      ...patch,
    });
  }
}
