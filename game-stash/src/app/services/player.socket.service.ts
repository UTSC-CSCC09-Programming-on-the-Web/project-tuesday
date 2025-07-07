import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { SERVER_ADDRESS, GameResults } from './socket.service.constants';

interface PlayerState {
  // unsure what to do with this yet
  selectedGame: string;
  data: number;
  ranking: number;
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
  });
  playerState$ = this.playerStateSubject.asObservable();

  connectToSocket() {
    console.log('PlayerSocketService: connectToSocketPhone called');

    // Disconnect any existing socket first to avoid conflicts
    if (this.socket) {
      console.log('PlayerSocketService: Disconnecting existing socket');
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
          // REACT TO THE GAME RESULTS AS THE PLAYER HERE----------

          //shouldnt have to recalculate, broadcast the result from admin instead
          /*
          const answerNumber = arg.targetNumber || 50; // Use server-provided target number, fallback to 50
          this.updatePlayerState({ data: answerNumber });

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
          for (const [player, difference] of Object.entries(
            playerDifferences,
          )) {
            if (difference === lowestDifference) {
              winners.push(player);
            }
          }

          console.log('Answer number:', answerNumber);
          console.log('Winners:', winners);

          this.updateplayerRankings(responses, winners);
            */
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
