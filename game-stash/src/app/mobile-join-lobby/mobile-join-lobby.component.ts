import { Component, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminSocketService } from '../services/admin.socket.service';
import { PlayerSocketService } from '../services/player.socket.service';
import { Subscription, map } from 'rxjs';

@Component({
  selector: 'app-mobile-join-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-join-lobby.component.html',
  styleUrls: ['./mobile-join-lobby.component.css'],
})
export class MobileJoinLobbyComponent implements OnDestroy {
  playerName = signal('');
  lobbyCode = signal('');
  isJoining = signal(false);
  errorMessage = signal('');

  players = signal<string[]>([]);

  private subscriptions: Subscription[] = [];

  // Computed properties for validation
  playerNameLength = computed(() => this.playerName().length);
  isPlayerNameValid = computed(() => this.playerName().trim().length >= 1);
  isLobbyCodeValid = computed(() => /^[A-Z0-9]{6}$/.test(this.lobbyCode()));
  isFormValid = computed(
    () =>
      this.isPlayerNameValid() && this.isLobbyCodeValid() && !this.isJoining(),
  );

  constructor(
    private router: Router,
    private adminSocketService: AdminSocketService,
    private playerSocketService: PlayerSocketService,
  ) {
    // Subscribe to join lobby events
    this.subscriptions.push(
      this.playerSocketService.joinLobbySuccess$.subscribe(() => {
        this.isJoining.set(false); // Reset joining state
        this.router.navigate(['/mobile-lobby'], {
          queryParams: {
            lobbyCode: this.lobbyCode(),
            playerName: this.playerName().trim(),
          },
        });
      }),
    );

    this.subscriptions.push(
      this.playerSocketService.joinLobbyDenied$.subscribe((data) => {
        console.log('Join lobby denied:', data);
        this.isJoining.set(false);
        this.errorMessage.set(data.reason || 'Unable to join lobby.');
      }),
    );

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.players))
      .subscribe((players) => this.players.set(players));
  }

  onJoinLobby(): void {
    if (!this.isFormValid()) return;

    this.isJoining.set(true);
    this.errorMessage.set('');

    // Use PlayerSocketService to join lobby
    this.playerSocketService.joinLobby(
      this.lobbyCode(),
      this.playerName().trim(),
    );

    setTimeout(() => {
      if (this.isJoining()) {
        this.isJoining.set(false);
        this.errorMessage.set('Connection timeout. Please try again.');
      }
    }, 5000);
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
    // Unsubscribe from all observables
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
