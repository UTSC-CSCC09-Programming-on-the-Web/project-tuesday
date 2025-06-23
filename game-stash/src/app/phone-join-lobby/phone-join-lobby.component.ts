import { Component, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QrScannerComponent } from '../components/qr-scanner/qr-scanner.component';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-phone-join-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScannerComponent],
  templateUrl: './phone-join-lobby.component.html',
  styleUrls: ['./phone-join-lobby.component.css']
})
export class PhoneJoinLobbyComponent implements OnDestroy {
  playerName = signal('');
  lobbyCode = signal('');
  isJoining = signal(false);
  errorMessage = signal('');
  showQrScanner = signal(false);
  
  private socket: Socket;

  // Computed properties for validation
  playerNameLength = computed(() => this.playerName().length);
  isPlayerNameValid = computed(() => this.playerName().trim().length >= 1);
  isLobbyCodeValid = computed(() => /^[A-Z0-9]{6}$/.test(this.lobbyCode()));
  isFormValid = computed(() => this.isPlayerNameValid() && this.isLobbyCodeValid() && !this.isJoining());  constructor(private router: Router) {
    // Initialize socket but don't connect yet
    this.socket = io("http://localhost:3000/", { autoConnect: false });
  }

  onJoinLobby(): void {
    if (!this.isFormValid()) return;

    this.isJoining.set(true);
    this.errorMessage.set('');

    // Connect to socket and join lobby
    this.socket.connect();
    
    this.socket.on("connect", () => {
      this.socket.emit("joinLobby", {
        lobbyCode: this.lobbyCode(),
        client: this.socket.id
      });

      // Navigate to waiting room with lobby details
      this.router.navigate(['/phone-lobby'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName().trim()
        }
      });
    });

    // Handle connection errors
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.isJoining.set(false);
      this.errorMessage.set('Failed to connect to game server. Please try again.');
    });

    // Set a timeout in case connection takes too long
    setTimeout(() => {
      if (this.isJoining()) {
        this.isJoining.set(false);
        this.errorMessage.set('Connection timeout. Please try again.');
        this.socket.disconnect();
      }
    }, 5000);
  }

  onShowQrScanner(): void {
    this.showQrScanner.set(true);
  }

  onQrCodeScanned(code: string): void {
    this.lobbyCode.set(code.toUpperCase());
    this.showQrScanner.set(false);
    
    // Auto-join if player name is valid
    if (this.isPlayerNameValid()) {
      this.onJoinLobby();
    }
  }

  onQrScannerClosed(): void {
    this.showQrScanner.set(false);
  }

  formatLobbyCode(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    this.lobbyCode.set(value);
  }
  formatPlayerName(event: any): void {
    let value = event.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
    if (value.length > 20) {
      value = value.substring(0, 20);
    }
    this.playerName.set(value);
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
