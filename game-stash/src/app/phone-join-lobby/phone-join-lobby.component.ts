import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QrScannerComponent } from '../components/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-phone-join-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScannerComponent],
  templateUrl: './phone-join-lobby.component.html',
  styleUrls: ['./phone-join-lobby.component.css']
})
export class PhoneJoinLobbyComponent {
  playerName = signal('');
  lobbyCode = signal('');
  isJoining = signal(false);
  errorMessage = signal('');
  showQrScanner = signal(false);
  // Computed properties for validation
  playerNameLength = computed(() => this.playerName().length);
  isPlayerNameValid = computed(() => this.playerName().trim().length >= 1);
  isLobbyCodeValid = computed(() => /^[A-Z0-9]{6}$/.test(this.lobbyCode()));
  isFormValid = computed(() => this.isPlayerNameValid() && this.isLobbyCodeValid() && !this.isJoining());

  constructor(private router: Router) {}

  onJoinLobby(): void {
    if (!this.isFormValid()) return;

    this.isJoining.set(true);
    this.errorMessage.set('');

    // Simulate API call to join lobby
    setTimeout(() => {
      try {
        // Navigate to waiting room with lobby details
        this.router.navigate(['/phone-lobby'], {
          queryParams: {
            lobbyCode: this.lobbyCode(),
            playerName: this.playerName().trim()
          }
        });
      } catch (error) {
        this.isJoining.set(false);
        this.errorMessage.set('Failed to join lobby. Please try again.');
      }
    }, 1500);
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
}
