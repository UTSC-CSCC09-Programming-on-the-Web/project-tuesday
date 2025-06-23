import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-phone-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone-lobby.component.html',
  styleUrls: ['./phone-lobby.component.css']
})
export class PhoneLobbyComponent implements OnInit, OnDestroy {
  lobbyCode = signal('');
  playerName = signal('');
  isWaitingForGame = signal(true);
  connectionStatus = signal('Connecting...');
  
  private socket: Socket;  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Initialize socket with autoConnect false initially  
    this.socket = io("http://localhost:3000/", { autoConnect: false });
  }

  ngOnInit(): void {
    // Get lobby details from query parameters
    this.route.queryParams.subscribe(params => {
      const lobbyCode = params['lobbyCode'];
      const playerName = params['playerName'];
      
      if (!lobbyCode || !playerName) {
        // Redirect to join lobby if missing required parameters
        this.router.navigate(['/phone-join-lobby']);
        return;
      }
      
      this.lobbyCode.set(lobbyCode);
      this.playerName.set(playerName);
      
      // Connect to socket and join lobby
      this.connectToSocket();
    });
  }
  private connectToSocket(): void {
    // Connect to socket if not already connected
    if (!this.socket.connected) {
      this.socket.connect();
    }    this.socket.on("connect", () => {
      this.connectionStatus.set('Connected to lobby');
      
      // Join the lobby - might already be joined from previous component
      this.socket.emit("joinLobby", {
        lobbyCode: this.lobbyCode(),
        client: this.socket.id
      });
    });

    // Listen for game start event
    this.socket.on("startGamePlayer", (arg) => {
      console.log("Received game start event:", arg.gameId);
      this.isWaitingForGame.set(false);
      
      // Navigate to the appropriate game screen based on gameId
      this.startGame(arg.gameId);
    });

    // Handle connection errors
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.connectionStatus.set('Connection failed');
    });

    // Handle user joined lobby events
    this.socket.on("userJoinedLobby", (arg) => {
      console.log("User joined lobby:", arg.user);
      // Could update UI to show other players if needed
    });

    // Handle user left lobby events
    this.socket.on("userLeftLobby", (message) => {
      console.log("User left lobby:", message);
      // Could update UI to show player left if needed
    });  }

  private startGame(gameId: string): void {
    // Navigate to the appropriate game screen based on game type
    switch (gameId) {
      case 'Magic Number':
        // For Magic Number, navigate to mobile component with lobbyCode as route parameter
        this.router.navigate(['/player', this.lobbyCode()]);
        break;
      default:
        // Fallback to guessing game for unknown game types
        this.router.navigate(['/phone-guessing-game'], {
          queryParams: {
            lobbyCode: this.lobbyCode(),
            playerName: this.playerName(),
            round: 1
          }
        });
        break;
    }  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  onLeaveLobby(): void {
    // Disconnect from socket and navigate back to join lobby
    if (this.socket) {
      this.socket.disconnect();
    }
    this.router.navigate(['/phone-join-lobby']);
  }
}
