import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults } from './socket.service.constants';

// unsure what to do with this yet
interface PlayerState {
  selectedGame: string;
  data: number;
  ranking: number;
  rankings: string[];
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
    data: 0,
    ranking: -1,
    rankings: [],
  });
  playerState$ = this.playerStateSubject.asObservable();

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

    // Listen for game start event
    this.socket.on('startGamePlayer', (arg: any) => {
      console.log('PlayerSocketService: received ping to start ', arg.gameId);
      this.updatePlayerState({ selectedGame: arg.gameId });
    });

    this.socket.on('gameResults', (arg: GameResults) => {
      console.log(
        'MobileSocketService received gameResults for gameId:',
        arg.gameId,
      );
      console.log('MobileSocketService gameResults data:', arg);

      switch (arg.gameId) {
        case 'Magic Number':
            
            this.updatePlayerRankings(arg.rankings, (arg.targetNumber ?? 50));
          break;
        default:
          console.log('Unknown game ID:', arg.gameId);
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
    rankings: string[], targetNumber: number) {
    this.updatePlayerState({rankings: rankings})
    this.updatePlayerState({data: targetNumber})
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

  // update the player state
  private updatePlayerState(patch: Partial<PlayerState>) {
    this.playerStateSubject.next({
      ...this.playerStateSubject.value,
      ...patch,
    });
  }
}
